import { SetMetadata } from '@nestjs/common';
import type { AuthTokenScope } from './auth.types';

export const REQUIRED_SCOPES_KEY = 'requiredScopes';
export const RequireScopes = (...scopes: AuthTokenScope[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);
