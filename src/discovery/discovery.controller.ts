import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('search')
  async search(
    @Query('q') query: string = '',
    @Query('category') category?: string,
    @Query('language') language?: string,
    @Query('minDuration') minDuration?: number,
    @Query('maxDuration') maxDuration?: number,
  ) {
    const filters = {
      category,
      language,
      minDuration: minDuration ? parseInt(minDuration.toString()) : undefined,
      maxDuration: maxDuration ? parseInt(maxDuration.toString()) : undefined,
    };

    return this.discoveryService.search(query, filters);
  }

  @Get('featured')
  async getFeatured(@Query('limit') limit?: number) {
    const limitNum = limit ? parseInt(limit.toString()) : 10;
    return this.discoveryService.getFeaturedContent(limitNum);
  }
}