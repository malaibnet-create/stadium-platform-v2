const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const time = require('../booking-time.js');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

function section(start, end) {
    const first = source.indexOf(start);
    const last = end ? source.indexOf(end, first + start.length) : source.length;
    assert(first >= 0 && last > first, 'Production function boundaries exist: ' + start);
    return source.slice(first, last);
}

function harness() {
    const gets = [], posts = [], alerts = [], tickets = [];
    const config = { status: 200, result: { result: 'success', count: 1, total: 100 } };
    const nodes = {};
    for (const id of ['headerRow', 'footerRow', 'dateDisplay', 'bookingCalendarMessage', 'retryBookingCalendar',
        'finalConfirmBtn', 'userName', 'userPhone', 'recurringSubmitBtn', 'recurringDay', 'recurringHour',
        'recurringWeeks', 'recurringName', 'recurringPhone', 'recurringConfirm']) {
        nodes[id] = { innerText: '', textContent: '', innerHTML: '', style: {}, disabled: false };
    }
    nodes.userName.value = nodes.recurringName.value = 'Local test';
    nodes.userPhone.value = nodes.recurringPhone.value = '0600000000';
    nodes.recurringDay.value = '3';
    nodes.recurringHour.value = '12:00';
    nodes.recurringWeeks.value = '3';
    nodes.recurringConfirm.checked = true;
    const table = {
        cells: [], html: '',
        set innerHTML(html) {
            this.html = html;
            this.cells = Array.from(html.matchAll(/<td class="slot ([^"]*)" data-date="([^"]*)" data-day="([^"]*)" data-hour="([^"]*)"[^>]*>(.*?)<\/td>/g), match => {
                const classes = new Set(['slot', ...match[1].split(' ').filter(Boolean)]);
                return {
                    dataset: { date: match[2], day: match[3], hour: match[4] }, innerText: match[5], style: {},
                    classList: { contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c) }
                };
            });
        },
        get innerHTML() { return this.html; },
        querySelectorAll(selector) {
            return this.cells.filter(cell => selector === '.slot.selected' && cell.classList.contains('selected'));
        }
    };
    nodes.tableBody = table;
    const clock = {
        ready: () => true, now: () => Date.parse('2026-09-15T08:00:00Z'),
        synchronize: async () => Date.parse('2026-09-15T08:00:00Z')
    };
    const window = {
        MalaibBookingTime: { ...time, createClock: () => clock }, stadiumStatus: 'open',
        location: { href: 'https://malaibnet.com/booking.html?id=st-test' },
        setTimeout: () => 1, clearTimeout() {}
    };
    const context = vm.createContext({
        window, Date, URL, AbortController, console: { error() {}, log() {} },
        document: { getElementById: id => nodes[id], title: 'Test stadium - Booking' },
        fetch: async (url, options = {}) => {
            if (String(url).includes('action=createBooking')) {
                posts.push(JSON.parse(options.body));
                return { ok: config.status === 200, status: config.status, json: async () => config.result };
            }
            return new Promise((resolve, reject) => gets.push({
                url: String(url), resolve: payload => resolve({ ok: true, json: async () => payload }), reject
            }));
        },
        getUiLanguage: () => 'en', getUiLocale: () => 'en-GB',
        uiText: text => text === 'محجوز' ? 'Booked' : text,
        formatUiBookingDate: date => time.formatDate(date),
        formatUiHourRange: (a, b) => a + ' - ' + b,
        getFormattedDate: time.formatDate, getHourlyBookingRate: () => 100,
        formatBookingPrice: String, closeRecurringModal() {}, scheduleNotification() {},
        showBookingTicket: (...args) => tickets.push(args), alert: message => alerts.push(message)
    });
    const stateStart = section('let selectedSlots = [];', 'window.stadiumData = null;') + 'window.stadiumData = null;\n';
    vm.runInContext(
        'let stadiumId = "st-test"; const bookingScriptURL = "https://api.malaibnet.com";\n' +
        stateStart +
        section('function initTable(', 'function getFormattedDate(') +
        section('async function submitFinalBooking()', 'function closeBookingModal()') +
        section('let bookingsRequestInFlight = null;', '// التشغيل') +
        section('function getFirstRecurringDate(', null) +
        '\nfunction getSelectedSlotsTotal() { return selectedSlots.length * 100; }\n' +
        'bookingsLoaded = true; window.stadiumData = {openHour:8, closeHour:24};\n' +
        'globalThis.app = {initTable, submitFinalBooking, submitRecurringBooking, loadExistingBookings, handleData,' +
        'invalidate: () => { if (typeof invalidateBookingSnapshot === "function") invalidateBookingSnapshot(); },' +
        'reset: () => { if (typeof resetBookingCalendarState === "function") resetBookingCalendarState(); },' +
        'switchStadium: id => { stadiumId=id; resetBookingCalendarState(); window.stadiumData={openHour:8,closeHour:24}; },' +
        'clearSelection: () => { selectedSlots=[]; },' +
        'state: () => ({keys:Array.from(bookedSlotKeys), selected:selectedSlots.length, failed:calendarLoadFailed, loaded:bookingsLoaded})};',
        context
    );
    context.app.initTable(undefined, true);
    return {
        app: context.app, table, gets, posts, alerts, tickets, config, clock,
        cell(date, hour) { return table.cells.find(c => c.dataset.date === date && c.dataset.hour === hour); },
        select(date = '16/09/2026', hour = '12:00') {
            const cell = this.cell(date, hour);
            assert(cell, 'Selected future cell exists');
            cell.classList.add('selected');
            context.testSlots = [{ date, hour, dayName: cell.dataset.day, element: cell }];
            vm.runInContext('selectedSlots = testSlots;', context);
        }
    };
}

async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

const tests = [
    ['booked cells have explicit red styling in light mode and versioned assets', async () => {
        const root = path.join(__dirname, '..');
        const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
        assert.match(css, /#tableBody\s+\.slot\.booked\s*\{[^}]*background:\s*#ef4444\s*!important/i);
        assert.match(fs.readFileSync(path.join(root, 'theme.css'), 'utf8'), /\.slot\.booked\s*\{[^}]*background:\s*#7f1d1d\s*!important/i);
        const html = fs.readFileSync(path.join(root, 'booking.html'), 'utf8');
        assert(html.includes('script.js?v=53-booking-state'));
        assert(html.includes('style.css?v=53-booking-state'));
        assert(fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes('malaeb-net-v53-booking-state'));
    }],
    ['saved snapshot marks a booked hour, including zero-padded aliases', async () => {
        const h = harness();
        h.app.handleData([{ date: '16/09/2026', hour: '08:00' }]);
        assert(h.cell('16/09/2026', '8:00').classList.contains('booked'));
    }],
    ['normal success updates source state, survives redraw, and keeps the ticket correct', async () => {
        const h = harness(); h.select(); await h.app.submitFinalBooking();
        h.app.initTable(undefined, true);
        assert(h.cell('16/09/2026', '12:00').classList.contains('booked'));
        assert.equal(h.app.state().selected, 0);
        assert.equal(h.tickets.length, 1);
        assert.equal(h.tickets[0][1], '16/09/2026');
        assert.equal(h.posts[0].bookings[0].hour, '12:00');
    }],
    ['closing selection during a slow request cannot corrupt the submitted booking or ticket', async () => {
        const h = harness(); let release;
        h.clock.synchronize = () => new Promise(resolve => { release=resolve; });
        h.select(); const submit = h.app.submitFinalBooking();
        h.app.clearSelection(); release(); await submit;
        assert.equal(h.posts[0].bookings.length, 1);
        assert.equal(h.tickets[0][1], '16/09/2026');
        assert(h.cell('16/09/2026', '12:00').classList.contains('booked'));
    }],
    ['pre-booking snapshot cannot erase confirmed red cells; a fresh GET is queued', async () => {
        const h = harness(); const old = h.app.loadExistingBookings();
        h.select(); await h.app.submitFinalBooking();
        h.gets[0].resolve([]); await old; await flush();
        assert.equal(h.gets.length, 2, 'A new snapshot starts after the mutation');
        assert(h.cell('16/09/2026', '12:00').classList.contains('booked'));
        h.gets[1].resolve([{ date: '16/09/2026', hour: '12:00' }]); await flush();
        assert(h.cell('16/09/2026', '12:00').classList.contains('booked'));
    }],
    ['switching stadium during submission cannot mark the new stadium with the old booking', async () => {
        const h = harness(); let release;
        h.clock.synchronize = () => new Promise(resolve => { release=resolve; });
        h.select(); const submit = h.app.submitFinalBooking();
        h.app.switchStadium('st-new'); release(); await submit;
        assert.equal(h.posts[0].stadiumId, 'st-test');
        assert.equal(h.app.state().keys.length, 0);
        assert.equal(h.tickets[0][3], 'https://malaibnet.com/booking.html?id=st-test');
    }],
    ['stale network failure cannot replace a successful booking with an error state', async () => {
        const h = harness(); const old = h.app.loadExistingBookings();
        h.select(); await h.app.submitFinalBooking();
        h.gets[0].reject(new Error('Old request disconnected')); await old; await flush();
        assert.equal(h.app.state().failed, false);
        assert(h.cell('16/09/2026', '12:00').classList.contains('booked'));
        assert.equal(h.gets.length, 2);
    }],
    ['recurring success records every confirmed week before network refresh', async () => {
        const h = harness(); await h.app.submitRecurringBooking();
        assert.equal(h.app.state().keys.length, 3);
        assert(h.cell('16/09/2026', '12:00').classList.contains('booked'));
        assert.equal(h.posts[0].bookings.length, 3);
    }],
    ['failed booking never marks an unsaved slot red', async () => {
        const h = harness(); h.config.status = 409; h.config.result = { error: 'Conflict' };
        h.select(); await h.app.submitFinalBooking();
        assert.equal(h.app.state().keys.length, 0);
        assert.equal(h.tickets.length, 0);
    }],
    ['a fresh cancellation snapshot removes the red state', async () => {
        const h = harness(); h.app.handleData([{ date: '16/09/2026', hour: '12:00' }]);
        const old = h.app.loadExistingBookings();
        h.app.invalidate(); const refresh = h.app.loadExistingBookings();
        h.gets[0].resolve([{ date: '16/09/2026', hour: '12:00' }]); await old; await flush();
        assert.equal(h.gets.length, 2);
        h.gets[1].resolve([]); await refresh;
        assert.equal(h.cell('16/09/2026', '12:00').classList.contains('booked'), false);
    }],
    ['switching stadium clears bookings and selections instead of leaking the previous table', async () => {
        const h = harness(); h.app.handleData([{ date: '16/09/2026', hour: '12:00' }]);
        const old = h.app.loadExistingBookings();
        h.app.switchStadium('st-new');
        assert.equal(h.app.state().keys.length, 0);
        assert.equal(h.app.state().loaded, false);
        const refresh = h.app.loadExistingBookings();
        h.gets[0].resolve([{ date: '16/09/2026', hour: '12:00' }]); await old; await flush();
        assert.equal(h.app.state().keys.length, 0);
        assert(h.gets[1].url.includes('id=st-new'));
        h.gets[1].resolve([]); await refresh;
    }]
];

(async () => {
    let failed = 0;
    for (const [name, run] of tests) {
        try { await run(); console.log('PASS ' + name); }
        catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.message); }
    }
    console.log((tests.length - failed) + '/' + tests.length + ' booking-state regression checks passed');
    process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
