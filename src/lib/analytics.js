/**
 * Analitik event minimum — disimpan di memori + dicatat lewat console.log.
 * Dipakai untuk debugging alur (materi: console.log) dan QA di halaman Privasi.
 */
const buffer = []
const MAX = 200

export function track(event, props = {}) {
  const entry = { event, props, at: new Date().toISOString() }
  buffer.push(entry)
  if (buffer.length > MAX) buffer.shift()
  console.log('[kf:event]', event, props)
  return entry
}

export function eventLog() {
  return [...buffer]
}
