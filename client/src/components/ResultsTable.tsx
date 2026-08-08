import type { RankResponse } from '../types';

interface Props {
  result: RankResponse;
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatPrice(price: number, currency: string): string {
  if (Number.isNaN(price)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

export default function ResultsTable({ result }: Props) {
  if (result.options.length === 0) {
    return (
      <p className="empty-state">
        No candidate airports found within range of "{result.homeAddress}". Try increasing the
        max drive time.
      </p>
    );
  }

  const bestMinutes = result.options.find((o) => o.totalTripMinutes !== null)?.totalTripMinutes;

  return (
    <div className="results">
      <table>
        <thead>
          <tr>
            <th>Airport</th>
            <th>Drive (each way)</th>
            <th>Flight time</th>
            <th>Stops</th>
            <th>Price</th>
            <th>Total trip time</th>
          </tr>
        </thead>
        <tbody>
          {result.options.map((option) => {
            const isBest =
              option.totalTripMinutes !== null && option.totalTripMinutes === bestMinutes;
            return (
              <tr key={option.airport.iata} className={isBest ? 'best-row' : undefined}>
                <td>
                  <strong>{option.airport.iata}</strong> — {option.airport.city}
                  <div className="muted">{option.airport.name}</div>
                </td>
                <td>
                  {formatMinutes(option.driveMinutesEachWay)}
                  <div className="muted">{option.driveDistanceMiles} mi</div>
                </td>
                <td>{option.flight ? formatMinutes(option.flight.durationMinutes) : '—'}</td>
                <td>{option.flight ? option.flight.stops : '—'}</td>
                <td>
                  {option.flight ? formatPrice(option.flight.price, option.flight.currency) : '—'}
                </td>
                <td className={isBest ? 'total-best' : undefined}>
                  {formatMinutes(option.totalTripMinutes)}
                  {option.flightError && <div className="muted error-text">{option.flightError}</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {result.excluded.length > 0 && (
        <details className="excluded">
          <summary>{result.excluded.length} airport(s) excluded (out of drive-time range)</summary>
          <ul>
            {result.excluded.map((e) => (
              <li key={e.airport.iata}>
                {e.airport.iata} — {e.airport.city}: {e.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
