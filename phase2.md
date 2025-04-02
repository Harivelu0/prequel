Install Azure CLI (if you haven't already):
bashCopy# For Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash


az login


Create Service Principal (recommended for automation):
bashCopy
az ad sp create-for-rbac --name "prequel-pulumi" --role Contributor --scopes /subscriptions/YOUR_SUBSCRIPTION_ID

# Configure Pulumi to use Azure Service Principal:
pulumi config set azure-native:clientId <appId>
pulumi config set azure-native:clientSecret <password> --secret
pulumi config set azure-native:tenantId <tenant>
pulumi config set azure-native:subscriptionId <subscriptionId>

# After deploying, add the SQL connection string to your Function App
export RG_NAME=$(pulumi stack output resourceGroupName)
export FUNCTION_APP_NAME=$(pulumi stack output functionAppName)
export SQL_CONN_STRING=$(pulumi stack output sqlConnectionString --show-secrets)

pulumi destroy --target "urn:pulumi:dev-prequel::prequel::azure-native:compute:VirtualMachine::prequel-vm"

pulumi stack --show-urns

pulumi state delete "urn:pulumi:dev-prequel::prequel::github:index/organizationWebhook:OrganizationWebhook::webhook-Shetchuko-1743589554265"

az disk delete --resource-group PREQUEL-RG-DEV-PREQUEL6770CB6E --name prequel-os-disk --yes


The GitHub webhook issue is happening because:

GitHub doesn't allow multiple webhooks with the same destination URL in an organization
Your Pulumi code is creating a new webhook resource with a timestamp in the name (webhook-Shetchuko-${Date.now()}) on each deployment
While the Pulumi resource name changes each time, it's still trying to create a webhook pointing to the same URL at GitHub
GitHub rejects this as a duplicate, causing the error "Hook already exists on this organization"


The VM disk issue happened because:

Azure doesn't allow modifying certain properties of a VM after creation (particularly osProfile.customData)
When Pulumi tries to update these immutable properties, Azure returns the error
Then when you tried to recreate the VM, the disk was still attached to the old VM in Azure, causing the "Disk already exists" error


env for app is not exported previoulsy so need to manually add that after i updated the script 