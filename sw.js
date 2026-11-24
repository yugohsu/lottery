/* 幸運轉盤：離線也能打開（網頁和圖示存在手機、iPad 裡） */
const CACHE = 'lottery-v3';
const FILES = ['./', './index.html', './wheel-icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromCache(r) {
  return caches.match(r, { ignoreSearch: true })
    .then(m => m || caches.match('./index.html'))
    .then(m => m || caches.match('./'));
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const isPage = r.mode === 'navigate' || /\/lottery\/(index\.html)?(\?.*)?$/.test(r.url);

  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = res => { if (!done && res) { done = true; resolve(res); } };

    // 網路慢或沒網路：3 秒內沒回應就先用存在裝置裡的版本
    const timer = setTimeout(() => fromCache(r).then(m => { if (m) finish(m); }), 3000);

    fetch(r).then(res => {
      if (res && res.ok && !res.redirected) {
        const cp = res.clone();
        caches.open(CACHE).then(c => {
          c.put(r, cp.clone());
          if (isPage) c.put('./index.html', cp.clone()).catch(() => {});
        }).catch(() => {});
      }
      clearTimeout(timer);
      finish(res);
    }).catch(() => {
      clearTimeout(timer);
      fromCache(r).then(m => finish(m || new Response(
        '<meta charset="utf-8"><body style="background:#0b1733;color:#fff;font:900 24px sans-serif;text-align:center;padding-top:30vh">還沒有存到這台裝置<br>請先連上網路打開一次</body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )));
    });
  }));
});
