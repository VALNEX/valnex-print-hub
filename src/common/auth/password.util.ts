import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const PASSWORD_SALT_BYTES = 16;
const PASSWORD_DERIVED_KEY_BYTES = 32;
const HASH_VERSION = 'scrypt';

export async function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const derivedKey = (await scrypt(
    password,
    salt,
    PASSWORD_DERIVED_KEY_BYTES,
  )) as Buffer;

  return `${HASH_VERSION}$${salt.toString('base64url')}$${derivedKey.toString(
    'base64url',
  )}`;
}

export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash.startsWith(`${HASH_VERSION}$`)) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3) {
    return false;
  }

  const [, saltEncoded, keyEncoded] = parts;
  const salt = Buffer.from(saltEncoded, 'base64url');
  const storedKey = Buffer.from(keyEncoded, 'base64url');
  const computedKey = (await scrypt(
    plainPassword,
    salt,
    storedKey.length,
  )) as Buffer;

  if (computedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(computedKey, storedKey);
}
