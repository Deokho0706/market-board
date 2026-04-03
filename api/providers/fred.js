import { withTimeout } from '../utils/errors.js';

async function getLatestValue(apiKey, seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=10`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const obs = data.observations?.find(o => o.value && o.value !== '.');
  return obs ? parseFloat(obs.value) : null;
}

export async function getFredData(apiKey) {
  const get = (seriesId) =>
    withTimeout(getLatestValue(apiKey, seriesId), 5000).catch((err) => {
      console.error(`[fred] ${seriesId} error:`, err.message);
      return null;
    });

  const [us10y, us2y, fedfunds] = await Promise.all([
    get('DGS10'),
    get('DGS2'),
    get('FEDFUNDS'),
  ]);

  return { us10y, us2y, fedfunds };
}
