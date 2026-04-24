import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@dmaq/data-access';
import { UserDocument } from '@dmaq/models';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userRepository.findByEmail(email);
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userRepository.findAll();
  }
}
