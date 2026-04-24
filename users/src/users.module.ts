import { Module } from '@nestjs/common';
import { DataAccessModule } from '@dmaq/data-access';
import { AuthModule } from '@dmaq/auth';
import { UsersService } from './lib/users.service';
import { UsersController } from './lib/users.controller';

@Module({
  imports: [DataAccessModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
