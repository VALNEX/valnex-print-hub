import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenRevocationService } from '../../common/auth/token-revocation.service';
import { DeviceAuthCacheService } from './device-auth-cache.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const expiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 28800);
        return {
          secret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me',
          signOptions: {
            expiresIn:
              Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
                ? Math.floor(expiresInSeconds)
                : 28800,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenRevocationService, DeviceAuthCacheService],
  exports: [AuthService, TokenRevocationService, DeviceAuthCacheService, JwtModule],
})
export class AuthModule {}
