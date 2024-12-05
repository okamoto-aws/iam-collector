//iam-collector-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Parameters } from '../parameters';

export class IamCollectorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SSMパラメータ用のアカウント設定を生成
    const accountsConfig = Parameters.trustedAccounts.map(account => ({
      account_name: account.accountName,
      role_arn: `arn:aws:iam::${account.accountId}:role/${Parameters.auditRoleName}`,
    }));

    // SSMパラメータの作成
    const accountsParam = new ssm.StringParameter(this, 'CollectorAccountsConfig', {
      parameterName: `${Parameters.ssmParameterPrefix}/accounts`,
      stringValue: JSON.stringify(accountsConfig),
      description: 'Target accounts configuration for IAM collector',
      tier: ssm.ParameterTier.STANDARD,
    });

    // S3バケットの作成
    const bucket = new s3.Bucket(this, 'IamCollectorBucket', {
      bucketName: `${Parameters.bucketPrefix}-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,

    });

    // Lambda関数のIAMロール作成
    const lambdaRole = new iam.Role(this, 'IamCollectorLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Lambda関数に必要な権限を付与
    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );

    // S3バケットへの書き込み権限
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [bucket.arnForObjects('*')],
    }));

    // STSの権限
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: [`arn:aws:iam::*:role/${Parameters.auditRoleName}`], // より具体的なリソース指定
    }));

    // SSMパラメータ読み取り権限
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [accountsParam.parameterArn],
    }));

    // Lambda関数の作成
    const collectorLambda = new lambda.Function(this, 'IamCollectorLambda', {
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'index.lambda_handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      timeout: cdk.Duration.minutes(10),
      environment: {
        ACCOUNTS_PARAMETER_NAME: accountsParam.parameterName,
        BUCKET_NAME: bucket.bucketName,
      },
      memorySize: 256,
      logRetention: cdk.aws_logs.RetentionDays.THREE_MONTHS,
    });

    // EventBridgeルールの作成（毎月末日の0時に実行）
    const rule = new events.Rule(this, 'MonthlyIamCollectorRule', {
      schedule: events.Schedule.expression('cron(0 0 LW * ? *)'),
      targets: [new targets.LambdaFunction(collectorLambda)],
      description: 'Triggers IAM collector Lambda on the last workday of each month',
    });

    // 出力の追加
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'Name of the S3 bucket where IAM data is stored',
    });

    new cdk.CfnOutput(this, 'SSMParameterName', {
      value: accountsParam.parameterName,
      description: 'Name of the SSM parameter containing account configurations',
    });
  }
}