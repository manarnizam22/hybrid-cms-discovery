import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CmsService } from './cms.service';
import { Show, CreateShowInput, UpdateShowInput } from './entities/show.entity';
import { Episode, CreateEpisodeInput, UpdateEpisodeInput } from './entities/episode.entity';

@Resolver(() => Show)
export class ShowResolver {
  constructor(private readonly cmsService: CmsService) {}

  @Mutation(() => Show)
  async createShow(@Args('input') input: CreateShowInput): Promise<Show> {
    return this.cmsService.createShow(input);
  }

  @Mutation(() => Show)
  async updateShow(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateShowInput,
  ): Promise<Show> {
    return this.cmsService.updateShow(id, input);
  }

  @Mutation(() => Boolean)
  async deleteShow(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.cmsService.deleteShow(id);
  }

  @Query(() => Show)
  async show(@Args('id', { type: () => ID }) id: string): Promise<Show> {
    return this.cmsService.getShow(id);
  }

  @Query(() => [Show])
  async shows(): Promise<Show[]> {
    return this.cmsService.getAllShows();
  }
}

@Resolver(() => Episode)
export class EpisodeResolver {
  constructor(private readonly cmsService: CmsService) {}

  @Mutation(() => Episode)
  async createEpisode(@Args('input') input: CreateEpisodeInput): Promise<Episode> {
    return this.cmsService.createEpisode(input);
  }

  @Mutation(() => Episode)
  async updateEpisode(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateEpisodeInput,
  ): Promise<Episode> {
    return this.cmsService.updateEpisode(id, input);
  }

  @Mutation(() => Boolean)
  async deleteEpisode(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.cmsService.deleteEpisode(id);
  }

  @Query(() => Episode)
  async episode(@Args('id', { type: () => ID }) id: string): Promise<Episode> {
    return this.cmsService.getEpisode(id);
  }

  @Query(() => [Episode])
  async episodes(@Args('showId', { type: () => ID }) showId: string): Promise<Episode[]> {
    return this.cmsService.getEpisodesByShow(showId);
  }
}