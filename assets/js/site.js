

import {start} from './controller.js';


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch ((error) => console.error('Service Worker registration failed:', error));
  });

  }

  start();