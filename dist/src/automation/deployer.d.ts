import * as automation from '@pulumi/pulumi/automation';
import { RepositoryConfig } from '../config/templates/standard';
export declare function deployRepositoryConfig(config: RepositoryConfig, stackName?: string): Promise<automation.OutputMap>;
export declare function deployMultipleRepositories(configs: RepositoryConfig[], stackName?: string): Promise<Record<string, automation.OutputMap>>;
