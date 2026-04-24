import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from '@dmaq/auth';
import { UsersModule } from '@dmaq/users';
import { TasksModule } from '@dmaq/tasks';
import { AnalyticsModule } from '@dmaq/analytics';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Config (load .env)
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB / Cosmos DB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGO_URI') ??
          'mongodb://localhost:27017/tasksdb',
        retryWrites: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      }),
    }),

    // Rate limiting: 100 requests / 60 seconds per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Bull / Redis for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST') ?? 'localhost',
          port: configService.get<number>('REDIS_PORT') ?? 6379,
        },
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    TasksModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
