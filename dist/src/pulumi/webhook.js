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
exports.createWebhook = createWebhook;
const github = __importStar(require("@pulumi/github"));
function createWebhook(config, repository) {
    // For v5.26.0, we need to handle the repository name correctly
    // The organization is handled implicitly through the repository name
    // Determine the correct repository reference
    const repoName = repository.name;
    return new github.RepositoryWebhook(`${config.name}-webhook`, {
        repository: repoName,
        // Configuration for the webhook
        configuration: {
            url: config.webhookUrl,
            contentType: 'json',
            insecureSsl: false,
            secret: config.webhookSecret,
        },
        // Events to trigger the webhook
        events: [
            'pull_request', // When PRs are opened, closed, etc.
            'pull_request_review', // When reviews are submitted
            'pull_request_review_comment' // When comments are made on reviews
        ],
        // Enable the webhook
        active: true,
    });
}
//# sourceMappingURL=webhook.js.map