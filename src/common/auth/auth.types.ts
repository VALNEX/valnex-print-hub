export type PrinterTokenScope = 'printer-client';

export type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  tenantSlug: string;
  deviceId?: string;
  scope: PrinterTokenScope;
  jti: string;
  iat?: number;
  exp?: number;
};
