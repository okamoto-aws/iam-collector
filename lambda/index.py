# lambda/index.py
import boto3
import json
import os
import datetime

def get_accounts_config():
    """SSMパラメータストアから設定を取得"""
    ssm = boto3.client('ssm')
    parameter = ssm.get_parameter(
        Name=os.environ['ACCOUNTS_PARAMETER_NAME']
    )
    return json.loads(parameter['Parameter']['Value'])

def assume_role(role_arn, session_name):
    """クロスアカウントロールの引き受け"""
    sts_client = boto3.client('sts')
    assumed_role_object = sts_client.assume_role(
        RoleArn=role_arn,
        RoleSessionName=session_name
    )
    return assumed_role_object['Credentials']

def get_iam_resources(session):
    """IAMリソースの取得"""
    iam = session.client('iam')
    
    resources = {
        "Users": [],
        "Roles": [],
        "Groups": [],
        "Policies": []
    }
    
    users = iam.list_users()
    for user in users['Users']:
        resources["Users"].append(user['UserName'])
    
    roles = iam.list_roles()
    for role in roles['Roles']:
        resources["Roles"].append(role['RoleName'])
    
    groups = iam.list_groups()
    for group in groups['Groups']:
        resources["Groups"].append(group['GroupName'])
    
    policies = iam.list_policies(Scope='Local')
    for policy in policies['Policies']:
        resources["Policies"].append(policy['PolicyName'])
    
    return resources

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    try:
        # SSMから設定を取得
        accounts = get_accounts_config()
        results = {}
        
        for account in accounts:
            account_name = account['account_name']
            role_arn = account['role_arn']
            print(f"Processing account: {account_name}")
            
            try:
                credentials = assume_role(role_arn, "IAMResourceCollector")
                session = boto3.Session(
                    aws_access_key_id=credentials['AccessKeyId'],
                    aws_secret_access_key=credentials['SecretAccessKey'],
                    aws_session_token=credentials['SessionToken']
                )
                
                resources = get_iam_resources(session)
                results[account_name] = resources
                
            except Exception as e:
                print(f"Error processing account {account_name}: {str(e)}")
                results[account_name] = {"error": str(e)}
        
        # S3に結果を保存
        s3 = boto3.client('s3')
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        key = f'iam_collector/iam_resources_{timestamp}.json'
        
        s3.put_object(
            Bucket=os.environ['BUCKET_NAME'],
            Key=key,
            Body=json.dumps(results, indent=2)
        )
        
        return {
            'statusCode': 200,
            'message': f'Results written to s3://{os.environ["BUCKET_NAME"]}/{key}'
        }
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        raise