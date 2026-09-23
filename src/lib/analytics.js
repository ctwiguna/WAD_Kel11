const events = [];
export function track(eventName, payload = {}) {
  events.push({ event: eventName, payload, at: new Date().toISOString() });
  console.log("[track]", eventName, payload);
}
export function getEvents() { return [...events]; }
export function clearEvents() { events.length = 0; }