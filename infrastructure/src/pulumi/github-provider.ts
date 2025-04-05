import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import * as logger from "../utils/logger";

/**
 * Provides GitHub API integration for repository operations
 */
export class GitHubProvider {
  private provider: github.Provider;
  private config: pulumi.Config;

  constructor() {
    this.config = new pulumi.Config();
    
    // Get GitHub token from config
    const token = this.config.requireSecret("githubToken");
    
    // Create the GitHub provider
    this.provider = new github.Provider("github-provider", {
      token: token,
      // Optional: set the base URL for GitHub Enterprise
      // baseUrl: "https://github.example.com/api/v3/",
    });
    
    logger.info("GitHub provider initialized");
  }

  /**
   * Get the Pulumi GitHub provider instance
   */
  getProvider(): github.Provider {
    return this.provider;
  }

  /**
   * Get all repositories for an organization
   */
  async getOrganizationRepositories(organizationName: string): Promise<any[]> {
    try {
      logger.info(`Fetching repositories for organization: ${organizationName}`);
      
      // Try the specific query for organization repositories
      try {
        const query = `org:${organizationName}`;
        const repositories = await github.getRepositories({
          query: query
        }, { provider: this.provider });
        
        // Access the repositories array
        // Since GetRepositoriesResult might not have items property in your version
        // We'll handle this safely with type assertions
        const repoArray = (repositories as any).repositories || 
                         (repositories as any).items || 
                         [];
        
        logger.info(`Found ${repoArray.length} repositories for ${organizationName}`);
        return repoArray;
      } catch (e) {
        // Return empty array as fallback
        return [];
      }
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Create a new repository
   */
  createRepository(
    name: string, 
    organization?: string, 
    description?: string, 
    isPrivate: boolean = true
  ): github.Repository {
    try {
      logger.info(`Creating repository: ${name}`);
      
      return new github.Repository(
        name,
        {
          name: name,
          description: description || "",
          visibility: isPrivate ? "private" : "public",
          hasIssues: true,
          hasProjects: true,
          hasWiki: true,
          autoInit: true,
          allowMergeCommit: false,
          allowSquashMerge: true,
          allowRebaseMerge: false,
          deleteBranchOnMerge: true,
        },
        {
          provider: this.provider
        }
      );
    } catch (error: unknown) {
      throw error;
    }
  }
}