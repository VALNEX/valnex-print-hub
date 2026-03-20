function getPositiveIntFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function getDeviceActivationTtlMinutes(): number {
  return getPositiveIntFromEnv('DEVICE_ACTIVATION_TTL_MINUTES', 10);
}

export function getDeviceRefreshTtlDays(): number {
  return getPositiveIntFromEnv('DEVICE_REFRESH_TTL_DAYS', 30);
}

export function getDeviceSecretPepper(): string {
  return process.env.DEVICE_SECRET_PEPPER ?? '';
}

export function getDeviceActivationRateWindowSeconds(): number {
  return getPositiveIntFromEnv('DEVICE_ACTIVATION_RATE_WINDOW_SECONDS', 600);
}

export function getDeviceActivationRateMaxAttempts(): number {
  return getPositiveIntFromEnv('DEVICE_ACTIVATION_RATE_MAX_ATTEMPTS', 10);
}
