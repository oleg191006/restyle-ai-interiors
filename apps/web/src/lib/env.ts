import "server-only";

/** Read a required env var at call time, so builds and pages that don't need it never fail. */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const intEnv = (name: string, fallback: number) => Number(process.env[name] ?? fallback);
