import { App } from 'aws-cdk-lib';
import { KnightsStack } from '../lib/stack';

new KnightsStack(new App(), 'KnightsHockey', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1' },
});
