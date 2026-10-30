const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const pad = (n) => String(n).padStart(2, '0');

export const fmt = (price) => price.toFixed(3);
const hourLabel = (hour) => `${pad(hour)}.00`;

// Grøn (billig) -> rød (dyr)
function priceColor(price, min, max) {
  const t = max === min ? 0 : (price - min) / (max - min);
  return `hsl(${Math.round(120 * (1 - t))} 100% 52%)`;
}

export function renderList(selector, items, nowKey = null) {
  const list = $(selector);
  if (items.length === 0) {
    list.innerHTML = '<li class="empty">Ingen priser fundet.</li>';
    return;
  }
  const prices = items.map((i) => i.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  list.innerHTML = items
    .map(
      (i) => `<li class="${i.key === nowKey ? 'current' : ''}">
        <span>kl. ${hourLabel(i.hour)}</span>
        <span style="color:${priceColor(i.price, min, max)}">${fmt(i.price)} kr</span>
      </li>`
    )
    .join('');
}

export function renderError(selector, message) {
  $(selector).innerHTML = `<li class="empty">${message}</li>`;
}

export function renderNow(item) {
  $('#now-price').textContent = item ? `${fmt(item.price)} KR` : '–';
  $('#now-time').textContent = item ? `${hourLabel(item.hour)} - ${hourLabel((item.hour + 1) % 24)}` : '';
}

export function renderMinMax(items) {
  const prices = items.map((i) => i.price);
  const text = (value) => (prices.length ? `${fmt(value)} KR` : '–');
  $$('.min-price').forEach((el) => (el.textContent = text(Math.min(...prices))));
  $$('.max-price').forEach((el) => (el.textContent = text(Math.max(...prices))));
}

export function renderInfo(settings) {
  $$('.vat-note').forEach((el) => (el.textContent = settings.vat ? 'inkl. moms' : 'ex. moms'));
  $$('.region-name').forEach((el) => (el.textContent = settings.region === 'DK1' ? 'Vest Danmark' : 'Øst Danmark'));
}

export function renderSettings(settings) {
  $('#set-vat').checked = settings.vat;
  $('#set-alarm').checked = settings.alarm;
  $('#set-region').value = settings.region;
}

export function renderHistoryTitle(date) {
  const text = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  $('#history-title').textContent = `Elpriserne d. ${text}`;
}

export function setPage(page) {
  document.body.dataset.page = page;
  $$('nav a').forEach((a) => a.classList.toggle('active', a.dataset.page === page));
}