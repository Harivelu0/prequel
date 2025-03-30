import * as github from '@pulumi/github';
import { RepositoryConfig } from '../config/templates/standard';
export declare function createRepository(config: RepositoryConfig): github.Repository;
