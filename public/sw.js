// network-first: always try fresh lessons, fall back to cache offline

const CACHE = "jc-v177";
const AUDIO_CACHE = "jc-audio-1";   // word recordings: kept across app versions

self.addEventListener("install", e => self.skipWaiting());

self.addEventListener("activate", e =>
  e.waitUntil(self.clients.claim())
);

// Phones (iPhone Safari especially) ask for audio in byte ranges. Fetch the whole file once,
// keep it for offline use, and answer each range request with the exact slice (206).
async function audioResponse(request){
  const url = new URL(request.url), key = url.origin + url.pathname + url.search;   // ?v=<hash> on listening audio: a re-recording is a new file
  const cache = await caches.open(AUDIO_CACHE);
  let full = await cache.match(key);
  if(!full){
    const r = await fetch(key);
    if(!r.ok) return r;
    await cache.put(key, r.clone());
    full = r;
  }
  const range = request.headers.get("range");
  if(!range) return full;
  const buf = await full.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  if(!m[1] && m[2]){ start = Math.max(0, size - +m[2]); end = size - 1; }   // "bytes=-500" = last 500 bytes
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {status: 206, headers: {
    "Content-Type": "audio/mpeg", "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes"}});
}

self.addEventListener("fetch", e => {

  if (
    e.request.method !== "GET" ||
    new URL(e.request.url).origin !== location.origin
  ) return;

  if (/\/data\/(audio|listening)\//.test(new URL(e.request.url).pathname) && e.request.url.endsWith(".mp3")) {   // word audio + listening tests
    e.respondWith(audioResponse(e.request).catch(() => fetch(e.request)));
    return;
  }

  e.respondWith(
    fetch(e.request).then(r => {

      if (r.status === 200) {   // never store partial (206) answers
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }

      return r;

    }).catch(() =>
      caches.match(e.request)
    )
  );

});
