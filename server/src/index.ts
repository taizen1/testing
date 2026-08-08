import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { rankRouter } from './routes/rank.js';
import { findAllAirports } from './services/airports.js';

const app = express();

app.use(cors({ origin: config.clientOrigins }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/airports', (_req, res) => {
  res.json(findAllAirports());
});

app.use('/api', rankRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Airport travel-time API listening on http://localhost:${config.port}`);
});
