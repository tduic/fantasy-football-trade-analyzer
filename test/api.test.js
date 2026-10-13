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
        if (!handler) throw new Error(`unexpected fetch ${url}`);
        if (handler instanceof Error) throw handler;
        return { json: async () => handler };
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
    routes = {};
});

test('controller.getUser hits /user/:username and returns parsed JSON', async () => {
    routes[`${API}user/tyler`] = { user_id: '42', username: 'tyler' };
    assert.deepEqual(await controller.getUser('tyler'), { user_id: '42', username: 'tyler' });
    assert.deepEqual(calls, [`${API}user/tyler`]);
});

test('controller.getLeaguesByUserId hits the 2023 NFL leagues endpoint', async () => {
    routes[`${API}user/42/leagues/nfl/2023`] = [{ league_id: 'L1' }];
    assert.deepEqual(await controller.getLeaguesByUserId('42'), [{ league_id: 'L1' }]);
});

test('controller.getRostersByLeagueId hits /league/:id/rosters', async () => {
    routes[`${API}league/L1/rosters`] = [{ roster_id: 1, players: ['4046'] }];
    assert.deepEqual(await controller.getRostersByLeagueId('L1'), [{ roster_id: 1, players: ['4046'] }]);
});

test('controller resolves to the error (does not throw) when fetch fails', async () => {
    routes[`${API}user/down`] = new Error('ECONNREFUSED');
    const result = await controller.getUser('down');
    assert.ok(result instanceof Error);
    assert.match(result.message, /ECONNREFUSED/);
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
    routes[`${API}user/42/leagues/nfl/2023`] = [{ league_id: 'L1', name: 'Keeper' }];
    const res = await fetch(`${base}/sleeper/leagues/tyler`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [{ league_id: 'L1', name: 'Keeper' }]);
    assert.deepEqual(calls, [`${API}user/tyler`, `${API}user/42/leagues/nfl/2023`]);
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
