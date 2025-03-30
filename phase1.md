# Update package index
sudo apt update

# Install required packages
sudo apt install -y curl dirmngr apt-transport-https lsb-release ca-certificates

# Add NodeSource repository for Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js 18
sudo apt install -y nodejs

# Verify installation
node --version
npm --version


# Download and install Pulumi
curl -fsSL https://get.pulumi.com | sh

# Add Pulumi to your PATH (or restart your terminal)
export PATH=$PATH:$HOME/.pulumi/bin

# Verify installation
pulumi version

# pulumi initialization
pulumi login

pulumi whoami 

# check if my token have permission with organization
curl -H "Authorization: token <GITHUB_TOKEN>" https://api.github.com/user

# register your secret in pulumi
pulumi config set github:token your_token_here --secret

pulumi stack init dev

pulumi up

ts-node src/index.ts setup-repo --name pulumi-repo --org Shetchuko --description "Repository description" --visibility public --branch main



PRs must be reviewed before merging
Fresh approvals are needed after changes
No one can bypass the protection rules (even admins)
Code quality standards are maintained through required reviews