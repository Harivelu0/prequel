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


NODE_OPTIONS=--max-old-space-size=4096 npx tsc