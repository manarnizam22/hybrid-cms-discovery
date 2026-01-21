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

async function searchOpenSearch(
  query: string,
  filters: {
    category?: string;
    language?: string;
    minDuration?: number;
    maxDuration?: number;
  },
): Promise<any[]> {
  const client = getOpenSearchClient();
  const indexName = process.env.OPENSEARCH_INDEX_NAME || 'cms_content';

  const mustQueries: any[] = [];

  if (query) {
    mustQueries.push({
      multi_match: {
        query,
        fields: ['title^3', 'description'],
        fuzziness: 'AUTO',
      },
    });
  }

  const filterQueries: any[] = [];

  if (filters?.category) {
    filterQueries.push({ term: { category: filters.category } });
  }

  if (filters?.language) {
    filterQueries.push({ term: { language: filters.language } });
  }

  if (filters?.minDuration || filters?.maxDuration) {
    const range: any = {};
    if (filters.minDuration) range.gte = filters.minDuration;
    if (filters.maxDuration) range.lte = filters.maxDuration;
    filterQueries.push({ range: { duration: range } });
  }

  const searchBody: any = {
    query: {
      bool: {
        must: mustQueries.length > 0 ? mustQueries : [{ match_all: {} }],
        filter: filterQueries,
      },
    },
    size: 50,
  };

  const response = await client.search({
    index: indexName,
    body: searchBody,
  });

  return response.body.hits.hits.map((hit: any) => hit._source);
}

function buildCacheKey(query: string, filters?: any): string {
  const filterStr = filters
    ? Object.entries(filters)
        .sort()
        .map(([k, v]) => `${k}:${v}`)
        .join('|')
    : '';
  return `search:${query}:${filterStr}`;
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const query = event.queryStringParameters?.q || '';
    const category = event.queryStringParameters?.category;
    const language = event.queryStringParameters?.language;
    const minDuration = event.queryStringParameters?.minDuration
      ? parseInt(event.queryStringParameters.minDuration)
      : undefined;
    const maxDuration = event.queryStringParameters?.maxDuration
      ? parseInt(event.queryStringParameters.maxDuration)
      : undefined;

    const filters = {
      category,
      language,
      minDuration,
      maxDuration,
    };

    const cacheKey = buildCacheKey(query, filters);
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

    const results = await searchOpenSearch(query, filters);

    try {
      await redis.setex(cacheKey, 300, JSON.stringify(results));
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
    console.error('Search error:', error);
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