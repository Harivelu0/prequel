import * as github from '@pulumi/github';
import { RepositoryConfig } from '../config/templates/standard';
export declare function createWebhook(config: RepositoryConfig, repository: github.Repository): github.RepositoryWebhook;
