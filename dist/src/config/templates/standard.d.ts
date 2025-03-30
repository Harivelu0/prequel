export interface RepositoryConfig {
    name: string;
    description: string;
    organization?: string;
    visibility: 'public' | 'private' | 'internal';
    defaultBranch: string;
    webhookUrl: string;
    webhookSecret: string;
    requiredApprovals: number;
    allowSelfApprovals: boolean;
}
export declare function createStandardConfig(config: RepositoryConfig): any;
export declare const standardDefaults: Partial<RepositoryConfig>;
