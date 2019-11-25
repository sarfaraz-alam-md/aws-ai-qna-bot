module.exports={
    "FeedbackFirehose": {
        "Type" : "AWS::KinesisFirehose::DeliveryStream",
        "Properties" : {
            "DeliveryStreamType" : "DirectPut",
            "ElasticsearchDestinationConfiguration" : {
                "BufferingHints" : {
                    "IntervalInSeconds" : 60,
                    "SizeInMBs" : 5
                },
                "DomainARN" :{"Fn::GetAtt":["ESVar","ESArn"]},
                "IndexName" :{"Fn::Sub":"${ESVar.FeedbackIndex}"} ,
                "IndexRotationPeriod" : "NoRotation",
                "RetryOptions" : {
                    "DurationInSeconds" : 300
                },
                "RoleARN" : {"Fn::GetAtt" : ["FirehoseESS3Role", "Arn"] },
                "S3BackupMode" : "AllDocuments",
                "S3Configuration" : 
                {
                    "BucketARN" : { "Fn::GetAtt" : [ "MetricsBucket", "Arn" ] },
                    "BufferingHints" : {
                        "IntervalInSeconds" : 60,
                        "SizeInMBs" : 5
                    },
                    "Prefix":"feedback/", 
                    "CompressionFormat" : "UNCOMPRESSED",
                    "RoleARN" : {"Fn::GetAtt" : ["FirehoseESS3Role", "Arn"] }
                },
                "TypeName" : "feedback"
            },
        }
    },
    "GeneralFirehose": {
        "Type" : "AWS::KinesisFirehose::DeliveryStream",
        "Properties" : {
            "DeliveryStreamType" : "DirectPut",
            "ElasticsearchDestinationConfiguration" : {
                "BufferingHints" : {
                    "IntervalInSeconds" : 60,
                    "SizeInMBs" : 5
                },
                "DomainARN" :{"Fn::GetAtt":["ESVar","ESArn"]},
                "IndexName" : {"Fn::Sub":"${ESVar.MetricsIndex}"},
                "IndexRotationPeriod" : "NoRotation",
                "RetryOptions" : {
                    "DurationInSeconds" : 300
                },
                "RoleARN" : {"Fn::GetAtt" : ["FirehoseESS3Role", "Arn"] },
                "S3BackupMode" : "AllDocuments",
                "S3Configuration" : 
                {
                    "BucketARN" : { "Fn::GetAtt" : [ "MetricsBucket", "Arn" ] },
                    "Prefix":"metrics/",
                    "BufferingHints" : {
                        "IntervalInSeconds" : 60,
                        "SizeInMBs" : 5
                    },
                    "CompressionFormat" : "UNCOMPRESSED",
                    "RoleARN" : {"Fn::GetAtt" : ["FirehoseESS3Role", "Arn"] }
                },
                "TypeName" : "general"
            },
        }
    },
    "MetricsBucket":{
        "Type" : "AWS::S3::Bucket",
        "DeletionPolicy":"Delete",
        "Properties" : {
          "Tags" : [
              {
                "Key" : "Use",
                "Value" : "Metrics"
              }
            ]
        }
    },
    "MetricsBucketClear":{
        "Type": "Custom::S3Clear",
        "DependsOn":["CFNInvokePolicy"],
        "Properties": {
            "ServiceToken": { "Fn::GetAtt" : ["CFNLambda", "Arn"] },
            "Bucket":{"Ref":"MetricsBucket"}
        }
    },
    "FirehoseESS3Role":{
        "Type": "AWS::IAM::Role",
        "Properties": {
          "AssumeRolePolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                    "Service": "firehose.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
                }   
            ]
          },
          "Path": "/",
          "Policies": [ {
          "PolicyDocument" : {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Sid": "",
                "Effect": "Allow",
                "Action": [
                  "s3:AbortMultipartUpload",
                  "s3:GetBucketLocation",
                  "s3:GetObject",
                  "s3:ListBucket",
                  "s3:ListBucketMultipartUploads",
                  "s3:PutObject"
                ],
                "Resource": [
                  {"Fn::GetAtt": ["MetricsBucket", "Arn"]},
                  {"Fn::Join":["",[{"Fn::GetAtt": ["MetricsBucket", "Arn"]},"/*"]]}
                ]
              },
              {
                "Sid": "",
                "Effect": "Allow",
                "Action": [
                  "lambda:InvokeFunction",
                  "lambda:GetFunctionConfiguration"
                ],
                "Resource":[
                  {"Fn::Join": ["",["arn:aws:lambda:",{ "Ref" : "AWS::Region" },":",{ "Ref" : "AWS::AccountId" },":function:%FIREHOSE_DEFAULT_FUNCTION%:%FIREHOSE_DEFAULT_VERSION%"]]}
                ]
              },
              {
                "Sid": "",
                "Effect": "Allow",
                "Action": [
                  "es:DescribeElasticsearchDomain",
                  "es:DescribeElasticsearchDomains",
                  "es:DescribeElasticsearchDomainConfig",
                  "es:ESHttpPost",
                  "es:ESHttpPut",
                  "es:ESHttpGet"
                ],
                "Resource": [
                  {"Fn::GetAtt":["ESVar","ESArn"]},
                  {"Fn::Join":["",[{"Fn::GetAtt":["ESVar","ESArn"]},"/*"]]}
                ]
              },
              {
                "Sid": "",
                "Effect": "Allow",
                "Action": [
                  "logs:PutLogEvents"
                ],
                "Resource": [
                  {"Fn::Join": ["",["arn:aws:logs:",{ "Ref" : "AWS::Region" },":",{ "Ref" : "AWS::AccountId" },":log-group:/aws/kinesisfirehose/*"]]}
                ]
              }
            ]
          },
          "PolicyName" : "QnAFirehose"
      }]
    }}
}
