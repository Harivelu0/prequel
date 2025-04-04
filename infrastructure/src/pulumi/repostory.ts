import * as pulumi from '@pulumi/pulumi';
import * as github from '@pulumi/github';
import { RepositoryConfig } from '../config/templates/standard';

export function createRepository(config: RepositoryConfig): github.Repository {
  // Log organization info
  if (config.organization) {
    console.log(
      `Creating repository in organization '${config.organization}'. Ensure the GitHub token has admin access to this organization.`
    );
  }

  // Configure GitHub provider with the organization as owner
  const provider = config.organization 
    ? new github.Provider(`${config.name}-provider`, {
        owner: config.organization,
      })
    : undefined;

  const repoArgs: github.RepositoryArgs = {
    name: config.name,
    description: config.description,
    visibility: config.visibility,
    hasIssues: true,
    hasProjects: true,
    hasWiki: true,
    autoInit: true,
    allowMergeCommit: false,
    allowSquashMerge: true,
    allowRebaseMerge: false,
    deleteBranchOnMerge: true,
    defaultBranch: config.defaultBranch,
  };

  // Create the repository with the provider if organization is specified
  return new github.Repository(
    config.name, 
    repoArgs, 
    provider ? { provider } : undefined
  );
}