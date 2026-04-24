import { Injectable } from '@nestjs/common';
import { TaskRepository } from '@dmaq/data-access';
import { TaskStatus } from '@dmaq/models';

export interface AnalyticsResult {
  statusCounts: Record<TaskStatus, number>;
  avgCompletionTimeHours: number;
  perUserTaskCounts: { email: string; count: number }[];
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly taskRepository: TaskRepository) {}

  async getTaskAnalytics(): Promise<AnalyticsResult> {
    const [rawStatusCounts, rawUserCounts, avgCompletionTimeHours] =
      await Promise.all([
        this.taskRepository.aggregateStatusCounts(),
        this.taskRepository.aggregatePerUserCounts(),
        this.taskRepository.aggregateAvgCompletionTime(),
      ]);

    const statusCounts: Record<string, number> = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.DONE]: 0,
    };
    for (const item of rawStatusCounts) {
      statusCounts[item._id] = item.count;
    }

    const perUserTaskCounts = rawUserCounts.map((u) => ({
      email: (u as any).email ?? 'unknown',
      userId: u._id,
      count: u.count,
    }));

    return {
      statusCounts: statusCounts as Record<TaskStatus, number>,
      avgCompletionTimeHours,
      perUserTaskCounts,
    };
  }
}
