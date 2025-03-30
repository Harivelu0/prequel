import * as github from '@pulumi/github';

export interface RepositoryConfig {
  name: string;
  description: string;
  organization?: string;
  visibility: 'public' | 'private' | 'internal';
  defaultBranch: string;
  webhookUrl: string;
  webhookSecret: string;
  requiredApprovals: number;
  allowSelfApprovals: boolean;
}

export function createStandardConfig(config: RepositoryConfig): any {
  return {
    repository: {
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
      // If organization is provided, use organization-based repository
      ...(config.organization ? { organization: config.organization } : {})
    },
    branchProtection: {
      pattern: config.defaultBranch,
      requiresApprovingReviews: true,
      requiredApprovingReviewCount: config.requiredApprovals,
      requiresConversationResolution: true,
      requiresStatusChecks: true,
      requiresStrictStatusChecks: true,
      restrictsPushes: true,
      pushRestrictions: config.allowSelfApprovals ? [] : ['*'],
      dismissesStaleReviews: true,
      requiresCodeOwnerReviews: true
    },
    webhook: {
      events: ['pull_request', 'pull_request_review', 'pull_request_review_comment'],
      url: config.webhookUrl,
      contentType: 'json',
      secret: config.webhookSecret,
      insecureSsl: false,
      active: true
    }
  };
}

// Default template settings that can be overridden
export const standardDefaults: Partial<RepositoryConfig> = {
  visibility: 'private',
  defaultBranch: 'main',
  requiredApprovals: 1,
  allowSelfApprovals: false
};