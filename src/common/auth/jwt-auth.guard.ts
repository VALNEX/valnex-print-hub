import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthTokenPayload } from './auth.types';
import { TokenRevocationService } from './token-revocation.service';
import { REQUIRED_SCOPES_KEY } from './required-scope.decorator';

type RequestWithAuth = {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  auth?: AuthTokenPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authHeader = request.headers.authorization;
    const token =
      this.extractBearerToken(authHeader) ?? request.cookies?.admin_access_token ?? null;

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token);
      if (await this.tokenRevocationService.isRevokedAsync(payload.jti)) {
        throw new UnauthorizedException('Token revoked');
      }
      if (requiredScopes?.length && !requiredScopes.includes(payload.scope)) {
        throw new UnauthorizedException('Invalid token scope');
      }

      request.auth = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractBearerToken(value?: string | string[]): string | null {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) {
      return null;
    }

    const [type, token] = raw.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token;
  }
}
