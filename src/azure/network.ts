import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as network from "@pulumi/azure-native/network";

export interface NetworkInfrastructureResult {
  vnet: network.VirtualNetwork;
  publicIp: network.PublicIPAddress;
  networkInterface: network.NetworkInterface;
  networkSecurityGroup: network.NetworkSecurityGroup;
  webhookUrl: pulumi.Output<string>;
  fqdn: pulumi.Output<string>;
}

/**
 * Creates the complete network infrastructure for the PR Management System
 */
export function createNetworkInfrastructure(
  resourceGroup: azure.resources.ResourceGroup,
  options: {
    location?: string;
    vnetAddressSpace?: string;
    subnetAddressSpace?: string;
  } = {}
): NetworkInfrastructureResult {
  // Set defaults
  const location = options.location || resourceGroup.location;
  const vnetAddressSpace = options.vnetAddressSpace || "10.0.0.0/16";
  const subnetAddressSpace = options.subnetAddressSpace || "10.0.1.0/24";
  const stack = pulumi.getStack();
  
  // Create a Virtual Network
  const vnet = new network.VirtualNetwork("prequel-vnet", {
    resourceGroupName: resourceGroup.name,
    location: location,
    addressSpace: {
      addressPrefixes: [vnetAddressSpace],
    },
    subnets: [
      {
        name: "default",
        addressPrefix: subnetAddressSpace,
      },
    ],
  });

  // Create a Public IP Address with DNS label
  const publicIp = new network.PublicIPAddress("prequel-ip", {
    resourceGroupName: resourceGroup.name,
    location: location,
    publicIPAllocationMethod: network.IPAllocationMethod.Static,
    dnsSettings: {
      domainNameLabel: `prequel-webhook-${stack}`,
    },
  });

  // Create a Network Security Group with rules for web and SSH access
  const networkSecurityGroup = new network.NetworkSecurityGroup("prequel-nsg", {
    resourceGroupName: resourceGroup.name,
    location: location,
    securityRules: [
      {
        name: "SSH",
        priority: 1000,
        direction: "Inbound",
        access: "Allow",
        protocol: "Tcp",
        sourcePortRange: "*",
        destinationPortRange: "22",
        sourceAddressPrefix: "*",
        destinationAddressPrefix: "*",
      },
      {
        name: "HTTP",
        priority: 1001,
        direction: "Inbound",
        access: "Allow",
        protocol: "Tcp",
        sourcePortRange: "*",
        destinationPortRange: "80",
        sourceAddressPrefix: "*",
        destinationAddressPrefix: "*",
      },
      {
        name: "HTTPS",
        priority: 1002,
        direction: "Inbound",
        access: "Allow",
        protocol: "Tcp",
        sourcePortRange: "*",
        destinationPortRange: "443",
        sourceAddressPrefix: "*",
        destinationAddressPrefix: "*",
      },
    ],
  });

  // Create a Network Interface
  const networkInterface = new network.NetworkInterface("prequel-nic", {
    resourceGroupName: resourceGroup.name,
    location: location,
    ipConfigurations: [{
      name: "ipconfig",
      subnet: vnet.subnets.apply(subnets => {
        if (subnets && subnets.length > 0) {
          return { id: subnets[0].id };
        }
        throw new Error("No subnet found in the virtual network");
      }),
      publicIPAddress: {
        id: publicIp.id,
      },
    }],
    networkSecurityGroup: {
      id: networkSecurityGroup.id,
    },
  });

  return {
    vnet,
    publicIp,
    networkInterface,
    networkSecurityGroup,
    // Generate webhook URL from the public IP
    webhookUrl: publicIp.ipAddress.apply(ip => `http://${ip}`),
    // Generate FQDN from DNS settings
    fqdn: publicIp.dnsSettings.apply(settings => settings?.fqdn || ""),
  };
}