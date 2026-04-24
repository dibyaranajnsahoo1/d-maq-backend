import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(mockConfigService);
  });

  it('should return user object from valid payload', async () => {
    const payload = { sub: 'user-123', email: 'test@test.com', role: 'USER' };
    const result = await strategy.validate(payload);
    expect(result).toEqual({ userId: 'user-123', email: 'test@test.com', role: 'USER' });
  });

  it('should throw UnauthorizedException for payload missing sub', async () => {
    await expect(
      strategy.validate({ email: 'test@test.com', role: 'USER' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for null payload', async () => {
    await expect(strategy.validate(null as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
