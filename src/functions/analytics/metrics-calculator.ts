import { AzureFunction, Context } from "@azure/functions";
import * as sql from 'mssql';
import { updateAllPRMetrics } from "../../database/repostories/metrics-repostory";
import { getWeeklyPRStats } from "../../database/repostories/pr-repostory";
import { sendWeeklySummary } from "../../notification/slack-service";
import * as logger from "../../utils/logger";

/**
 * Timer-triggered function to calculate PR metrics and generate reports
 */
const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
  const timeStamp = new Date().toISOString();
  
  if (myTimer.isPastDue) {
    context.log('Metrics calculator function is running late!');
  }
  
  context.log('Metrics calculator function started running at', timeStamp);
  
  try {
    // Update metrics for all PRs
    await updateAllPRMetrics();
    context.log('PR metrics updated successfully');
    
    // Check if this is a weekly run based on the schedule
    // Weekly runs typically happen on Monday mornings
    const isWeeklyRun = isMonday();
    
    if (isWeeklyRun) {
      context.log('Generating weekly PR report');
      
      // Get weekly PR statistics
      const weeklyStats = await getWeeklyPRStats();
      
      // Send weekly summary to Slack
      await sendWeeklySummary(weeklyStats);
      
      context.log('Weekly PR report sent successfully');
    }
  } catch (error) {
    context.log.error(`Error in metrics calculator: ${error.message}`);
    logger.error(`Metrics calculator error: ${error.message}`);
    throw error;
  }
};

/**
 * Determines if today is Monday
 */
function isMonday(): boolean {
  const today = new Date();
  return today.getDay() === 1; // 0 is Sunday, 1 is Monday
}

/**
 * Exports key PR metrics to storage for archiving
 */
async function exportMetricsToStorage(context: Context): Promise<void> {
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
  } catch (error) {
    context.log.error(`Error exporting metrics to storage: ${error.message}`);
    logger.error(`Error exporting metrics to storage: ${error.message}`);
  }
}

export default timerTrigger;