import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-providers';
import { retry } from '../common/retry.util';

@Injectable()
export class OpenSearchService {
  private client: Client;
  private indexName: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get('AWS_REGION') || 'us-east-1';
    const endpoint = this.configService.get('OPENSEARCH_ENDPOINT') || '';

    this.client = new Client({
      ...AwsSigv4Signer({
        region,
        getCredentials: () => {
          const credentialsProvider = defaultProvider();
          return credentialsProvider();
        },
      }),
      node: endpoint,
    });

    this.indexName = this.configService.get('OPENSEARCH_INDEX_NAME') || 'cms_content';
    this.initializeIndex();
  }

  private async initializeIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                entityType: { type: 'keyword' },
                title: { type: 'text', analyzer: 'standard' },
                description: { type: 'text', analyzer: 'standard' },
                category: { type: 'keyword' },
                language: { type: 'keyword' },
                duration: { type: 'integer' },
                showId: { type: 'keyword' },
                episodeNumber: { type: 'integer' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
      }
    } catch (error) {
      console.error('Failed to initialize OpenSearch index:', error);
    }
  }

  async indexDocument(document: any): Promise<void> {
    try {
      await retry(
        () =>
          this.client.index({
            index: this.indexName,
            id: `${document.entityType}_${document.id}`,
            body: document,
            refresh: true,
          }),
        3,
        1000,
      );
    } catch (error) {
      console.error('Failed to index document after retries:', error);
      throw error;
    }
  }

  async deleteDocument(entityType: string, id: string): Promise<void> {
    try {
      await retry(
        () =>
          this.client.delete({
            index: this.indexName,
            id: `${entityType}_${id}`,
          }),
        3,
        1000,
      );
    } catch (error) {
      console.error('Failed to delete document after retries:', error);
      throw error;
    }
  }

  async search(query: string, filters?: {
    category?: string;
    language?: string;
    minDuration?: number;
    maxDuration?: number;
  }): Promise<any[]> {
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

    try {
      const response = await this.client.search({
        index: this.indexName,
        body: searchBody,
      });

      return response.body.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }
}