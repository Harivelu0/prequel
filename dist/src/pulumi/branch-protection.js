"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBranchProtection = createBranchProtection;
const github = __importStar(require("@pulumi/github"));
function createBranchProtection(config, repository) {
    const repoFullName = config.organization
        ? `${config.organization}/${config.name}`
        : config.name;
    // For GitHub provider v5.26.0, the structure is different
    return new github.BranchProtection(`${repoFullName}-branch-protection`, {
        repositoryId: repository.name,
        pattern: config.defaultBranch,
        // Enforce approvals - updated structure for v5.26.0
        requiredPullRequestReviews: [{
                dismissStaleReviews: true,
                requireCodeOwnerReviews: true,
                requiredApprovingReviewCount: config.requiredApprovals,
                // Removed dismissalUsers as it's not available in this version
            }],
        // Status checks structure in v5.x
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
        // Restrict who can push directly to this branch
        pushRestrictions: ["*"],
    });
}
//# sourceMappingURL=branch-protection.js.map