import * as model from './model.js';
import * as view from './view.js';

const PAGES = ['overview', 'now', 'history', 'settings'];
const state = { settings: model.loadSettings(), alarmedKey: null };
const isDesktop = () => matchMedia('(min-width: 900px)').matches;

const withVat = (items) => items.map((i) => ({ ...i, price: model.withVat(i.price, state.settings.vat) }));
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

/* ---------- Lige nu + Oversigt ---------- */
async function loadLive() {
  const now = new Date();
  const nowKey = model.hourKey(now);
  try {
    const items = withVat(await model.getUpcoming(state.settings.region, now));
    view.renderNow(items[0]?.key === nowKey ? items[0] : null);
    view.renderList('#overview-list', items, nowKey);
    view.renderMinMax(items);
    checkAlarm(items, nowKey);
  } catch (error) {
    console.error(error);
    view.renderNow(null);
    view.renderMinMax([]);
    view.renderError('#overview-list', 'Kunne ikke hente priser. Tjek din internetforbindelse.');
  }
}

/* ---------- Historik (op til 7 dage tilbage) ---------- */
async function loadHistory() {
  const input = document.querySelector('#history-date');
  const [y, m, d] = input.value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  view.renderHistoryTitle(date);
  try {
    view.renderList('#history-list', withVat(await model.getDay(state.settings.region, date)));
  } catch (error) {
    console.error(error);
    view.renderError('#history-list', 'Der findes ingen priser for den dag, eller du er offline.');
  }
}

function setupHistoryInput() {
  const input = document.querySelector('#history-date');
  input.min = model.dateKey(daysAgo(7));
  input.max = model.dateKey(new Date());
  input.value = model.dateKey(daysAgo(1));
  input.addEventListener('change', () => input.value && loadHistory());
}

/* ---------- Laveste pris alarm ---------- */
async function checkAlarm(items, nowKey) {
  if (!state.settings.alarm || items.length === 0 || state.alarmedKey === nowKey) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const cheapest = items.reduce((a, b) => (b.price < a.price ? b : a));
  if (cheapest.key !== nowKey) return;

  state.alarmedKey = nowKey;
  const registration = await navigator.serviceWorker.ready;
  registration.showNotification('Laveste pris lige nu', {
    body: `${view.fmt(cheapest.price)} kr pr. kWh`,
    icon: 'icons/192.png',
  });
}

/* ---------- Indstillinger ---------- */
function openSettings() {
  if (isDesktop()) document.body.classList.add('modal-open');
  else location.hash = '#settings';
}

function closeSettings() {
  document.body.classList.remove('modal-open');
  if (location.hash === '#settings') location.hash = '#now';
}

async function onSettingsChange() {
  const alarmInput = document.querySelector('#set-alarm');
  state.settings = {
    vat: document.querySelector('#set-vat').checked,
    alarm: alarmInput.checked,
    region: document.querySelector('#set-region').value,
  };

  if (state.settings.alarm && 'Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      state.settings.alarm = false;
      alarmInput.checked = false;
    }
  }

  model.saveSettings(state.settings);
  view.renderInfo(state.settings);
  loadLive();
  loadHistory();
}

/* ---------- Navigation ---------- */
function route() {
  const page = location.hash.slice(1);
  view.setPage(PAGES.includes(page) ? page : 'now');
}

export function start() {
  setupHistoryInput();
  view.renderSettings(state.settings);
  view.renderInfo(state.settings);
  view.renderHistoryTitle(daysAgo(1));

  window.addEventListener('hashchange', route);
  document.querySelector('#settings-open').addEventListener('click', openSettings);
  document.querySelector('#settings-close').addEventListener('click', closeSettings);
  document.querySelector('#settings').addEventListener('click', (e) => {
    if (e.target.id === 'settings' && isDesktop()) closeSettings();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSettings());
  ['#set-vat', '#set-alarm', '#set-region'].forEach((id) =>
    document.querySelector(id).addEventListener('change', onSettingsChange)
  );

  route();
  loadLive();
  loadHistory();

  setInterval(loadLive, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => !document.hidden && loadLive());
  window.addEventListener('online', () => {
    loadLive();
    loadHistory();
  });
}