import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema, Task, TaskSchema } from '@dmaq/models';
import { UserRepository } from './user.repository';
import { TaskRepository } from './task.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
  ],
  providers: [UserRepository, TaskRepository],
  exports: [UserRepository, TaskRepository],
})
export class DataAccessModule {}
