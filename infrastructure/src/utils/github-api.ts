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


interface RepoCreateOptions {
  name: string;
  org: string;
  token: string;
  description?: string;
  visibility?: 'public' | 'private';
  defaultBranch?: string;
}

/**
 * Creates a GitHub repository directly using the GitHub API without Pulumi
 */
export async function createRepositoryDirectly(options: RepoCreateOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`Creating repository ${options.org}/${options.name} via GitHub API...`);
    
    const postData = JSON.stringify({
      name: options.name,
      description: options.description || '',
      private: options.visibility === 'private',
      auto_init: true,
      default_branch: options.defaultBranch || 'main'
    });
    
    const requestOptions = {
      hostname: 'api.github.com',
      path: `/orgs/${options.org}/repos`,
      method: 'POST',
      headers: {
        'User-Agent': 'PReQual-Creator',
        'Authorization': `token ${options.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`Repository ${options.org}/${options.name} created successfully`);
          
          try {
            const repoData = JSON.parse(data);
            
            // Try to add branch protection if possible
            tryAddBranchProtection(
              options.org, 
              options.name,
              options.defaultBranch || 'main',
              options.token
            ).then(branchProtected => {
              if (!branchProtected) {
                console.warn('Branch protection could not be applied. This feature requires GitHub Pro for private repos.');
              }
              resolve(repoData);
            }).catch(err => {
              // Still resolve with repo data even if branch protection fails
              console.warn('Error applying branch protection:', err.message);
              resolve(repoData);
            });
          } catch (error) {
            console.error('Error parsing repository creation response:', error);
            reject(error);
          }
        } else {
          console.error(`Repository creation failed with status ${res.statusCode}`);
          console.error('Response:', data);
          
          try {
            const errorData = JSON.parse(data);
            reject(new Error(errorData.message || 'Repository creation failed'));
          } catch (e) {
            reject(new Error(`Repository creation failed with status ${res.statusCode}`));
          }
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error creating repository:', error);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Attempts to add branch protection to a repository
 * Returns true if successful, false if not
 */
async function tryAddBranchProtection(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Attempting to add branch protection to ${owner}/${repo}:${branch}`);
    
    const postData = JSON.stringify({
      required_status_checks: null,
      enforce_admins: false,
      required_pull_request_reviews: {
        dismissal_restrictions: {},
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 1
      },
      restrictions: null
    });
    
    const requestOptions = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/branches/${branch}/protection`,
      method: 'PUT',
      headers: {
        'User-Agent': 'PReQual-Creator',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`Branch protection added successfully for ${owner}/${repo}:${branch}`);
          resolve(true);
        } else {
          console.warn(`Failed to add branch protection with status ${res.statusCode}`);
          console.warn('Response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.warn('Error adding branch protection:', error);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}