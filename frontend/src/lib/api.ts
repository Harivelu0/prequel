import axios from 'axios';

// Define base URL for API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set a reasonable timeout to avoid long waiting times
  timeout: 50000
});

// Add request/response interceptors for debugging
apiClient.interceptors.request.use(request => {
  console.log('API Request:', request.method, request.url, request.data);
  return request;
});

apiClient.interceptors.response.use(
  response => {
    console.log('API Response:', response.status);
    return response;
  },
  error => {
    console.error('API Error:', error.message, error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Define interfaces for our data models
export interface Repository {
  id: number;
  github_id: number;
  name: string;
  full_name: string;
  created_at: string;
  pr_count: number;
  review_count: number;
  stale_pr_count: number;
  contributor_count: number;
  last_activity: string;
}

export interface Contributor {
  id: number;
  github_id: number;
  username: string;
  avatar_url: string;
  created_at: string;
  pr_count: number;
  review_count: number;
  comment_count: number;
  command_count?: number;
  repositories: string[];
}

export interface User {
  id: number;
  github_id: number;
  username: string;
  avatar_url: string;
  created_at: string;
}

export interface PullRequest {
  id: number;
  github_id: number;
  repository_id: number;
  author_id: number;
  title: string;
  number: number;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  is_stale: boolean;
  last_activity_at: string;
  repository_name?: string;
  author_name?: string;
}

export interface Review {
  id: number;
  github_id: number;
  pull_request_id: number;
  reviewer_id: number;
  state: string;
  submitted_at: string;
  reviewer_name?: string;
}

export interface ReviewComment {
  id: number;
  github_id: number;
  review_id: number | null;
  pull_request_id: number;
  author_id: number;
  body: string;
  created_at: string;
  updated_at: string;
  contains_comment: boolean;
  comment_type: string | null;
  author_name?: string;
}

export interface PRMetrics {
    pr_authors: [string, number][];
    active_reviewers: [string, number][];
    comment_users: [string, number][];
    stale_pr_count: number;
}


export interface Configuration {
  githubToken?: string;
  organizationName?: string;
  enableSlackNotifications: boolean;
  slackWebhookUrl?: string;
  stalePrDays: number;
  slackApiToken?: string;
  slackChannel?: string;
}

export interface BranchProtectionRules {
  requirePullRequest: boolean;
  requiredReviewers: number;
  dismissStaleReviews: boolean;
  requireCodeOwners: boolean;
}

// API functions for data fetching
export const api = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch {
      console.warn('Backend API not available');
      return { status: 'error', timestamp: new Date().toISOString() };
    }
  },
  
  // Get PR metrics data for dashboard
  getPRMetrics: async (): Promise<PRMetrics> => {
    try {
      const response = await apiClient.get('/api/metrics');
      return response.data;
    } catch {
      console.warn('Error fetching PR metrics');
      return {
        pr_authors: [],
        active_reviewers: [],
        comment_users: [],
        stale_pr_count: 0
      };
    }
  },
  
  // Get stale PRs
  getStalePRs: async (): Promise<PullRequest[]> => {
    try {
      const response = await apiClient.get('/api/stale-prs');
      return response.data;
    } catch  {
      console.warn('Error fetching stale PRs');
      return [];
    }
  },
  
  // Get repositories with metrics
  getRepositories: async (): Promise<Repository[]> => {
    try {
      const response = await apiClient.get('/api/repositories');
      return response.data;
    } catch {
      console.warn('Error fetching repositories');
      return [];
    }
  },


getContributors: async (): Promise<Contributor[]> => {
  try {
    console.log('Fetching contributors data...');
    
    // Make a direct fetch call with detailed logging
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/contributors`;
    console.log('Fetching from URL:', url);
    
    const directResponse = await fetch(url);
    console.log('Direct fetch response status:', directResponse.status);
    console.log('Direct fetch response headers:', Object.fromEntries([...directResponse.headers]));
    
    if (directResponse.ok) {
      const directData = await directResponse.json();
      console.log('Direct fetch raw data:', JSON.stringify(directData, null, 2));
      
      // Log each contributor's comments-related properties
      if (Array.isArray(directData)) {
        directData.forEach((contributor, index) => {
          console.log(`Contributor ${index} (${contributor.username}) comments data:`, {
            comment_count: contributor.comment_count,
            command_count: contributor.command_count,
            // Log all properties to help identify what's available
            keys: Object.keys(contributor)
          });
        });
      }
    }
    const response = await apiClient.get('/api/contributors');
    console.log('API client full response:', response);
    return response.data;
  } catch (error) {
    console.error('Error fetching contributors with detailed info:', error);
    return [];
  }
},
  // Get pull requests with repository and author info
  getPullRequests: async (): Promise<PullRequest[]> => {
    try {
      const response = await apiClient.get('/api/pull-requests');
      return response.data;
    } catch  {
      console.warn('Error fetching pull requests');
      return [];
    }
  },

  // Validate GitHub token
  validateGithubToken: async (token: string): Promise<{ valid: boolean }> => {
    // Simple validation - just check if token looks reasonable
    if (token && token.length > 30) {
      return { valid: true };
    }
    return { valid: false };
  },

  // Get configuration
  getConfiguration: async (): Promise<Configuration> => {
    try {
      // Try local storage first
      const storedConfig = localStorage.getItem('prequel-config');
      if (storedConfig) {
        return JSON.parse(storedConfig);
      }
      
      return {
        enableSlackNotifications: false,
        stalePrDays: 7
      };
    } catch  {
      console.warn('Error fetching configuration');
      return {
        enableSlackNotifications: false,
        stalePrDays: 7
      };
    }
  },

  // Save configuration (initial setup)
  saveConfiguration: async (config: Partial<Configuration>): Promise<{ success: boolean }> => {
    try {
        await apiClient.post('/api/config', {
        githubToken: config.githubToken,
        organizationName: config.organizationName,
        slackWebhookUrl: config.slackWebhookUrl 
      });
      return {
        success: true };
    } catch (error) {
      console.error('Error saving configuration:', error);
      return { success: false };
    }
  },

  // Explicit repository creation method
  createRepository: async (repo: {
    name: string;
    description?: string;
    visibility?: 'public' | 'private';
    branch?: string;
  }): Promise<{ success: boolean; repository?: Repository }> => {
    try {
      const response = await apiClient.post('/api/repositories', repo);
      return { 
        success: true,
        repository: response.data.repository
      };
    } catch (error) {
      console.error('Error creating repository:', error);
      return { success: false };
    }
  },
  
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get('/api/stats');
      console.log('Dashboard stats response:', response.data);
      return response.data;
    } catch(error) {
      console.warn('Error fetching dashboard stats:', error);
      return {
        pr_metrics: {
          pr_authors: [],
          active_reviewers: [],
          comment_users: [],
          stale_pr_count: 0
        },
        repositories: [],
        contributors: [],
        stale_prs: [],
        recent_prs: []
      };
    }
  },

  // Update configuration (settings page)
  updateConfiguration: async (config: Partial<Configuration>): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post('/api/auth/update-configuration', config);
      return response.data;
    } catch {
      console.warn('Error updating configuration');
      return { success: false };
    }
  },

  // Setup branch protection
  setupBranchProtection: async (
    repo: string, 
    branch: string, 
    rules: BranchProtectionRules
  ): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post('/api/repos/branch-protection', {
        repo,
        branch,
        rules
      });
      return response.data;
    } catch {
      console.warn('Error setting up branch protection');
      return { success: false };
    }
  }
};

export default api;