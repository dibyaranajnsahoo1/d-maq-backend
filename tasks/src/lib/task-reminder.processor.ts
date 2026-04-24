import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

interface TaskReminderJob {
  taskId: string;
  userId: string;
  title: string;
}

@Processor('task-reminders')
export class TaskReminderProcessor {
  private readonly logger = new Logger(TaskReminderProcessor.name);

  @Process('remind')
  async handleReminder(job: Job<TaskReminderJob>): Promise<void> {
    const { taskId, userId, title } = job.data;
    this.logger.log(
      `[REMINDER] Task reminder fired for task "${taskId}" — "${title}" (user: ${userId}). ` +
        `[Mock] Would send email/push notification here.`,
    );
    // In production: sendEmail(userId, title) via SendGrid / SMTP
  }
}
