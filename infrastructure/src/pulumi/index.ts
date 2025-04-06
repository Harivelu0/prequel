// Export GitHub Provider
export { GitHubProvider } from './github-provider';

// Export repository functions
export { createRepository } from './repostory';
export { createBranchProtection } from './branch-protection';
export { createWebhook } from './webhook';

// Export deployment functions from automation
import { deployRepositoryConfig, deployMultipleRepositories } from '../automation/deployer';

// Export as a single deployer object
export const deployer = {

  deployRepositoryConfig,
  deployMultipleRepositories,
  
};