import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthTokenPayload } from './auth.types';

type RequestWithAuth = {
  auth?: AuthTokenPayload;
};

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthTokenPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.auth as AuthTokenPayload;
  },
);
