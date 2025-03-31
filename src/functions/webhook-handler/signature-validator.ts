import * as crypto from 'crypto';
import * as logger from '../../utils/logger';
import { getErrorMessage } from '../../utils/error-helpers';

/**
 * Validates GitHub webhook signature to prevent spoofing
 * 
 * Note: This version gets the secret from environment variables
 * instead of requiring it as a parameter
 */
export async function validateGitHubSignature(
  payload: any, 
  signature: string
): Promise<boolean> {
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
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signature)
    );
  } catch (error: unknown) {
    logger.error(`Error validating GitHub signature: ${getErrorMessage(error)}`);
    return false;
  }
}