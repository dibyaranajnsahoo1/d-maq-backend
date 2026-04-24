import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { TasksService } from './tasks.service';
import { TaskRepository } from '@dmaq/data-access';
import { Role, TaskStatus } from '@dmaq/models';

const mockTask = {
  _id: { toString: () => 'task-id-1' },
  title: 'Test Task',
  description: 'A test',
  status: TaskStatus.TODO,
  userId: { toString: () => 'user-id-1' },
  createdAt: new Date('2025-01-01'),
};

const mockTaskRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockReminderQueue = {
  add: jest.fn().mockResolvedValue({}),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TaskRepository, useValue: mockTaskRepository },
        { provide: getQueueToken('task-reminders'), useValue: mockReminderQueue },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task and queue a reminder', async () => {
      mockTaskRepository.create.mockResolvedValue(mockTask);

      const result = await service.create(
        { title: 'Test Task', description: 'A test' },
        'user-id-1',
      );

      expect(result).toEqual(mockTask);
      expect(mockReminderQueue.add).toHaveBeenCalledWith(
        'remind',
        expect.objectContaining({ userId: 'user-id-1', title: 'Test Task' }),
        expect.any(Object),
      );
    });
  });

  describe('findAll', () => {
    it('should restrict USER to own tasks', async () => {
      const paginatedResult = { data: [mockTask], total: 1, page: 1, limit: 10, totalPages: 1 };
      mockTaskRepository.findAll.mockResolvedValue(paginatedResult);

      await service.findAll({
        userRole: Role.USER,
        requesterId: 'user-id-1',
        page: 1,
        limit: 10,
      });

      expect(mockTaskRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id-1' }),
      );
    });

    it('should allow ADMIN to see all tasks without userId filter', async () => {
      const paginatedResult = { data: [mockTask], total: 1, page: 1, limit: 10, totalPages: 1 };
      mockTaskRepository.findAll.mockResolvedValue(paginatedResult);

      await service.findAll({
        userRole: Role.ADMIN,
        requesterId: 'admin-id',
        page: 1,
        limit: 10,
      });

      expect(mockTaskRepository.findAll).toHaveBeenCalledWith(
        expect.not.objectContaining({ userId: 'admin-id' }),
      );
    });
  });

  describe('update', () => {
    it('should update task when requester is owner', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });

      const result = await service.update(
        'task-id-1',
        { status: TaskStatus.IN_PROGRESS },
        'user-id-1',
        Role.USER,
      );

      expect(result?.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should throw ForbiddenException when non-owner tries to update', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      await expect(
        service.update('task-id-1', { status: TaskStatus.DONE }, 'other-user', Role.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'X' }, 'user-id-1', Role.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow ADMIN to update any task', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockResolvedValue({ ...mockTask, title: 'Updated' });

      const result = await service.update(
        'task-id-1',
        { title: 'Updated' },
        'different-admin-id',
        Role.ADMIN,
      );

      expect(result?.title).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete task when requester is owner', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue(mockTask);

      await service.remove('task-id-1', 'user-id-1', Role.USER);
      expect(mockTaskRepository.delete).toHaveBeenCalledWith('task-id-1');
    });

    it('should throw ForbiddenException when non-owner tries to delete', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      await expect(
        service.remove('task-id-1', 'other-user', Role.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
