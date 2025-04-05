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

pulumi state delete "urn:pulumi:dev-prequel::prequel::github:index/organizationWebhook:OrganizationWebhook::webhook-Shetchuko"

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


Key improvements:

Added logging to a file for better debugging
Improved environment variable handling and detection
Added verification steps (like listing the directory contents)
Better error handling with status logging
Cleaned up temporary directories after use
Added timestamps to see how long installation takes
Used symbolic links (ln -sf) to avoid errors if the link already exists
Added more detailed output for troubleshooting

Diagnostics:
  pulumi:pulumi:Stack (prequel-dev-prequel):
    Creating resource group: prequel-rg-dev-prequel
    Setting up organization webhook for Shetchuko

    error: an unhandled error occurred: Program exited with non-zero exit code: -1


    local host 5000 will not work so we need to replace it with 5001



    after the deployment it will takes some time with actual hosting cause we have some initla setup

MkTqpCxX1QTK+kZTmpjVKw==

npm install @pulumi/azure-native