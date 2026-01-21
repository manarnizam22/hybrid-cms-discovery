import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsModule } from './cms/cms.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { AwsModule } from './aws/aws.module';
import { SyncModule } from './sync/sync.module';
import { HealthModule } from './health/health.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { Show } from './cms/entities/show.entity';
import { Episode } from './cms/entities/episode.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req }) => ({ req }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'cms_db',
        entities: [Show, Episode],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    DatabaseModule,
    CacheModule,
    AwsModule,
    CmsModule,
    DiscoveryModule,
    SyncModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}