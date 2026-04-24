import { Module } from '@nestjs/common';
import { DataAccessModule } from '@dmaq/data-access';
import { AuthModule } from '@dmaq/auth';
import { AnalyticsService } from './lib/analytics.service';
import { AnalyticsController } from './lib/analytics.controller';

@Module({
  imports: [DataAccessModule, AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
