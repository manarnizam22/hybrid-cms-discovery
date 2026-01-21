import { Injectable } from '@nestjs/common';
import { OpenSearchService } from '../aws/opensearch.service';
import { CacheService } from '../cache/cache.service';

export interface SearchFilters {
  category?: string;
  language?: string;
  minDuration?: number;
  maxDuration?: number;
}

@Injectable()
export class DiscoveryService {
  constructor(
    private openSearchService: OpenSearchService,
    private cacheService: CacheService,
  ) {}

  async search(query: string, filters?: SearchFilters): Promise<any[]> {
    const cacheKey = this.buildCacheKey(query, filters);
    
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.openSearchService.search(query, filters);
    
    await this.cacheService.set(cacheKey, results, 300);

    return results;
  }

  async getFeaturedContent(limit: number = 10): Promise<any[]> {
    const cacheKey = `featured:${limit}`;
    
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.openSearchService.search('', {});
    const featured = results.slice(0, limit);
    
    await this.cacheService.set(cacheKey, featured, 600);

    return featured;
  }

  private buildCacheKey(query: string, filters?: SearchFilters): string {
    const filterStr = filters
      ? Object.entries(filters)
          .sort()
          .map(([k, v]) => `${k}:${v}`)
          .join('|')
      : '';
    return `search:${query}:${filterStr}`;
  }
}