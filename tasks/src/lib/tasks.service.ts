import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TaskRepository, TaskFilter } from '@dmaq/data-access';
import { CreateTaskDto, UpdateTaskDto, Role, TaskStatus } from '@dmaq/models';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TaskRepository,
    @InjectQueue('task-reminders') private readonly reminderQueue: Queue,
  ) {}

  async create(dto: CreateTaskDto, userId: string) {
    const task = await this.taskRepository.create({
      title: dto.title,
      description: dto.description,
      status: dto.status ?? TaskStatus.TODO,
      userId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    // Queue a reminder job (fires after 1 hour by default)
    await this.reminderQueue.add(
      'remind',
      { taskId: (task as any)._id.toString(), userId, title: task.title },
      { delay: 3600000, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    return task;
  }

  async findAll(
    filter: TaskFilter & { userRole: string; requesterId: string },
  ) {
    const { userRole, requesterId, ...rest } = filter;
    // USER can only see own tasks
    if (userRole !== Role.ADMIN) {
      rest.userId = requesterId;
    }
    return this.taskRepository.findAll(rest);
  }

  async findOne(id: string, requesterId: string, userRole: string) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException(`Task "${id}" not found`);
    this.assertOwnerOrAdmin(task, requesterId, userRole);
    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    requesterId: string,
    userRole: string,
  ) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException(`Task "${id}" not found`);
    this.assertOwnerOrAdmin(task, requesterId, userRole);

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData['title'] = dto.title;
    if (dto.description !== undefined) updateData['description'] = dto.description;
    if (dto.status !== undefined) updateData['status'] = dto.status;
    if (dto.dueDate !== undefined) updateData['dueDate'] = new Date(dto.dueDate);
    if (dto.completedAt !== undefined) updateData['completedAt'] = new Date(dto.completedAt);

    return this.taskRepository.update(id, updateData as any);
  }

  async remove(id: string, requesterId: string, userRole: string) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException(`Task "${id}" not found`);
    this.assertOwnerOrAdmin(task, requesterId, userRole);
    return this.taskRepository.delete(id);
  }

  private assertOwnerOrAdmin(
    task: { userId: unknown },
    requesterId: string,
    userRole: string,
  ): void {
    if (userRole === Role.ADMIN) return;
    if (task.userId?.toString() !== requesterId) {
      throw new ForbiddenException('You do not own this task');
    }
  }
}
