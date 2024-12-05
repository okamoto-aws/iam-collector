# IAM Collector セットアップガイド

## 概要
このガイドでは、複数のAWSアカウントのIAM情報を収集するためのCDKスタックの設定方法を説明します。
システムは以下の2つのスタックで構成されています：
- TrustedAccountStack: 監査対象アカウントに配置
- IamCollectorStack: 監査実行アカウントに配置

## 前提条件
- AWS CDKがインストールされていること
- 監査実行アカウントと監査対象アカウントのアクセス権限があること
- 各アカウントのCloudShellが使用可能であること

## セットアップ手順

### 1. プロジェクトのクローンと初期設定

各アカウントのCloudShellで以下のコマンドを実行します：

```bash
git clone https://github.com/okamoto-aws/iam-collector.git
cd iam-collector
npm install
```

### 2. パラメータの設定

CloudShellで、lib/parameters.tsを開き、auditAccountIdとtrustedAccountsを設定します：

```typescript
export const Parameters = {
    // 監査実行アカウントの設定
    auditAccountId: '123456789012', // あなたの監査実行アカウントIDに変更
    
    // 監査対象アカウントの設定
    trustedAccounts: [
      {
        accountName: 'account1', // 監査対象アカウントの名称(任意)
        accountId: '987654321098', // 監査対象アカウントのIDに変更
      },
      // 必要に応じて他のアカウントを追加
    ],
    auditRoleName: 'CrossAccountAuditRole',
    bucketPrefix: 'iam-collector',
    ssmParameterPrefix: '/iam-collector',
};
```

### 3. 監査対象アカウントでのTrustedAccountStackの設定

各監査対象アカウントのCloudShellで以下のコマンドを実行します：

```bash
cdk deploy TrustedAccountStack
```

デプロイの確認メッセージが表示されたら'y'を入力します。

※ 複数の監査対象アカウントがある場合、各アカウントで上記の手順を繰り返します。

### 4. 監査実行アカウントでのIamCollectorStackの設定

監査実行アカウントのCloudShellで以下のコマンドを実行します：

```bash
cdk deploy IamCollectorStack
```

デプロイの確認メッセージが表示されたら'y'を入力します。

### 5. Lambda関数のテスト実行

1. AWSマネジメントコンソールにログインし、Lambda サービスに移動
2. デプロイされたIamCollectorLambda関数を選択
3. 「テスト」タブをクリック
4. 新しいテストイベントを作成（空のイベント`{}`で問題ありません）
5. 「テスト」ボタンをクリックして実行

## ログの確認方法

### S3バケットの確認

最新のIAM情報ファイルをダウンロードするには、以下のAWS CLIコマンドを実行します：

```bash
# バケット内の最新ファイルのキーを取得
LATEST_FILE=$(aws s3api list-objects-v2 \
  --bucket iam-collector-<アカウントID>-<リージョン> \
  --query 'sort_by(Contents, &LastModified)[-1].Key' \
  --output text)

# 最新ファイルをダウンロード
aws s3 cp s3://iam-collector-<アカウントID>-<リージョン>/$LATEST_FILE ./

# ダウンロードしたJSONファイルの内容を表示（オプション）
cat $LATEST_FILE
```

注意：`<アカウントID>`と`<リージョン>`は、実際の値に置き換えてください。

## スタックの削除方法

### 監査実行アカウントのクリーンアップ
監査実行アカウントのCloudShellで以下を実行：
```bash
cdk destroy IamCollectorStack
```

### 監査対象アカウントのクリーンアップ
各監査対象アカウントのCloudShellで以下を実行：
```bash
cdk destroy TrustedAccountStack
```

注意事項：
- スタック削除時は確認メッセージが表示されます。内容を確認の上、'y'を入力してください
- S3バケットにはRETAINポリシーが設定されているため、スタック削除後も残ります。必要に応じて手動で削除してください

## トラブルシューティング

### CDK Bootstrapエラー

以下のようなエラーが表示された場合：
```
This stack uses assets, so the toolkit stack must be deployed to the environment
```

#### 解決方法：

1. 監査実行アカウントでのbootstrap
CloudShellで実行：
```bash
cdk bootstrap aws://<監査実行アカウントID>/<リージョン>
```

2. 監査対象アカウントでのbootstrap
各監査対象アカウントのCloudShellで実行：
```bash
cdk bootstrap aws://<監査対象アカウントID>/<リージョン>
```

注意事項：
- bootstrapは各アカウントで1回だけ実行が必要です
- リージョンごとに実行が必要です
- bootstrap実行にはアカウントの管理者権限が必要です

### その他の一般的なトラブルシューティング

デプロイやテスト実行に失敗した場合：
1. CloudWatch Logsでエラーメッセージを確認
2. IAMロールの権限が正しく設定されているか確認
3. SSMパラメータの設定値が正しいか確認
4. アカウントIDとリージョンの設定が正しいか確認
