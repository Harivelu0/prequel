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
exports.validateGitHubSignature = validateGitHubSignature;
const crypto = __importStar(require("crypto"));
const logger = __importStar(require("../../utils/logger"));
const error_helpers_1 = require("../../utils/error-helpers");
/**
 * Validates GitHub webhook signature to prevent spoofing
 *
 * Note: This version gets the secret from environment variables
 * instead of requiring it as a parameter
 */
async function validateGitHubSignature(payload, signature) {
    try {
        // Get webhook secret from environment variables
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        if (!secret) {
            logger.error("GITHUB_WEBHOOK_SECRET environment variable not set");
            return false;
        }
        // Convert payload to string if it's not already
        const payloadString = typeof payload === 'string'
            ? payload
            : JSON.stringify(payload);
        // Create HMAC
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(payloadString);
        // Get digest
        const digest = `sha256=${hmac.digest('hex')}`;
        // Compare signatures using timing-safe comparison
        // This helps prevent timing attacks
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    }
    catch (error) {
        logger.error(`Error validating GitHub signature: ${(0, error_helpers_1.getErrorMessage)(error)}`);
        return false;
    }
}
