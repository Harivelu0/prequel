import * as crypto from 'crypto';

export async function validateGitHubSignature(payload: any, signature: string): Promise<boolean> {
  try {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('GITHUB_WEBHOOK_SECRET environment variable is not set');
      return false;
    }
    
    if (!signature) {
      console.error('Signature is empty or undefined');
      return false;
    }
    
    console.log('Validating signature...');
    
    // Convert payload to string if it's not already
    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    // Compute expected signature
    const computedHash = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');
    
    const expectedSignature = `sha256=${computedHash}`;
    
    // Compare signatures
    const isValid = expectedSignature === signature;
    
    console.log(`Signature validation result: ${isValid}`);
    
    return isValid;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}