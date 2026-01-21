import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { SqsService } from './sqs.service';
import { OpenSearchService } from './opensearch.service';

@Module({
  providers: [S3Service, SqsService, OpenSearchService],
  exports: [S3Service, SqsService, OpenSearchService],
})
export class AwsModule {}