import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskReminderProcessor } from './task-reminder.processor';
import { DataAccessModule } from '@dmaq/data-access';

@Module({
  imports: [
    DataAccessModule,
    BullModule.registerQueue({
      name: 'task-reminders',
    }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskReminderProcessor],
  exports: [TasksService],
})
export class TasksModule {}
