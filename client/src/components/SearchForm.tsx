import { FormEvent, useState } from 'react';
import type { RankRequest } from '../types';

interface Props {
  loading: boolean;
  onSubmit: (request: RankRequest) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SearchForm({ loading, onSubmit }: Props) {
  const [homeAddress, setHomeAddress] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState(todayIso());
  const [returnDate, setReturnDate] = useState('');
  const [maxDriveMinutes, setMaxDriveMinutes] = useState(240);
  const [adults, setAdults] = useState(1);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      homeAddress,
      destination: destination.trim().toUpperCase(),
      departureDate,
      returnDate: returnDate || undefined,
      maxDriveMinutes,
      adults,
    });
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="homeAddress">Home address</label>
        <input
          id="homeAddress"
          required
          placeholder="123 Main St, Rochester, NY"
          value={homeAddress}
          onChange={(e) => setHomeAddress(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="destination">Destination airport (IATA code)</label>
        <input
          id="destination"
          required
          placeholder="LAX"
          maxLength={3}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="departureDate">Departure date</label>
          <input
            id="departureDate"
            type="date"
            required
            min={todayIso()}
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="returnDate">Return date (optional)</label>
          <input
            id="returnDate"
            type="date"
            min={departureDate}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="maxDriveMinutes">Max drive time (each way, minutes)</label>
          <input
            id="maxDriveMinutes"
            type="number"
            min={15}
            max={600}
            step={15}
            value={maxDriveMinutes}
            onChange={(e) => setMaxDriveMinutes(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="adults">Passengers</label>
          <input
            id="adults"
            type="number"
            min={1}
            max={9}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
          />
        </div>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Ranking airports…' : 'Find best departure airport'}
      </button>
    </form>
  );
}
