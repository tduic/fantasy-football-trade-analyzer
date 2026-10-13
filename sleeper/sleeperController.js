const sleeperService = require('./sleeperService.js');
const nfl = require('../nfl.json');

const BASE_PATH = "https://api.sleeper.app/v1/";

const fetch = (...args) => import('node-fetch').then(({default:fetch}) => fetch(...args));

// A failed Sleeper call. `status` is the HTTP status this API should answer
// with: 404 when Sleeper says the resource doesn't exist, otherwise 502.
class SleeperApiError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.name = 'SleeperApiError';
        this.status = status;
    }
}

async function getJson(path) {
    let resp;
    try {
        resp = await fetch(BASE_PATH + path);
    } catch (err) {
        throw new SleeperApiError(`Sleeper API request failed: ${err.message}`);
    }
    if (!resp.ok) {
        throw new SleeperApiError(`Sleeper API returned HTTP ${resp.status}`, resp.status === 404 ? 404 : 502);
    }
    try {
        return await resp.json();
    } catch (err) {
        throw new SleeperApiError('Sleeper API returned invalid JSON');
    }
}

async function getUser(username) {
    return getJson('user/' + username);
}

// ---- current NFL season -------------------------------------------------
// Sleeper's /state/nfl reports the active `league_season`. It changes once a
// year, so it is cached for an hour instead of costing a request per call.
const SEASON_TTL_MS = 60 * 60 * 1000;
let seasonCache = null; // { season, expires }

// Fallback: the year of the most recent September (seasons start in Sept).
function seasonForDate(date) {
    const year = date.getUTCFullYear();
    return String(date.getUTCMonth() >= 8 ? year : year - 1);
}

async function getCurrentSeason(now = Date.now()) {
    if (seasonCache && seasonCache.expires > now) return seasonCache.season;
    try {
        const state = await getJson('state/nfl');
        const season = state && state.league_season != null ? String(state.league_season) : '';
        if (/^\d{4}$/.test(season)) {
            seasonCache = { season, expires: now + SEASON_TTL_MS };
            return season;
        }
    } catch (err) {
        // Sleeper state unavailable: use the date-based season below.
    }
    return seasonForDate(new Date(now));
}

function clearSeasonCache() {
    seasonCache = null;
}

async function getLeaguesByUserId(userId) {
    const season = await getCurrentSeason();
    return getJson('user/' + userId + '/leagues/nfl/' + season);
}

async function getRostersByLeagueId(leagueId) {
    return getJson('league/' + leagueId + '/rosters');
}

function getBestAtPosition(position) {
    return sleeperService.findHighestRankedForPosition(nfl, position);
}

module.exports = {
    getUser,
    getLeaguesByUserId,
    getRostersByLeagueId,
    getBestAtPosition,
    getCurrentSeason,
    seasonForDate,
    clearSeasonCache,
    SleeperApiError,
};
