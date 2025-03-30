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
exports.createRepository = createRepository;
const github = __importStar(require("@pulumi/github"));
function createRepository(config) {
    // For organization repositories
    if (config.organization) {
        // For GitHub provider v5.x, we need to handle organization repositories differently
        // We'll use the special GitHub identifier for the stack name, but not set organization directly
        const stackIdentifier = `${config.organization}-${config.name}`;
        // The name property must include the organization for org repositories
        const repoName = config.name;
        return new github.Repository(stackIdentifier, {
            name: repoName, // Just use the repo name - organization is handled differently
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
        });
    }
    // For personal repositories
    return new github.Repository(config.name, {
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
    });
}
//# sourceMappingURL=repostory.js.map