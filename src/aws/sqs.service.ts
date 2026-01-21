import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { retry } from '../common/retry.util';

export interface IndexMessage {
  type: string;
  entityType: 'show' | 'episode';
  entityId: string;
}

@Injectable()
export class SqsService {
  private sqsClient: SQSClient;
  private queueUrl: string;

  constructor(private configService: ConfigService) {
    this.sqsClient = new SQSClient({
      region: this.configService.get('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.queueUrl = this.configService.get('AWS_SQS_QUEUE_URL') || '';
  }

  async sendIndexMessage(message: IndexMessage): Promise<void> {
    if (!this.queueUrl) {
      console.warn('SQS queue URL not configured, skipping message send');
      return;
    }

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        EntityType: {
          DataType: 'String',
          StringValue: message.entityType,
        },
        EventType: {
          DataType: 'String',
          StringValue: message.type,
        },
      },
    });

    try {
      await retry(() => this.sqsClient.send(command), 3, 1000);
    } catch (error) {
      console.error('Failed to send SQS message after retries:', error);
      throw error;
    }
  }
}