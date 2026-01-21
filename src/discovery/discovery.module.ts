import { Module } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { AwsModule } from '../aws/aws.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [AwsModule, CacheModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}