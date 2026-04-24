import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtSignOptions } from '@nestjs/jwt/dist/interfaces';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataAccessModule } from '@dmaq/data-access';
import { AuthService } from './lib/auth.service';
import { AuthController } from './lib/auth.controller';
import { JwtStrategy } from './lib/strategies/jwt.strategy';
import { JwtAuthGuard } from './lib/guards/jwt-auth.guard';
import { RolesGuard } from './lib/guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn =
          configService.get<JwtSignOptions['expiresIn']>('JWT_EXPIRES_IN') ??
          '3600s';

        return {
          secret: configService.get<string>('JWT_SECRET') ?? 'fallback-secret',
          signOptions: { expiresIn },
        };
      },
    }),
    DataAccessModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, PassportModule],
})
export class AuthModule {}
