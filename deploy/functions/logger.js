"use strict";
/**
 * Simple logger utility for the PReQual system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.debug = debug;
/**
 * Log an informational message
 */
function info(message) {
    console.log(`[INFO] ${message}`);
}
/**
 * Log a warning message
 */
function warn(message) {
    console.warn(`[WARN] ${message}`);
}
/**
 * Log an error message
 */
/**
* Log an error message
*/
function error(err) {
    if (err instanceof Error) {
        console.error(`[ERROR] ${err.message}`);
    }
    else {
        console.error(`[ERROR] ${String(err)}`);
    }
}
/**
 * Log a debug message
 */
function debug(message) {
    if (process.env.DEBUG) {
        console.log(`[DEBUG] ${message}`);
    }
}
