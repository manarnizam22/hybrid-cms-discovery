import { Controller, Post, Body, Headers } from '@nestjs/common';
import { SyncService } from './sync.service';
import { IndexMessage } from '../aws/sqs.service';

@Controller('sqs-processor')
export class SqsProcessorController {
  constructor(private readonly syncService: SyncService) {}

  @Post('process')
  async processMessage(
    @Body() body: { Records: any[] },
    @Headers('x-aws-sqsd-msgid') messageId?: string,
  ) {
    const records = body.Records || [];
    
    for (const record of records) {
      try {
        const message: IndexMessage = JSON.parse(record.body);
        await this.syncService.processSqsMessage(message);
      } catch (error) {
        console.error('Failed to process SQS record:', error);
        throw error;
      }
    }

    return { status: 'processed', count: records.length };
  }
}