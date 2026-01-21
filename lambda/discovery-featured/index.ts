import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-providers';
import Redis from 'ioredis';

let opensearchClient: Client;
let redisClient: Redis;

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

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit)
      : 10;

    const cacheKey = `featured:${limit}`;
    const redis = getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(JSON.parse(cached)),
        };
      }
    } catch (error) {
      console.error('Redis cache error:', error);
    }

    const client = getOpenSearchClient();
    const indexName = process.env.OPENSEARCH_INDEX_NAME || 'cms_content';

    const response = await client.search({
      index: indexName,
      body: {
        query: { match_all: {} },
        size: limit,
        sort: [{ createdAt: { order: 'desc' } }],
      },
    });

    const results = response.body.hits.hits.map((hit: any) => hit._source);

    try {
      await redis.setex(cacheKey, 600, JSON.stringify(results));
    } catch (error) {
      console.error('Redis cache set error:', error);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(results),
    };
  } catch (error: any) {
    console.error('Featured content error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};