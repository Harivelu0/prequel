import * as github from '@pulumi/github';
import { RepositoryConfig } from '../config/templates/standard';
export declare function createBranchProtection(config: RepositoryConfig, repository: github.Repository): github.BranchProtection;
