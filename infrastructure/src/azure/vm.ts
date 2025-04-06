import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as compute from "@pulumi/azure-native/compute";
import * as fs from "fs";
import * as path from "path";
import { NetworkInfrastructureResult } from "./network";

const config = new pulumi.Config();

export interface VMResult {
  vm: compute.VirtualMachine;
  webhookUrl: pulumi.Output<string>;
  fqdn: pulumi.Output<string>;
}

/**
 * Creates a Virtual Machine using pre-created network components
 */
export function createVirtualMachine(
  resourceGroup: azure.resources.ResourceGroup,
  networkInfrastructure: NetworkInfrastructureResult,
  options: {
    location?: string;
    vmSize?: string;
    vmUsername?: string;
    vmPassword?: string;
    githubWebhookSecret?: pulumi.Input<string>;
    slackWebhookUrl?: pulumi.Input<string>;
    sqlConnectionString?: pulumi.Input<string>;
  } = {}
): VMResult {
  // Set defaults
  const location = options.location || resourceGroup.location;
  const vmSize = options.vmSize || "Standard_B1s";
  const vmUsername = options.vmUsername || config.require("vmAdminUsername");
  const vmPassword = options.vmPassword || config.requireSecret("vmAdminPassword");
  const githubWebhookSecret = options.githubWebhookSecret || config.requireSecret("githubWebhookSecret");
  const slackWebhookUrl = options.slackWebhookUrl || config.requireSecret("slackWebhookUrl");
  
  // Read the setup script
  const setupScriptPath = path.join(__dirname, "../../scripts/setup-vm.sh");
  const setupScript = fs.readFileSync(setupScriptPath, "utf8");


  const customData = pulumi.interpolate`#!/bin/bash
  export GITHUB_WEBHOOK_SECRET="${githubWebhookSecret}"
  export SLACK_WEBHOOK_URL="${slackWebhookUrl}"
  export SQL_CONNECTION_STRING="${options.sqlConnectionString || ""}"
  ${setupScript}`;

  // Create a Virtual Machine
  const vm = new compute.VirtualMachine("prequel-vm", {
    resourceGroupName: resourceGroup.name,
    location: location,
    networkProfile: {
      networkInterfaces: [{
        id: networkInfrastructure.networkInterface.id,
        primary: true,
      }],
    },
    hardwareProfile: {
      vmSize: vmSize,
    },
    osProfile: {
      computerName: "prequelvm",
      adminUsername: vmUsername,
      adminPassword: vmPassword,
      customData: customData.apply(data => Buffer.from(data).toString("base64")),
      linuxConfiguration: {
        disablePasswordAuthentication: false,
      },
    },
    storageProfile: {
      imageReference: {
        publisher: "Canonical",
        offer: "0001-com-ubuntu-server-focal",
        sku: "20_04-lts",
        version: "latest",
      },
      osDisk: {
        name: "prequel-os-disk",
        caching: "ReadWrite",
        createOption: "FromImage",
        managedDisk: {
          storageAccountType: "Standard_LRS",
        },
      },
    },
  });

  // Return the VM and use the network infrastructure for webhook URL and FQDN
  return {
    vm,
    webhookUrl: networkInfrastructure.publicIp.ipAddress.apply(ip => 
      ip ? `http://${ip}` : ""),
    fqdn: networkInfrastructure.publicIp.dnsSettings.apply(settings => 
      settings?.fqdn || ""),
  };
}