import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { TaskRepository } from '@dmaq/data-access';
import { TaskStatus } from '@dmaq/models';

const mockTaskRepository = {
  aggregateStatusCounts: jest.fn(),
  aggregatePerUserCounts: jest.fn(),
  aggregateAvgCompletionTime: jest.fn(),
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: TaskRepository, useValue: mockTaskRepository },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  it('should return analytics with correct status counts', async () => {
    mockTaskRepository.aggregateStatusCounts.mockResolvedValue([
      { _id: TaskStatus.TODO, count: 5 },
      { _id: TaskStatus.IN_PROGRESS, count: 3 },
      { _id: TaskStatus.DONE, count: 10 },
    ]);
    mockTaskRepository.aggregatePerUserCounts.mockResolvedValue([
      { _id: 'user1', email: 'alice@example.com', count: 7 },
      { _id: 'user2', email: 'bob@example.com', count: 11 },
    ]);
    mockTaskRepository.aggregateAvgCompletionTime.mockResolvedValue(2.5);

    const result = await service.getTaskAnalytics();

    expect(result.statusCounts[TaskStatus.TODO]).toBe(5);
    expect(result.statusCounts[TaskStatus.IN_PROGRESS]).toBe(3);
    expect(result.statusCounts[TaskStatus.DONE]).toBe(10);
    expect(result.avgCompletionTimeHours).toBe(2.5);
    expect(result.perUserTaskCounts).toHaveLength(2);
    expect(result.perUserTaskCounts[0].email).toBe('alice@example.com');
  });

  it('should default status counts to 0 when not present', async () => {
    mockTaskRepository.aggregateStatusCounts.mockResolvedValue([]);
    mockTaskRepository.aggregatePerUserCounts.mockResolvedValue([]);
    mockTaskRepository.aggregateAvgCompletionTime.mockResolvedValue(0);

    const result = await service.getTaskAnalytics();

    expect(result.statusCounts[TaskStatus.TODO]).toBe(0);
    expect(result.statusCounts[TaskStatus.IN_PROGRESS]).toBe(0);
    expect(result.statusCounts[TaskStatus.DONE]).toBe(0);
    expect(result.avgCompletionTimeHours).toBe(0);
    expect(result.perUserTaskCounts).toHaveLength(0);
  });
});
