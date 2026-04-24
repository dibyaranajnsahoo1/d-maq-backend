import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DataAccessModule } from '@dmaq/data-access';
import { AuthModule } from '@dmaq/auth';
import { TasksService } from './lib/tasks.service';
import { TasksController } from './lib/tasks.controller';
import { TaskReminderProcessor } from './lib/task-reminder.processor';

@Module({
  imports: [
    DataAccessModule,
    AuthModule,
    BullModule.registerQueue({ name: 'task-reminders' }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskReminderProcessor],
  exports: [TasksService],
})
export class TasksModule {}
