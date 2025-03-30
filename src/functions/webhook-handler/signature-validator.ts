import * as crypto from 'crypto';

/**
 * Validates the GitHub webhook signature
 * 
 * @param payload - The request body
 * @param signature - The signature from the X-Hub-Signature-256 header
 * @param secret - The webhook secret
 * @returns boolean indicating if the signature is valid
 */
export function validateGitHubSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  // Convert payload to string if it's not already
  const payloadString = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload);

  // Calculate expected signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const calculatedSignature = `sha256=${hmac.digest('hex')}`;

  // Use timing-safe comparison to avoid timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(signature)
  );
}