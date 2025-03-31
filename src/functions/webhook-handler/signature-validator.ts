// In signature-validator.ts
import * as crypto from 'crypto';

export async function validateGitHubSignature(payload: string, signature: string): Promise<boolean> {
  try {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    console.log('Validation Inputs:');
    console.log('Payload:', payload);
    console.log('Webhook Secret:', webhookSecret);
    console.log('Received Signature:', signature);

    // Compute expected signature
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    console.log('Computed Signature:', computedSignature);

    // Compare signatures
    const expectedSignatureHeader = `sha256=${computedSignature}`;
    const isValid = expectedSignatureHeader === signature;

    console.log('Signature Validation Result:', isValid);

    return isValid;
  } catch (error) {
    console.error('Signature Validation Error:', error);
    return false;
  }
}