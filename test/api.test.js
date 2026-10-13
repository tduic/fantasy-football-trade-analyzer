// Controller + Express route tests. `node-fetch` (used for every Sleeper API
// call) is replaced with a stub via node:test module mocking, so nothing
// leaves the machine. Requires --experimental-test-module-mocks (see npm test).
const { test, mock, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
let routes = {};
mock.module('node-fetch', {
    defaultExport: async (url) => {
        calls.push(url);
        const handler = routes[url];
        if (!(url in routes)) throw new Error(`unexpected fetch ${url}`);
        if (handler instanceof Error) throw handler;
        if (handler && handler.__status) {
            return { ok: false, status: handler.__status, json: async () => ({}) };
        }
        return { ok: true, status: 200, json: async () => handler };
    },
});

const controller = require('../sleeper/sleeperController.js');
const app = require('../index.js');

const API = 'https://api.sleeper.app/v1/';
let server;
let base;

before(async () => {
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => {
    calls.length = 0;
    routes = { [`${API}state/nfl`]: { season: '2026', league_season: '2026', week: 6 } };
    controller.clearSeasonCache();
});

test('controller.getUser hits /user/:username and returns parsed JSON', async () => {
    routes[`${API}user/tyler`] = { user_id: '42', username: 'tyler' };
    assert.deepEqual(await controller.getUser('tyler'), { user_id: '42', username: 'tyler' });
    assert.deepEqual(calls, [`${API}user/tyler`]);
});

test('controller.getLeaguesByUserId uses the current league_season from /state/nfl', async () => {
    routes[`${API}user/42/leagues/nfl/2026`] = [{ league_id: 'L1' }];
    assert.deepEqual(await controller.getLeaguesByUserId('42'), [{ league_id: 'L1' }]);
    assert.deepEqual(calls, [`${API}state/nfl`, `${API}user/42/leagues/nfl/2026`]);
});

test('controller.getCurrentSeason caches the Sleeper state between calls', async () => {
    routes[`${API}state/nfl`] = { league_season: '2027' };
    assert.equal(await controller.getCurrentSeason(), '2027');
    assert.equal(await controller.getCurrentSeason(), '2027');
    assert.deepEqual(calls, [`${API}state/nfl`]);
});

test('controller.getCurrentSeason falls back to the most recent September when state is unavailable', async () => {
    const now = Date.UTC(2027, 1, 10); // Feb 2027 -> the 2026 season
    routes[`${API}state/nfl`] = new Error('ECONNREFUSED');
    assert.equal(await controller.getCurrentSeason(now), '2026');
    routes[`${API}state/nfl`] = { __status: 503 };
    assert.equal(await controller.getCurrentSeason(now), '2026');
    routes[`${API}state/nfl`] = { league_season: null };
    assert.equal(await controller.getCurrentSeason(now), '2026');
});

test('seasonForDate: the year of the most recent September', () => {
    assert.equal(controller.seasonForDate(new Date(Date.UTC(2026, 8, 1))), '2026');
    assert.equal(controller.seasonForDate(new Date(Date.UTC(2026, 9, 13))), '2026');
    assert.equal(controller.seasonForDate(new Date(Date.UTC(2026, 11, 31))), '2026');
    assert.equal(controller.seasonForDate(new Date(Date.UTC(2027, 0, 1))), '2026');
    assert.equal(controller.seasonForDate(new Date(Date.UTC(2027, 7, 31))), '2026');
});

test('controller.getRostersByLeagueId hits /league/:id/rosters', async () => {
    routes[`${API}league/L1/rosters`] = [{ roster_id: 1, players: ['4046'] }];
    assert.deepEqual(await controller.getRostersByLeagueId('L1'), [{ roster_id: 1, players: ['4046'] }]);
});

test('controller rejects with a 502 SleeperApiError when fetch fails', async () => {
    routes[`${API}user/down`] = new Error('ECONNREFUSED');
    await assert.rejects(controller.getUser('down'), (err) => {
        assert.ok(err instanceof controller.SleeperApiError);
        assert.equal(err.status, 502);
        assert.match(err.message, /ECONNREFUSED/);
        return true;
    });
});

test('controller rejects when Sleeper answers with an HTTP error', async () => {
    routes[`${API}league/L1/rosters`] = { __status: 500 };
    await assert.rejects(controller.getRostersByLeagueId('L1'), { status: 502, message: /HTTP 500/ });
    routes[`${API}league/L2/rosters`] = { __status: 404 };
    await assert.rejects(controller.getRostersByLeagueId('L2'), { status: 404 });
});

test('controller.getBestAtPosition uses the bundled dataset without the network', () => {
    const qb = controller.getBestAtPosition('QB');
    assert.ok(qb.fantasy_positions.includes('QB'));
    assert.equal(calls.length, 0);
});

test('GET /sleeper/user/:user proxies the Sleeper user', async () => {
    routes[`${API}user/tyler`] = { user_id: '42' };
    const res = await fetch(`${base}/sleeper/user/tyler`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { user_id: '42' });
});

test('GET /sleeper/leagues/:username looks up the user then their leagues', async () => {
    routes[`${API}user/tyler`] = { user_id: '42' };
    routes[`${API}user/42/leagues/nfl/2026`] = [{ league_id: 'L1', name: 'Keeper' }];
    const res = await fetch(`${base}/sleeper/leagues/tyler`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [{ league_id: 'L1', name: 'Keeper' }]);
    assert.deepEqual(calls, [`${API}user/tyler`, `${API}state/nfl`, `${API}user/42/leagues/nfl/2026`]);
});

test('GET /sleeper/user/:user returns 502 with a JSON message when Sleeper is unreachable', async () => {
    routes[`${API}user/tyler`] = new Error('ECONNRESET');
    const res = await fetch(`${base}/sleeper/user/tyler`);
    assert.equal(res.status, 502);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const body = await res.json();
    assert.match(body.error, /Sleeper API request failed/);
});

test('GET /sleeper/leagues/:username returns 404 for an unknown user', async () => {
    routes[`${API}user/ghost`] = null; // Sleeper answers 200 with `null`
    const res = await fetch(`${base}/sleeper/leagues/ghost`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Sleeper user "ghost" not found' });
});

test('GET /sleeper/leagues/:username returns 502 when the leagues call fails', async () => {
    routes[`${API}user/tyler`] = { user_id: '42' };
    routes[`${API}user/42/leagues/nfl/2026`] = new Error('ETIMEDOUT');
    const res = await fetch(`${base}/sleeper/leagues/tyler`);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /ETIMEDOUT/);
});

test('GET /sleeper/rosters/:leagueId passes an upstream error status through as JSON', async () => {
    routes[`${API}league/L9/rosters`] = { __status: 500 };
    const res = await fetch(`${base}/sleeper/rosters/L9`);
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'Sleeper API returned HTTP 500' });
});

test('GET /sleeper/rosters/:leagueId proxies league rosters', async () => {
    routes[`${API}league/L9/rosters`] = [{ roster_id: 3 }];
    const res = await fetch(`${base}/sleeper/rosters/L9`);
    assert.deepEqual(await res.json(), [{ roster_id: 3 }]);
});

test('GET /sleeper/best/:position returns the top-ranked player', async () => {
    const res = await fetch(`${base}/sleeper/best/TE`);
    assert.equal(res.status, 200);
    const player = await res.json();
    assert.ok(player.fantasy_positions.includes('TE'));
    assert.equal(calls.length, 0);
});

test('GET /sleeper/best/:position with no match sends an empty body', async () => {
    const res = await fetch(`${base}/sleeper/best/NOPE`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '');
});
