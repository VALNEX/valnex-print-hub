import { createHash, randomBytes } from 'node:crypto';

export function hashDeviceSecret(value: string, pepper: string): string {
  return createHash('sha256')
    .update(`${value}::${pepper}`)
    .digest('hex');
}

export function normalizeDeviceCode(source: string): string {
  return source
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function normalizeDeviceMacAddress(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, '');

  if (normalized.length !== 12) {
    return null;
  }

  return normalized.match(/.{1,2}/g)?.join(':') ?? null;
}

export function generateActivationCode(length = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let code = '';

  for (let index = 0; index < length; index += 1) {
    code += alphabet[bytes[index] % alphabet.length];
  }

  return code;
}

export function generateDeviceSecret(): string {
  return randomBytes(32).toString('base64url');
}
