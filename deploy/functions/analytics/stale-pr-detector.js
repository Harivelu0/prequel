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
const pr_repostory_1 = require("../../database/repostories/pr-repostory");
const slack_service_1 = require("../../notification/slack-service");
const logger = __importStar(require("../../utils/logger"));
const error_helpers_1 = require("../../utils/error-helpers");
/**
 * Timer-triggered function to check for stale PRs and send notifications
 */
const timerTrigger = async function (context, myTimer) {
    const timeStamp = new Date().toISOString();
    if (myTimer.isPastDue) {
        context.log('Stale PR detector function is running late!');
    }
    context.log('Stale PR detector function started running at', timeStamp);
    try {
        // Get stale PRs from database
        const stalePRs = await (0, pr_repostory_1.getStalePullRequests)();
        context.log(`Found ${stalePRs.length} stale pull requests`);
        if (stalePRs.length > 0) {
            // Send notification
            await (0, slack_service_1.sendStalePRsNotification)(stalePRs);
            context.log(`Sent notification for ${stalePRs.length} stale PRs`);
            // Log details for each stale PR
            for (const pr of stalePRs) {
                context.log(`Stale PR: #${pr.number} in ${pr.repository} by ${pr.author} - Open for ${pr.daysOpen} days`);
            }
        }
    }
    catch (error) {
        logger.error(`Error message: ${(0, error_helpers_1.getErrorMessage)(error)}`);
        throw error;
    }
};
exports.default = timerTrigger;
