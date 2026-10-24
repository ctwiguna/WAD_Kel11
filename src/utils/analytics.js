// analytics.js, fungsi helper murni, tidak ada JSX

const logs = [];

export function track(event, data = {}) {
  const entry = {
    time: new Date().toLocaleTimeString('id-ID'),
    event,
    data,
  };
  logs.push(entry);
  // Log konsol hanya di mode dev, supaya data event tidak ikut tercetak di produksi.
  if (import.meta.env.DEV) console.log(`[Analytics] ${event}`, data);
}

export function getLogs() {
  return [...logs];
}
