import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '@dmaq/data-access';
import { RegisterDto, LoginDto, Role } from '@dmaq/models';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string; userId: string }> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
    });

    return {
      message: 'Registration successful',
      userId: (user as any)._id.toString(),
    };
  }

  async login(dto: LoginDto): Promise<{ access_token: string; role: Role }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: (user as any)._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);
    return { access_token: token, role: user.role };
  }
}
