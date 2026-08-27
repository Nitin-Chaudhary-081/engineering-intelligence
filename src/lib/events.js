/**
 * Event Tracking
 * @module events
 */

export function createEvent(type, { actor = 'agent', summary, files = [], metadata = {} }) {
  return {
    type,
    actor,
    summary,
    files,
    metadata,
    timestamp: new Date().toISOString(),
  };
}

export function reconstructHistory(events) {
  // Group by day
  const byDay = {};
  for (const e of events) {
    const day = e.timestamp.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  }
  return byDay;
}
