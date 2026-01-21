import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Show, CreateShowInput, UpdateShowInput } from './entities/show.entity';
import { Episode, CreateEpisodeInput, UpdateEpisodeInput } from './entities/episode.entity';
import { S3Service } from '../aws/s3.service';
import { SqsService } from '../aws/sqs.service';

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    private s3Service: S3Service,
    private sqsService: SqsService,
  ) {}

  async createShow(input: CreateShowInput): Promise<Show> {
    const show = this.showRepository.create(input);
    const savedShow = await this.showRepository.save(show);
    
    await this.sqsService.sendIndexMessage({
      type: 'SHOW_CREATED',
      entityType: 'show',
      entityId: savedShow.id,
    });

    return savedShow;
  }

  async updateShow(id: string, input: UpdateShowInput): Promise<Show> {
    const show = await this.showRepository.findOne({ where: { id } });
    if (!show) {
      throw new NotFoundException(`Show with ID ${id} not found`);
    }

    Object.assign(show, input);
    const updatedShow = await this.showRepository.save(show);

    await this.sqsService.sendIndexMessage({
      type: 'SHOW_UPDATED',
      entityType: 'show',
      entityId: updatedShow.id,
    });

    return updatedShow;
  }

  async deleteShow(id: string): Promise<boolean> {
    const result = await this.showRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Show with ID ${id} not found`);
    }

    await this.sqsService.sendIndexMessage({
      type: 'SHOW_DELETED',
      entityType: 'show',
      entityId: id,
    });

    return true;
  }

  async getShow(id: string): Promise<Show> {
    const show = await this.showRepository.findOne({
      where: { id },
      relations: ['episodes'],
    });
    if (!show) {
      throw new NotFoundException(`Show with ID ${id} not found`);
    }
    return show;
  }

  async getAllShows(): Promise<Show[]> {
    return this.showRepository.find({
      relations: ['episodes'],
      order: { createdAt: 'DESC' },
    });
  }

  async createEpisode(input: CreateEpisodeInput): Promise<Episode> {
    const show = await this.showRepository.findOne({ where: { id: input.showId } });
    if (!show) {
      throw new NotFoundException(`Show with ID ${input.showId} not found`);
    }

    const episode = this.episodeRepository.create(input);
    const savedEpisode = await this.episodeRepository.save(episode);

    await this.sqsService.sendIndexMessage({
      type: 'EPISODE_CREATED',
      entityType: 'episode',
      entityId: savedEpisode.id,
    });

    return savedEpisode;
  }

  async updateEpisode(id: string, input: UpdateEpisodeInput): Promise<Episode> {
    const episode = await this.episodeRepository.findOne({ where: { id } });
    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    Object.assign(episode, input);
    const updatedEpisode = await this.episodeRepository.save(episode);

    await this.sqsService.sendIndexMessage({
      type: 'EPISODE_UPDATED',
      entityType: 'episode',
      entityId: updatedEpisode.id,
    });

    return updatedEpisode;
  }

  async deleteEpisode(id: string): Promise<boolean> {
    const result = await this.episodeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    await this.sqsService.sendIndexMessage({
      type: 'EPISODE_DELETED',
      entityType: 'episode',
      entityId: id,
    });

    return true;
  }

  async getEpisode(id: string): Promise<Episode> {
    const episode = await this.episodeRepository.findOne({
      where: { id },
      relations: ['show'],
    });
    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }
    return episode;
  }

  async getEpisodesByShow(showId: string): Promise<Episode[]> {
    return this.episodeRepository.find({
      where: { showId },
      order: { episodeNumber: 'ASC' },
    });
  }

  async uploadMedia(file: Express.Multer.File, folder: string): Promise<string> {
    return this.s3Service.uploadFile(file, folder);
  }
}