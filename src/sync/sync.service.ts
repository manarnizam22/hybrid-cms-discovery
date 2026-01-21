import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Show } from '../cms/entities/show.entity';
import { Episode } from '../cms/entities/episode.entity';
import { OpenSearchService } from '../aws/opensearch.service';
import { SqsService, IndexMessage } from '../aws/sqs.service';
import { CacheService } from '../cache/cache.service';
import { retry } from '../common/retry.util';
import listen from 'pg-listen';

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private pgListener: any;

  constructor(
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    private openSearchService: OpenSearchService,
    private sqsService: SqsService,
    private cacheService: CacheService,
  ) {}

  async onModuleInit() {
    await this.setupChangeDataCapture();
  }

  async onModuleDestroy() {
    if (this.pgListener) {
      await this.pgListener.close();
    }
  }

  private async setupChangeDataCapture(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    try {
      this.pgListener = listen({ connectionString: dbUrl });

      this.pgListener.notifications.on('show_changes', async (payload: any) => {
        await this.handleShowChange(payload);
      });

      this.pgListener.notifications.on('episode_changes', async (payload: any) => {
        await this.handleEpisodeChange(payload);
      });

      await this.pgListener.connect();
      await this.pgListener.listenTo('show_changes');
      await this.pgListener.listenTo('episode_changes');

      console.log('CDC listener initialized');
    } catch (error) {
      console.error('Failed to setup CDC:', error);
    }
  }

  async processSqsMessage(message: IndexMessage): Promise<void> {
    try {
      await retry(async () => {
        switch (message.type) {
          case 'SHOW_CREATED':
          case 'SHOW_UPDATED':
            await this.syncShowToOpenSearch(message.entityId);
            break;
          case 'SHOW_DELETED':
            await this.openSearchService.deleteDocument('show', message.entityId);
            await this.cacheService.invalidateSearchCache();
            break;
          case 'EPISODE_CREATED':
          case 'EPISODE_UPDATED':
            await this.syncEpisodeToOpenSearch(message.entityId);
            break;
          case 'EPISODE_DELETED':
            await this.openSearchService.deleteDocument('episode', message.entityId);
            await this.cacheService.invalidateSearchCache();
            break;
        }
      }, 3, 1000);
    } catch (error) {
      console.error(`Failed to process SQS message ${message.type} after retries:`, error);
      throw error;
    }
  }

  private async handleShowChange(payload: any): Promise<void> {
    const { operation, id } = JSON.parse(payload);
    
    if (operation === 'DELETE') {
      await this.openSearchService.deleteDocument('show', id);
    } else {
      await this.syncShowToOpenSearch(id);
    }
    
    await this.cacheService.invalidateSearchCache();
  }

  private async handleEpisodeChange(payload: any): Promise<void> {
    const { operation, id } = JSON.parse(payload);
    
    if (operation === 'DELETE') {
      await this.openSearchService.deleteDocument('episode', id);
    } else {
      await this.syncEpisodeToOpenSearch(id);
    }
    
    await this.cacheService.invalidateSearchCache();
  }

  private async syncShowToOpenSearch(showId: string): Promise<void> {
    const show = await this.showRepository.findOne({ where: { id: showId } });
    if (!show) return;

    const document = {
      id: show.id,
      entityType: 'show',
      title: show.title,
      description: show.description || '',
      category: show.category,
      language: show.language,
      createdAt: show.createdAt,
    };

    await this.openSearchService.indexDocument(document);
  }

  private async syncEpisodeToOpenSearch(episodeId: string): Promise<void> {
    const episode = await this.episodeRepository.findOne({
      where: { id: episodeId },
      relations: ['show'],
    });
    if (!episode) return;

    const document = {
      id: episode.id,
      entityType: 'episode',
      title: episode.title,
      description: episode.description || '',
      category: episode.show.category,
      language: episode.show.language,
      duration: episode.duration,
      showId: episode.showId,
      episodeNumber: episode.episodeNumber,
      createdAt: episode.createdAt,
    };

    await this.openSearchService.indexDocument(document);
  }

  async syncAllToOpenSearch(): Promise<void> {
    const shows = await this.showRepository.find();
    for (const show of shows) {
      await this.syncShowToOpenSearch(show.id);
    }

    const episodes = await this.episodeRepository.find({ relations: ['show'] });
    for (const episode of episodes) {
      await this.syncEpisodeToOpenSearch(episode.id);
    }
  }
}