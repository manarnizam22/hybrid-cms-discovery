import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsService } from './cms.service';
import { CmsController } from './cms.controller';
import { ShowResolver, EpisodeResolver } from './cms.resolver';
import { Show } from './entities/show.entity';
import { Episode } from './entities/episode.entity';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Show, Episode]),
    AwsModule,
  ],
  controllers: [CmsController],
  providers: [CmsService, ShowResolver, EpisodeResolver],
  exports: [CmsService],
})
export class CmsModule {}