import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from '@dmaq/models';

export interface TaskFilter {
  userId?: string;
  status?: TaskStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedTasks {
  data: TaskDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class TaskRepository {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async create(data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    userId: string;
    dueDate?: Date;
  }): Promise<TaskDocument> {
    const task = new this.taskModel({
      ...data,
      userId: new Types.ObjectId(data.userId),
    });
    return task.save();
  }

  async findAll(filter: TaskFilter): Promise<PaginatedTasks> {
    const { userId, status, page = 1, limit = 10 } = filter;
    const query: Record<string, unknown> = {};

    if (userId) query.userId = new Types.ObjectId(userId);
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.taskModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.taskModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<TaskDocument | null> {
    return this.taskModel.findById(id).exec();
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      completedAt: Date;
      dueDate: Date;
    }>,
  ): Promise<TaskDocument | null> {
    // Auto-set completedAt when status changes to DONE
    if (data.status === TaskStatus.DONE && !data.completedAt) {
      data.completedAt = new Date();
    }
    return this.taskModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<TaskDocument | null> {
    return this.taskModel.findByIdAndDelete(id).exec();
  }

  async aggregateStatusCounts(): Promise<{ _id: TaskStatus; count: number }[]> {
    return this.taskModel
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .exec();
  }

  async aggregatePerUserCounts(): Promise<{ _id: string; count: number }[]> {
    return this.taskModel
      .aggregate([
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $project: {
            count: 1,
            email: { $arrayElemAt: ['$user.email', 0] },
          },
        },
      ])
      .exec();
  }

  async aggregateAvgCompletionTime(): Promise<number> {
    const result = await this.taskModel
      .aggregate([
        {
          $match: {
            status: TaskStatus.DONE,
            completedAt: { $ne: null },
          },
        },
        {
          $project: {
            diff: {
              $subtract: ['$completedAt', '$createdAt'],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgMs: { $avg: '$diff' },
          },
        },
      ])
      .exec();

    if (result.length === 0) return 0;
    // Return in hours
    return Math.round(result[0].avgMs / (1000 * 60 * 60) * 100) / 100;
  }
}
