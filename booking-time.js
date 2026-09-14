(function (root) {
    'use strict';

    // Calendar dates are UTC-backed date-only values, never the visitor's local time.
    const TIME_ZONE = 'Africa/Casablanca';
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
    const slotCache = new Map();

    function partsAt(epochMs) {
        const parts = {};
        for (const part of formatter.formatToParts(new Date(epochMs))) {
            if (part.type !== 'literal') parts[part.type] = Number(part.value);
        }
        return parts;
    }

    function calendarDate(epochMs) {
        const p = partsAt(epochMs);
        return new Date(Date.UTC(p.year, p.month - 1, p.day));
    }

    function parseDate(value) {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || ''));
        if (!m) return null;
        const date = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
        return date.getUTCFullYear() === Number(m[3]) && date.getUTCMonth() === Number(m[2]) - 1 && date.getUTCDate() === Number(m[1]) ? date : null;
    }

    function formatDate(date) {
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
    }

    function monday(date) {
        const result = new Date(date.getTime());
        result.setUTCHours(0, 0, 0, 0);
        result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7));
        return result;
    }

    function normalizeHour(value) {
        const match = /^(\d{1,2}):00$/.exec(String(value || '').trim());
        return match && Number(match[1]) < 24 ? `${Number(match[1])}:00` : null;
    }

    function slotKey(date, hour) {
        const normalized = normalizeHour(hour);
        return parseDate(date) && normalized ? `${date}|${normalized}` : null;
    }

    function slotEpoch(dateValue, hourValue) {
        const key = slotKey(dateValue, hourValue);
        if (!key) return null;
        if (slotCache.has(key)) return slotCache.get(key);
        const date = parseDate(dateValue);
        const wallTime = date.getTime() + Number.parseInt(hourValue, 10) * 3600000;
        let candidate = wallTime;
        const matches = new Set();
        // Resolve the IANA offset for this date (including Morocco's seasonal changes).
        for (let i = 0; i < 4; i++) {
            const p = partsAt(candidate);
            const actualWall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
            if (actualWall === wallTime) matches.add(candidate);
            candidate += wallTime - actualWall;
        }
        // A repeated hour can be booked once in the current schema; use its first occurrence.
        for (const offset of [-3600000, 0, 3600000]) {
            const test = candidate + offset;
            const p = partsAt(test);
            if (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) === wallTime) matches.add(test);
        }
        const epoch = matches.size ? Math.min(...matches) : null;
        if (slotCache.size > 10000) slotCache.clear();
        slotCache.set(key, epoch);
        return epoch;
    }

    function openingHours(data = {}) {
        const open = Number(data.openHour ?? 8);
        const close = Number(data.closeHour ?? 23);
        return Number.isInteger(open) && Number.isInteger(close) && open >= 0 && open < close && close <= 24
            ? { open, close } : null;
    }

    function firstBookableWeek(now, hours) {
        const start = monday(calendarDate(now));
        const sunday = new Date(start.getTime());
        sunday.setUTCDate(sunday.getUTCDate() + 6);
        const lastStart = slotEpoch(formatDate(sunday), `${hours.close - 1}:00`);
        if (lastStart !== null && lastStart <= now) start.setUTCDate(start.getUTCDate() + 7);
        return start;
    }

    function createClock({ monotonicNow = () => performance.now() } = {}) {
        let anchorMs = null;
        let anchorTick = 0;
        let inFlight = null;
        const now = () => anchorMs === null ? null : anchorMs + Math.max(0, monotonicNow() - anchorTick);
        const ready = () => anchorMs !== null && monotonicNow() - anchorTick < 10 * 60 * 1000;

        async function synchronize(endpoint, { force = false, fetchImpl = fetch } = {}) {
            if (inFlight) return inFlight;
            if (!force && ready() && monotonicNow() - anchorTick < 60000) return now();
            inFlight = (async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                try {
                    const started = monotonicNow();
                    const url = new URL(endpoint);
                    url.searchParams.set('action', 'getServerTime');
                    const response = await fetchImpl(url.href, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal });
                    if (!response.ok) throw new Error(`Clock HTTP ${response.status}`);
                    const payload = await response.json();
                    if (!Number.isFinite(payload.serverTime) || payload.serverTime < Date.UTC(2020, 0, 1) || payload.timeZone !== TIME_ZONE) throw new Error('Invalid server clock');
                    const finished = monotonicNow();
                    anchorMs = payload.serverTime + Math.max(0, finished - started) / 2;
                    anchorTick = finished;
                    return now();
                } finally {
                    clearTimeout(timeout);
                }
            })();
            try { return await inFlight; } finally { inFlight = null; }
        }

        return { now, ready, synchronize };
    }

    const api = { TIME_ZONE, partsAt, calendarDate, parseDate, formatDate, monday, normalizeHour, slotKey, slotEpoch, openingHours, firstBookableWeek, createClock };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.MalaibBookingTime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
