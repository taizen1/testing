import type { RankRequest, RankResponse } from './types';

export async function rankAirports(request: RankRequest): Promise<RankResponse> {
  const res = await fetch('/api/rank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed with HTTP ${res.status}`);
  }
  return data as RankResponse;
}
