export type AuthTokenScope = 'printer-client' | 'admin';

export type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  tenantSlug: string;
  deviceId?: string;
  scope: AuthTokenScope;
  adminEmail?: string;
  jti: string;
  iat?: number;
  exp?: number;
};
