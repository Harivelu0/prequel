"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardDefaults = void 0;
exports.createStandardConfig = createStandardConfig;
function createStandardConfig(config) {
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
exports.standardDefaults = {
    visibility: 'private',
    defaultBranch: 'main',
    requiredApprovals: 1,
    allowSelfApprovals: false
};
//# sourceMappingURL=standard.js.map