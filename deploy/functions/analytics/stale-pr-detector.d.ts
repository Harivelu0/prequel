import { AzureFunction } from "@azure/functions";
/**
 * Timer-triggered function to check for stale PRs and send notifications
 */
declare const timerTrigger: AzureFunction;
export default timerTrigger;
