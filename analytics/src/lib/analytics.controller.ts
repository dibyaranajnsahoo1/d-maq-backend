import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '@dmaq/auth';
import { Role } from '@dmaq/models';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('tasks')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get task analytics (Admin only)' })
  @ApiResponse({
    status: 200,
    description:
      'Returns task counts per status, avg completion time, and per-user counts',
  })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  getTaskAnalytics() {
    return this.analyticsService.getTaskAnalytics();
  }
}
