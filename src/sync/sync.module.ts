import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { SqsProcessorController } from './sqs-processor.controller';
import { Show } from '../cms/entities/show.entity';
import { Episode } from '../cms/entities/episode.entity';
import { AwsModule } from '../aws/aws.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Show, Episode]),
    AwsModule,
    CacheModule,
  ],
  controllers: [SqsProcessorController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}