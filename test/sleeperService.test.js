const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findHighestRankedForPosition } = require('../sleeper/sleeperService.js');
const nfl = require('../nfl.json');

const players = {
    1: { full_name: 'QB Two', fantasy_positions: ['QB'], search_rank: 20 },
    2: { full_name: 'QB One', fantasy_positions: ['QB'], search_rank: 5 },
    3: { full_name: 'Flex Guy', fantasy_positions: ['RB', 'WR'], search_rank: 3 },
    4: { full_name: 'Unranked QB', fantasy_positions: ['QB'], search_rank: null },
    5: { full_name: 'No Positions', fantasy_positions: null, search_rank: 1 },
    6: { full_name: 'Coach', search_rank: 0 },
};

test('picks the lowest search_rank among players eligible at the position', () => {
    assert.equal(findHighestRankedForPosition(players, 'QB').full_name, 'QB One');
});

test('multi-position players count for each of their positions', () => {
    assert.equal(findHighestRankedForPosition(players, 'RB').full_name, 'Flex Guy');
    assert.equal(findHighestRankedForPosition(players, 'WR').full_name, 'Flex Guy');
});

test('skips players with no rank or no fantasy positions', () => {
    const only = { a: players[4], b: players[5], c: players[6] };
    assert.equal(findHighestRankedForPosition(only, 'QB'), null);
});

test('returns null for an unknown position or an empty pool', () => {
    assert.equal(findHighestRankedForPosition(players, 'K'), null);
    assert.equal(findHighestRankedForPosition({}, 'QB'), null);
});

test('ties keep the first player seen', () => {
    const tied = {
        a: { full_name: 'First', fantasy_positions: ['TE'], search_rank: 7 },
        b: { full_name: 'Second', fantasy_positions: ['TE'], search_rank: 7 },
    };
    assert.equal(findHighestRankedForPosition(tied, 'TE').full_name, 'First');
});

test('on the bundled nfl.json, the result is a true minimum for each position', () => {
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'K']) {
        const best = findHighestRankedForPosition(nfl, pos);
        assert.ok(best, `expected a ${pos}`);
        assert.ok(best.fantasy_positions.includes(pos));
        const min = Math.min(
            ...Object.values(nfl)
                .filter((p) => p.fantasy_positions?.includes(pos) && p.search_rank != null)
                .map((p) => p.search_rank)
        );
        assert.equal(best.search_rank, min, pos);
    }
});
