import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const API_KEY_PREFIX = 'vph_';
const API_KEY_SALT_BYTES = 16;
const API_KEY_DERIVED_KEY_BYTES = 32;
const HASH_VERSION = 'scrypt';

export function generateApiKey() {
  const rawToken = randomBytes(24).toString('base64url');
  return `${API_KEY_PREFIX}${rawToken}`;
}

export async function hashApiKey(apiKey: string) {
  const salt = randomBytes(API_KEY_SALT_BYTES);
  const derivedKey = (await scrypt(
    apiKey,
    salt,
    API_KEY_DERIVED_KEY_BYTES,
  )) as Buffer;

  return `${HASH_VERSION}$${salt.toString('base64url')}$${derivedKey.toString(
    'base64url',
  )}`;
}

export async function verifyApiKey(
  plainApiKey: string,
  storedApiKey: string,
): Promise<boolean> {
  if (!storedApiKey.startsWith(`${HASH_VERSION}$`)) {
    // Backward compatibility for legacy plaintext apiKey rows.
    return plainApiKey === storedApiKey;
  }

  const parts = storedApiKey.split('$');
  if (parts.length !== 3) {
    return false;
  }

  const [, saltEncoded, keyEncoded] = parts;

  const salt = Buffer.from(saltEncoded, 'base64url');
  const storedKey = Buffer.from(keyEncoded, 'base64url');
  const computedKey = (await scrypt(
    plainApiKey,
    salt,
    storedKey.length,
  )) as Buffer;

  if (computedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(computedKey, storedKey);
}
