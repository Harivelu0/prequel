import * as pulumi from '@pulumi/pulumi';
import * as github from '@pulumi/github';
import { RepositoryConfig } from '../config/templates/standard';

export function createBranchProtection(
  config: RepositoryConfig,
  repository: github.Repository
): github.BranchProtection {
  // Log detailed information about the branch protection setup
  console.log(`Setting up branch protection for ${config.name}...`);
  console.log(`Repository ID: ${repository.name}`);
  console.log(`Branch pattern: ${config.defaultBranch}`);
  console.log(`Required approvals: ${config.requiredApprovals}`);
  console.log(`Organization: ${config.organization || 'none (personal repo)'}`);

  // Configure GitHub provider with the organization as owner
  const provider = config.organization 
    ? new github.Provider(`${config.name}-bp-provider`, {
        owner: config.organization,
        // Add token debugging (redacted for security)
    })
    : undefined;

  // Get the repository node ID
  // The full repository name is needed for branch protection (org/repo format)
  const repoFullName = config.organization 
    ? `${config.organization}/${config.name}`
    : config.name;
    
  console.log(`Using full repository name: ${repoFullName}`);

  // Create the branch protection with detailed logging
  try {
    const branchProtection = new github.BranchProtection(
      `${config.name}-branch-protection`,
      {
        // Repository ID should be the full repository name (org/repo)
        repositoryId: config.organization ? config.name : repoFullName,
        pattern: config.defaultBranch,
        
        // Enforce approvals
        requiredPullRequestReviews: [{
          dismissStaleReviews: true,
          requireCodeOwnerReviews: true,
          requiredApprovingReviewCount: config.requiredApprovals,
          // Restrict dismissals (prevents bypassing reviews)
          restrictDismissals: true,
        }],
        
        // Require status checks if any are configured
        requiredStatusChecks: [{
          strict: true,
          contexts: [],
        }],
        
        // Prevent force pushing to the branch
        enforceAdmins: true,
        
        // Additional protections
        allowsDeletions: false,
        allowsForcePushes: false,
        requireConversationResolution: true,
        requiredLinearHistory: true,
        
      },
      provider ? { provider } : undefined
    );

    console.log(`Branch protection created successfully for ${config.name}`);
    return branchProtection;
  } catch (error) {
    console.error(`Error creating branch protection for ${config.name}:`, error);
    throw error;
  }
}