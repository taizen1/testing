import { useState } from 'react';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import { rankAirports } from './api';
import type { RankRequest, RankResponse } from './types';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RankResponse | null>(null);

  async function handleSubmit(request: RankRequest) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await rankAirports(request);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Airport Travel Time</h1>
        <p className="subtitle">
          Rank nearby departure airports by <strong>total door-to-door trip time</strong> —
          drive time (round trip) + airport arrival buffer + flight time — not just flight
          duration or price alone.
        </p>
      </header>

      <SearchForm loading={loading} onSubmit={handleSubmit} />

      {error && <p className="error-banner">{error}</p>}
      {result && <ResultsTable result={result} />}
    </div>
  );
}
