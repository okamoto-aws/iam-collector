// trusted-account-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Parameters } from '../parameters';

export class TrustedAccountStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 監査実行アカウントのアカウントID
    const auditAccountId = Parameters.auditAccountId; // Lambda実行アカウントのID

    // クロスアカウントロールの作成
    const crossAccountRole = new iam.Role(this, 'CrossAccountAuditRole', {
      roleName: Parameters.auditRoleName,
      assumedBy: new iam.AccountPrincipal(auditAccountId),
      description: 'Role for IAM audit from another account',
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // 必要な権限を付与
    crossAccountRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'iam:ListUsers',
        'iam:ListRoles',
        'iam:ListGroups',
        'iam:ListPolicies',
        // 必要に応じて他の権限を追加
      ],
      resources: ['*'],
    }));
  }
}