#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IamCollectorStack } from '../lib/iam-collector-stack';
import { TrustedAccountStack } from '../lib/trusted-account-stack';

const app = new cdk.App();

new IamCollectorStack(app, 'IamCollectorStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new TrustedAccountStack(app, 'TrustedAccountStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});