import * as https from 'https';

/**
 * Utility to verify branch protection rules were applied correctly
 * This makes a direct GitHub API call outside of Pulumi to check
 */
export async function verifyBranchProtection(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    console.log(`Verifying branch protection for ${owner}/${repo}:${branch}...`);
    
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/branches/${branch}/protection`,
      method: 'GET',
      headers: {
        'User-Agent': 'PReQual-Verifier',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`Branch protection verified for ${owner}/${repo}:${branch}`);
          console.log('Protection rules found:');
          
          try {
            const protection = JSON.parse(data);
            console.log(JSON.stringify(protection, null, 2));
            resolve(true);
          } catch (error) {
            console.error('Error parsing protection response:', error);
            resolve(false);
          }
        } else {
          console.error(`Branch protection verification failed with status ${res.statusCode}`);
          console.error('Response:', data);
          
          if (res.statusCode === 404) {
            console.error('Branch protection rules not found. This may indicate they were not applied correctly.');
          }
          
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error verifying branch protection:', error);
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Utility to verify that repository webhooks are set up correctly
 */
export async function verifyRepositoryWebhooks(
  owner: string,
  repo: string,
  token: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    console.log(`Verifying webhooks for ${owner}/${repo}...`);
    
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/hooks`,
      method: 'GET',
      headers: {
        'User-Agent': 'PReQual-Verifier',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const webhooks = JSON.parse(data);
            console.log(`Found ${webhooks.length} webhooks for ${owner}/${repo}:`);
            
            // Log webhook details (redacting secrets)
            webhooks.forEach((hook: any, index: number) => {
              const redactedHook = {...hook};
              if (redactedHook.config && redactedHook.config.secret) {
                redactedHook.config.secret = '******';
              }
              console.log(`Webhook ${index + 1}:`, JSON.stringify(redactedHook, null, 2));
            });
            
            resolve(webhooks.length > 0);
          } catch (error) {
            console.error('Error parsing webhooks response:', error);
            resolve(false);
          }
        } else {
          console.error(`Webhook verification failed with status ${res.statusCode}`);
          console.error('Response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error verifying webhooks:', error);
      reject(error);
    });
    
    req.end();
  });
}