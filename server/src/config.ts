import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] ${name} is not set — requests that need it will fail until you add it to server/.env`
    );
  }
  return value ?? '';
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  googleMapsApiKey: requireEnv('GOOGLE_MAPS_API_KEY'),
  serpApiKey: requireEnv('SERPAPI_KEY'),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
