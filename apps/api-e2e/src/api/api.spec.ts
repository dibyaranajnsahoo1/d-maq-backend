import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import axios, { AxiosInstance } from 'axios';
import { getQueueToken } from '@nestjs/bull';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AuthController, AuthService, JwtAuthGuard, JwtStrategy, RolesGuard } from '@dmaq/auth';
import { AnalyticsController, AnalyticsService } from '@dmaq/analytics';
import { TaskRepository, UserRepository } from '@dmaq/data-access';
import { Role, TaskStatus } from '@dmaq/models';
import { TasksController, TasksService } from '@dmaq/tasks';
import { AllExceptionsFilter } from '@dmaq/utils';

type StoredUser = {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
};

type StoredTask = {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  dueDate?: Date | null;
};

class InMemoryUserRepository {
  private readonly users: StoredUser[] = [];

  async create(data: { email: string; passwordHash: string; role?: Role }) {
    const user = {
      _id: new Types.ObjectId(),
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      role: data.role ?? Role.USER,
    };
    this.users.push(user);
    return user;
  }

  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email.toLowerCase()) ?? null;
  }

  async findById(id: string) {
    return this.users.find((user) => user._id.toString() === id) ?? null;
  }
}

class InMemoryTaskRepository {
  private readonly tasks: StoredTask[] = [];

  constructor(private readonly userRepository: InMemoryUserRepository) {}

  async create(data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    userId: string;
    dueDate?: Date;
  }) {
    const now = new Date();
    const task = {
      _id: new Types.ObjectId(),
      title: data.title,
      description: data.description,
      status: data.status ?? TaskStatus.TODO,
      userId: new Types.ObjectId(data.userId),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      dueDate: data.dueDate ?? null,
    };
    this.tasks.push(task);
    return task;
  }

  async findAll(filter: {
    userId?: string;
    status?: TaskStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const filtered = this.tasks.filter((task) => {
      const userMatch = !filter.userId || task.userId.toString() === filter.userId;
      const statusMatch = !filter.status || task.status === filter.status;
      return userMatch && statusMatch;
    });
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async findById(id: string) {
    return this.tasks.find((task) => task._id.toString() === id) ?? null;
  }

  async update(id: string, data: Partial<StoredTask>) {
    const task = await this.findById(id);
    if (!task) return null;
    Object.assign(task, data, { updatedAt: new Date() });
    if (data.status === TaskStatus.DONE && !task.completedAt) {
      task.completedAt = new Date();
    }
    return task;
  }

  async delete(id: string) {
    const index = this.tasks.findIndex((task) => task._id.toString() === id);
    if (index === -1) return null;
    return this.tasks.splice(index, 1)[0];
  }

  async aggregateStatusCounts() {
    return Object.values(TaskStatus).map((status) => ({
      _id: status,
      count: this.tasks.filter((task) => task.status === status).length,
    }));
  }

  async aggregatePerUserCounts() {
    return Promise.all(
      [...new Set(this.tasks.map((task) => task.userId.toString()))].map(
        async (userId) => {
          const user = await this.userRepository.findById(userId);
          return {
            _id: userId,
            email: user?.email,
            count: this.tasks.filter((task) => task.userId.toString() === userId)
              .length,
          };
        },
      ),
    );
  }

  async aggregateAvgCompletionTime() {
    const completed = this.tasks.filter(
      (task) => task.status === TaskStatus.DONE && task.completedAt,
    );
    if (completed.length === 0) return 0;
    const avgMs =
      completed.reduce(
        (sum, task) =>
          sum + (task.completedAt?.getTime() ?? 0) - task.createdAt.getTime(),
        0,
      ) / completed.length;
    return Math.round((avgMs / (1000 * 60 * 60)) * 100) / 100;
  }
}

describe('Task Management API', () => {
  let app: INestApplication;
  let client: AxiosInstance;
  let users: InMemoryUserRepository;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'integration-test-secret';
    users = new InMemoryUserRepository();
    const tasks = new InMemoryTaskRepository(users);

    await users.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: Role.ADMIN,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'integration-test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController, TasksController, AnalyticsController],
      providers: [
        AuthService,
        TasksService,
        AnalyticsService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UserRepository, useValue: users },
        { provide: TaskRepository, useValue: tasks },
        { provide: getQueueToken('task-reminders'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 3000 : address.port;
    client = axios.create({
      baseURL: `http://127.0.0.1:${port}`,
      validateStatus: () => true,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, enforces ownership, and exposes admin analytics', async () => {
    const registered = await client.post('/auth/register', {
      email: 'user@example.com',
      password: 'password123',
    });
    expect(registered.status).toBe(201);

    const duplicate = await client.post('/auth/register', {
      email: 'user@example.com',
      password: 'password123',
    });
    expect(duplicate.status).toBe(409);

    const userLogin = await client.post('/auth/login', {
      email: 'user@example.com',
      password: 'password123',
    });
    const adminLogin = await client.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123',
    });
    expect(userLogin.status).toBe(200);
    expect(adminLogin.status).toBe(200);

    const userAuth = {
      Authorization: `Bearer ${userLogin.data.access_token}`,
    };
    const adminAuth = {
      Authorization: `Bearer ${adminLogin.data.access_token}`,
    };

    const created = await client.post(
      '/tasks',
      { title: 'Ship assignment', status: TaskStatus.TODO },
      { headers: userAuth },
    );
    const adminTask = await client.post(
      '/tasks',
      { title: 'Admin-only task', status: TaskStatus.IN_PROGRESS },
      { headers: adminAuth },
    );
    expect(created.status).toBe(201);
    expect(adminTask.status).toBe(201);

    const userTasks = await client.get('/tasks', { headers: userAuth });
    expect(userTasks.status).toBe(200);
    expect(userTasks.data.total).toBe(1);
    expect(userTasks.data.data[0].title).toBe('Ship assignment');

    const forbidden = await client.put(
      `/tasks/${adminTask.data._id}`,
      { title: 'Take over' },
      { headers: userAuth },
    );
    expect(forbidden.status).toBe(403);

    const completed = await client.put(
      `/tasks/${created.data._id}`,
      { status: TaskStatus.DONE },
      { headers: userAuth },
    );
    expect(completed.status).toBe(200);
    expect(completed.data.status).toBe(TaskStatus.DONE);

    const deniedAnalytics = await client.get('/analytics/tasks', {
      headers: userAuth,
    });
    expect(deniedAnalytics.status).toBe(403);

    const analytics = await client.get('/analytics/tasks', {
      headers: adminAuth,
    });
    expect(analytics.status).toBe(200);
    expect(analytics.data.statusCounts.DONE).toBe(1);
    expect(analytics.data.statusCounts.IN_PROGRESS).toBe(1);
    expect(analytics.data.perUserTaskCounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'user@example.com', count: 1 }),
        expect.objectContaining({ email: 'admin@example.com', count: 1 }),
      ]),
    );
  });
});
