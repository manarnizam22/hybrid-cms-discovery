import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-providers';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Redis from 'ioredis';

let opensearchClient: Client;
let s3Client: S3Client;
let redisClient: Redis;

interface IndexMessage {
  type: string;
  entityType: 'show' | 'episode';
  entityId: string;
}

function getOpenSearchClient(): Client {
  if (!opensearchClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.OPENSEARCH_ENDPOINT || '';

    opensearchClient = new Client({
      ...AwsSigv4Signer({
        region,
        getCredentials: () => {
          const credentialsProvider = defaultProvider();
          return credentialsProvider();
        },
      }),
      node: endpoint,
    });
  }
  return opensearchClient;
}

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return s3Client;
}

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });
  }
  return redisClient;
}

async function processMessage(message: IndexMessage): Promise<void> {
  const client = getOpenSearchClient();
  const indexName = process.env.OPENSEARCH_INDEX_NAME || 'cms_content';

  switch (message.type) {
    case 'SHOW_DELETED':
    case 'EPISODE_DELETED':
      await client.delete({
        index: indexName,
        id: `${message.entityType}_${message.entityId}`,
      });
      const redis = getRedisClient();
      await redis.del('search:*');
      break;
    case 'SHOW_CREATED':
    case 'SHOW_UPDATED':
    case 'EPISODE_CREATED':
    case 'EPISODE_UPDATED':
      const dbUrl = process.env.DATABASE_URL || '';
      if (dbUrl) {
        const entity = await fetchEntityFromDatabase(message.entityType, message.entityId);
        if (entity) {
          const document = transformEntityToDocument(message.entityType, entity);
          await client.index({
            index: indexName,
            id: `${message.entityType}_${message.entityId}`,
            body: document,
            refresh: true,
          });
          const redis = getRedisClient();
          await redis.del('search:*');
        }
      }
      break;
  }
}

async function fetchEntityFromDatabase(
  entityType: string,
  entityId: string,
): Promise<any> {
  return null;
}

function transformEntityToDocument(entityType: string, entity: any): any {
  return entity;
}

export const handler = async (
  event: SQSEvent,
  context: Context,
): Promise<void> => {
  for (const record of event.Records) {
    try {
      const message: IndexMessage = JSON.parse(record.body);
      await processMessage(message);
    } catch (error) {
      console.error('Failed to process SQS record:', error);
      throw error;
    }
  }
};