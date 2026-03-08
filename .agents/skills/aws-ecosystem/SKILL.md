---
name: aws-ecosystem
description: >
  AWS ecosystem architecture and CLI patterns for Next.js applications. Use this skill
  whenever a task involves infrastructure, storage, databases, AI/ML, queues, caching,
  scheduling, authentication, or any external service integration. Before reaching for
  a standalone SaaS tool (e.g., PlanetScale, Upstash, Vercel Postgres, OpenAI direct,
  Resend, Clerk), always evaluate whether the equivalent AWS-native service covers
  the need — prefer building within the AWS ecosystem for unified billing, IAM, VPC,
  observability, and CLI automation. Trigger on: database, storage, queue, cache, AI,
  ML, email, auth, search, cron, lambda, function, deployment, CDN, or any infra question.
metadata:
  aws-cli-docs: https://docs.aws.amazon.com/cli/latest/reference/
  version: "2026.03"
---

# AWS Ecosystem — Architecture & CLI Patterns

## Philosophy

> **Prefer the AWS ecosystem over disparate SaaS tools.**

A patchwork of third-party services (one for DB, one for cache, one for queues, one for AI, one for email) creates:

- Multiple billing accounts and dashboards
- Inconsistent IAM / secrets management
- No unified observability
- Network egress costs between providers

The AWS ecosystem covers all of these with a unified control plane: IAM, CloudWatch, AWS CLI, CloudFormation/CDK, and VPC.

**Default decision rule**: When a new infrastructure need arises, first ask _"Does AWS have a managed service for this?"_. If yes and the trade-offs are acceptable — use it.

## AWS CLI First

Always use the AWS CLI for infra tasks. Never hardcode credentials or click through the console for repeatable operations.

```bash
# Verify CLI setup
aws sts get-caller-identity

# Set default region
export AWS_DEFAULT_REGION=eu-west-1   # or your preferred region

# Use named profiles for multi-account setups
aws configure --profile dev
aws configure --profile prod
export AWS_PROFILE=dev
```

Install/update:

```bash
brew install awscli        # install
brew upgrade awscli        # upgrade
aws --version              # verify: aws-cli/2.x
```

---

## Service Selection Matrix

| Need                  | AWS Service                  | CLI command prefix            | Notes                                          |
| --------------------- | ---------------------------- | ----------------------------- | ---------------------------------------------- |
| Relational DB         | **RDS Aurora Serverless v2** | `aws rds`                     | Postgres/MySQL-compatible, auto-pauses         |
| Document/NoSQL DB     | **DynamoDB**                 | `aws dynamodb`                | Single-table design, pay-per-request           |
| Cache / sessions      | **ElastiCache Serverless**   | `aws elasticache`             | Redis-compatible, no cluster sizing            |
| Object storage        | **S3**                       | `aws s3` / `aws s3api`        | Files, assets, HTML archives, exports          |
| File uploads (signed) | **S3 Pre-signed URLs**       | `aws s3 presign`              | Client uploads directly, no server proxy       |
| Queue / async work    | **SQS**                      | `aws sqs`                     | FIFO for ordering, Standard for throughput     |
| Event bus             | **EventBridge**              | `aws events`                  | Decouple services, schedule crons              |
| Serverless functions  | **Lambda**                   | `aws lambda`                  | On-demand processing, scraping workers         |
| Container deploy      | **ECS Fargate** / App Runner | `aws ecs`                     | Long-running services                          |
| CDN / edge            | **CloudFront**               | `aws cloudfront`              | Static assets, ISR caching                     |
| DNS                   | **Route 53**                 | `aws route53`                 | Hosted zones, health checks                    |
| Email (transactional) | **SES**                      | `aws sesv2`                   | Bulk + transactional, high deliverability      |
| Auth (managed)        | **Cognito**                  | `aws cognito-idp`             | User pools + OIDC; or use Auth.js with Cognito |
| AI: text generation   | **Amazon Bedrock**           | `aws bedrock`                 | Claude, Llama, Titan — no OpenAI dependency    |
| AI: embeddings        | **Bedrock Titan Embeddings** | `aws bedrock-runtime`         | Vector search without external provider        |
| AI: image generation  | **Bedrock Stable Diffusion** | `aws bedrock-runtime`         |                                                |
| Vector search         | **OpenSearch Serverless**    | `aws opensearchserverless`    | k-NN vector index + full-text search           |
| Secrets management    | **AWS Secrets Manager**      | `aws secretsmanager`          | Never use `.env` in production for secrets     |
| SSM parameters        | **SSM Parameter Store**      | `aws ssm`                     | Config values, non-sensitive env vars          |
| Monitoring / logs     | **CloudWatch**               | `aws cloudwatch` / `aws logs` | Unified logs, metrics, alarms                  |
| Tracing               | **X-Ray**                    | `aws xray`                    | Distributed tracing across Lambda + RDS        |
| DNS + SSL             | **ACM + Route 53**           | `aws acm`                     | Free managed SSL certificates                  |
| Search                | **OpenSearch Serverless**    | `aws opensearchserverless`    | Avoid Algolia/Elasticsearch SaaS               |
| Scheduled cron        | **EventBridge Scheduler**    | `aws scheduler`               | Replace Vercel/Railway cron jobs               |

---

## Common CLI Patterns

### Secrets Manager — read secrets in app startup

```bash
# Store a secret
aws secretsmanager create-secret \
  --name "myapp/prod/database-url" \
  --secret-string '{"DATABASE_URL":"postgres://..."}'

# Read at deploy time (CI/CD)
DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id "myapp/prod/database-url" \
  --query SecretString \
  --output text | jq -r '.DATABASE_URL')
```

In Next.js, read via SDK at startup:

```typescript
// lib/secrets.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

export async function getSecret(
  secretId: string,
): Promise<Record<string, string>> {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  return JSON.parse(response.SecretString ?? "{}");
}
```

### S3 — file uploads from Next.js

```bash
# Create bucket
aws s3 mb s3://myapp-uploads-prod --region eu-west-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket myapp-uploads-prod \
  --versioning-configuration Status=Enabled

# Generate pre-signed upload URL (60 min expiry)
aws s3 presign s3://myapp-uploads-prod/file.pdf --expires-in 3600
```

Route Handler pattern:

```typescript
// app/api/upload-url/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const s3 = new S3Client({ region: process.env.AWS_REGION });

const RequestSchema = z.object({
  fileName: z.string().max(255),
  contentType: z.string(),
});

export async function POST(request: Request) {
  const { fileName, contentType } = RequestSchema.parse(await request.json());

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `uploads/${Date.now()}-${fileName}`,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return Response.json({ url });
}
```

### DynamoDB — single-table design

```bash
# Create table
aws dynamodb create-table \
  --table-name myapp-prod \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Put item
aws dynamodb put-item \
  --table-name myapp-prod \
  --item '{"PK":{"S":"USER#123"},"SK":{"S":"PROFILE"},"name":{"S":"Alice"}}'

# Query
aws dynamodb query \
  --table-name myapp-prod \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"USER#123"}}'
```

### SQS — queue background jobs

```bash
# Create FIFO queue
aws sqs create-queue \
  --queue-name myapp-jobs.fifo \
  --attributes FifoQueue=true,ContentBasedDeduplication=true

# Send message
aws sqs send-message \
  --queue-url https://sqs.eu-west-1.amazonaws.com/123456789/myapp-jobs.fifo \
  --message-body '{"type":"send-email","userId":"42"}' \
  --message-group-id "email"
```

Next.js Server Action sending to SQS:

```typescript
// app/actions/queue-job.ts
"use server";

import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { z } from "zod";

const sqs = new SQSClient({ region: process.env.AWS_REGION });

const JobSchema = z.object({ type: z.string(), userId: z.string() });

export async function queueJob(input: z.infer<typeof JobSchema>) {
  const job = JobSchema.parse(input);
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify(job),
      MessageGroupId: job.type,
    }),
  );
}
```

### EventBridge Scheduler — cron jobs

```bash
# Create a daily schedule (replaces Vercel cron)
aws scheduler create-schedule \
  --name "myapp-daily-report" \
  --schedule-expression "cron(0 8 * * ? *)" \
  --target '{"Arn":"arn:aws:lambda:eu-west-1:123:function:daily-report","RoleArn":"arn:aws:iam::123:role/scheduler-role"}' \
  --flexible-time-window '{"Mode":"OFF"}'
```

### Amazon Bedrock — AI text generation (replaces OpenAI)

```bash
# List available models
aws bedrock list-foundation-models --query 'modelSummaries[*].modelId'

# Invoke Claude via CLI (testing only)
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}' \
  --cli-binary-format raw-in-base64-out \
  output.json
```

SDK pattern:

```typescript
// lib/ai/bedrock.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export async function generateText(prompt: string): Promise<string> {
  const response = await client.send(
    new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    }),
  );

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
}
```

### SES — transactional email (replaces Resend/SendGrid)

```bash
# Verify a domain (one-time setup)
aws sesv2 create-email-identity --email-identity yourdomain.com

# Send email
aws sesv2 send-email \
  --from-email-address no-reply@yourdomain.com \
  --destination '{"ToAddresses":["user@example.com"]}' \
  --content '{"Simple":{"Subject":{"Data":"Welcome"},"Body":{"Text":{"Data":"Hello!"}}}}'
```

---

## SDK Installation

Install the AWS SDK v3 (modular — only install what you need):

```bash
# Core clients (add only what you use)
pnpm add @aws-sdk/client-s3
pnpm add @aws-sdk/s3-request-presigner
pnpm add @aws-sdk/client-dynamodb
pnpm add @aws-sdk/lib-dynamodb          # DynamoDB Document Client (easier API)
pnpm add @aws-sdk/client-sqs
pnpm add @aws-sdk/client-ses
pnpm add @aws-sdk/client-bedrock-runtime
pnpm add @aws-sdk/client-secrets-manager
pnpm add @aws-sdk/client-ssm
```

**SDK v3 design**: import individual service clients — never `import AWS from 'aws-sdk'` (v2; deprecated).

---

## Environment Variables

```bash
# .env.local (development — use IAM roles in production, never hardcode keys)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...        # dev only — use IAM role in Lambda/ECS/EC2
AWS_SECRET_ACCESS_KEY=...        # dev only

# Service-specific
S3_BUCKET_NAME=myapp-uploads-dev
SQS_QUEUE_URL=https://sqs.eu-west-1.amazonaws.com/123456789/myapp-jobs.fifo
DYNAMODB_TABLE_NAME=myapp-dev
```

**Production rule**: Never use `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in production. Assign an **IAM Role** to the Lambda/ECS task/EC2 instance and let the AWS SDK resolve credentials automatically via the instance metadata service.

---

## IAM Least-Privilege Pattern

```bash
# Create a role for your Next.js app (ECS/Lambda)
aws iam create-role \
  --role-name myapp-prod-role \
  --assume-role-policy-document file://trust-policy.json

# Attach only required permissions (example: S3 + SQS + Secrets)
aws iam put-role-policy \
  --role-name myapp-prod-role \
  --policy-name myapp-prod-policy \
  --policy-document file://app-policy.json
```

Minimal `app-policy.json` example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::myapp-uploads-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"],
      "Resource": "arn:aws:sqs:eu-west-1:*:myapp-jobs.fifo"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:eu-west-1:*:secret:myapp/prod/*"
    }
  ]
}
```

---

## Deploying Next.js on AWS

### Option 1: AWS App Runner (simplest — recommended for MVP)

```bash
aws apprunner create-service \
  --service-name myapp-prod \
  --source-configuration '{"CodeRepository":{"RepositoryUrl":"https://github.com/org/repo","SourceCodeVersion":{"Type":"BRANCH","Value":"main"},"CodeConfiguration":{"ConfigurationSource":"REPOSITORY"}}}' \
  --instance-configuration '{"Cpu":"1 vCPU","Memory":"2 GB"}'
```

### Option 2: ECS Fargate + ECR

```bash
# Build & push image
aws ecr get-login-password | docker login --username AWS --password-stdin <account_id>.dkr.ecr.eu-west-1.amazonaws.com
docker build -t myapp .
docker tag myapp:latest <account_id>.dkr.ecr.eu-west-1.amazonaws.com/myapp:latest
docker push <account_id>.dkr.ecr.eu-west-1.amazonaws.com/myapp:latest
```

### Option 3: Lambda + Lambda Web Adapter (serverless Next.js)

Use the [AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter) to run Next.js standalone output on Lambda.

---

## Observability

```bash
# Tail CloudWatch logs in real-time
aws logs tail /aws/lambda/my-function --follow

# Create a metric alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "high-error-rate" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --period 60 \
  --statistic Sum \
  --alarm-actions arn:aws:sns:eu-west-1:123:alerts
```

---

## Cheerio + AWS: Scraping Pipeline Pattern

Combine the `cheerio` skill with AWS for production-grade scraping:

```
EventBridge Scheduler → Lambda (Cheerio scraper) → SQS → Lambda (processor) → DynamoDB / S3
```

```typescript
// lambda/scraper.ts — invoked by EventBridge on schedule
import * as cheerio from "cheerio";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({});

export const handler = async () => {
  const $ = await cheerio.fromURL("https://target-site.com");

  const items = $.extract({
    products: [
      { selector: ".product", value: { name: "h2", price: ".price" } },
    ],
  });

  for (const product of items.products) {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify(product),
        MessageGroupId: "scraping",
      }),
    );
  }
};
```

---

## When NOT to use AWS

| Scenario                           | Better choice                         |
| ---------------------------------- | ------------------------------------- |
| Local dev database                 | Docker + Postgres / SQLite            |
| Prototype with no infra budget     | Vercel Postgres (Neon) for early MVPs |
| Fully managed auth with no backend | Auth.js (already in stack)            |
| Static site with no server         | Vercel/Netlify free tier              |

The goal is **pragmatism**: use AWS when you're moving past prototype and need reliability, compliance, or cost efficiency at scale.
