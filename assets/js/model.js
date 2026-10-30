const BASE_URL = 'https://www.elprisenligenu.dk/api/v1/prices';
const SETTINGS_KEY = 'elprisen-settings';
const DEFAULTS = { vat: false, alarm: false, region: 'DK2' };
const cache = new Map();
const pad = (num) => num.toString().padStart(2, '0');

export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hourKey = (d) => `${dateKey(d)}T${pad(d.getHours())}`;
export const withVat = (price, vat) => (vat ? price * 1.25 : price);

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
  }
}


function toHourly(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.time_start.slice(0, 13);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row.DKK_per_kWh);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, values]) => ({
      key,
      hour: parseInt(key.slice(11, 13), 10),
      price: values.reduce((sum, v) => sum + v, 0) / values.length,
    }));
}

export async function getDay(region, date) {
  const cacheKey = `${region}_${dateKey(date)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const url = `${BASE_URL}/${date.getFullYear()}/${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${region}.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API-fejl (${response.status})`);

  const hours = toHourly(await response.json());
  cache.set(cacheKey, hours);
  return hours;
}

export async function getUpcoming(region, now = new Date()) {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const [today, next] = await Promise.all([
    getDay(region, now),
    getDay(region, tomorrow).catch(() => []),
  ]);
  const nowKey = hourKey(now);
  return [...today, ...next].filter((h) => h.key >= nowKey);
}