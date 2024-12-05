// parameters.ts
export const Parameters = {
    // 監査実行アカウントの設定
    auditAccountId: '123456789012',
    
    // 監査対象アカウントの設定
    trustedAccounts: [
      {
        accountName: 'account1',
        accountId: '098765432109',
      },
      // 必要に応じて他のアカウントを追加
    ],

    // 監査用IAMロール名
    auditRoleName: 'CrossAccountAuditRole',
    
    // S3バケット名のプレフィックス
    bucketPrefix: 'iam-collector',
    
    // SSMパラメータ名のプレフィックス
    ssmParameterPrefix: '/iam-collector',
  };