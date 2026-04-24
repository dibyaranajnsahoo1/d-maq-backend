import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@dmaq/auth';
import { CreateTaskDto, UpdateTaskDto, TaskStatus } from '@dmaq/models';
import { TasksService } from './tasks.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateTaskDto, @Request() req: AuthRequest) {
    return this.tasksService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks (USER: own | ADMIN: all)' })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  findAll(
    @Request() req: AuthRequest,
    @Query('status') status?: TaskStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.findAll({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      userRole: req.user.role,
      requesterId: req.user.userId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID (owner or ADMIN)' })
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.tasksService.findOne(id, req.user.userId, req.user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task (owner or ADMIN)' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 403, description: 'Not owner or admin' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: AuthRequest,
  ) {
    return this.tasksService.update(id, dto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task (owner or ADMIN)' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  @ApiResponse({ status: 403, description: 'Not owner or admin' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.tasksService.remove(id, req.user.userId, req.user.role);
  }
}
