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
const sql = __importStar(require("mssql"));
const metrics_repostory_1 = require("../../database/repostories/metrics-repostory");
const pr_repostory_1 = require("../../database/repostories/pr-repostory");
const slack_service_1 = require("../../notification/slack-service");
const logger = __importStar(require("../../utils/logger"));
const error_helpers_1 = require("../../utils/error-helpers");
/**
 * Timer-triggered function to calculate PR metrics and generate reports
 */
const timerTrigger = async function (context, myTimer) {
    const timeStamp = new Date().toISOString();
    if (myTimer.isPastDue) {
        context.log('Metrics calculator function is running late!');
    }
    context.log('Metrics calculator function started running at', timeStamp);
    try {
        // Update metrics for all PRs
        await (0, metrics_repostory_1.updateAllPRMetrics)();
        context.log('PR metrics updated successfully');
        // Check if this is a weekly run based on the schedule
        // Weekly runs typically happen on Monday mornings
        const isWeeklyRun = isMonday();
        if (isWeeklyRun) {
            context.log('Generating weekly PR report');
            // Get weekly PR statistics
            const weeklyStats = await (0, pr_repostory_1.getWeeklyPRStats)();
            // Send weekly summary to Slack
            await (0, slack_service_1.sendWeeklySummary)(weeklyStats);
            context.log('Weekly PR report sent successfully');
        }
    }
    catch (error) {
        logger.error(`Error message: ${(0, error_helpers_1.getErrorMessage)(error)}`);
        throw error;
    }
};
/**
 * Determines if today is Monday
 */
function isMonday() {
    const today = new Date();
    return today.getDay() === 1; // 0 is Sunday, 1 is Monday
}
/**
 * Exports key PR metrics to storage for archiving
 */
async function exportMetricsToStorage(context) {
    try {
        context.log('Exporting metrics to storage');
        // Get connection pool
        const connectionString = process.env.DATABASE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error("Database connection string not configured");
        }
        const pool = await new sql.ConnectionPool(connectionString).connect();
        // Get key metrics from database
        const result = await pool.request().query(`
      SELECT 
        FORMAT(GETUTCDATE(), 'yyyy-MM-dd') as Date,
        COUNT(*) as TotalPRs,
        COUNT(CASE WHEN State = 'open' THEN 1 END) as OpenPRs,
        COUNT(CASE WHEN State = 'merged' THEN 1 END) as MergedPRs,
        COUNT(CASE WHEN State = 'closed' AND MergedAt IS NULL THEN 1 END) as ClosedPRs,
        AVG(CAST((SELECT TimeToFirstReview FROM PRMetrics WHERE PRId = pr.PRId) as FLOAT)) as AvgTimeToFirstReview,
        AVG(CAST((SELECT TimeToMerge FROM PRMetrics WHERE PRId = pr.PRId) as FLOAT)) as AvgTimeToMerge
      FROM PullRequests pr
    `);
        // Close the connection
        await pool.close();
        if (result.recordset.length === 0) {
            context.log('No metrics data to export');
            return;
        }
        // Get the metrics data
        const metricsData = result.recordset[0];
        // Convert to JSON for storage
        const metricsJson = JSON.stringify(metricsData);
        // In a real implementation, we would store this in Azure Blob Storage
        // For simplicity, we'll just log it here
        context.log('Metrics data:', metricsJson);
        // Create a file name with date
        const fileName = `metrics-${metricsData.Date}.json`;
        context.log(`Metrics exported to storage as: ${fileName}`);
    }
    catch (error) {
        logger.error(`Error message: ${(0, error_helpers_1.getErrorMessage)(error)}`);
        throw error;
    }
}
exports.default = timerTrigger;
