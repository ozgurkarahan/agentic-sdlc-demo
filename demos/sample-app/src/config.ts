export interface AppConfig {
  port: number;
  baseUrl: string;
}

const DEFAULT_PORT = 3000;
const DEFAULT_BASE_URL = 'http://localhost:3000';

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function parseBaseUrl(value: string | undefined): string {
  if (!value) {
    return DEFAULT_BASE_URL;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return DEFAULT_BASE_URL;
    }
    return value.replace(/\/+$/, '');
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: parsePort(env.PORT),
    baseUrl: parseBaseUrl(env.BASE_URL),
  };
}

export const config: AppConfig = parseConfig();
