const sleeperService = require('./sleeperService.js');
const nfl = require('../nfl.json');

const BASE_PATH = "https://api.sleeper.app/v1/";

const fetch = (...args) => import('node-fetch').then(({default:fetch}) => fetch(...args));

async function getUser(username) {
    return await fetch(BASE_PATH + 'user/' + username)
        .then(resp => resp.json())
        .catch(err => err);
}

async function getLeaguesByUserId(userId) {
    return await fetch(BASE_PATH + 'user/' + userId + "/leagues/nfl/2023")
        .then(resp => resp.json())
        .catch(err => err);
}

async function getRostersByLeagueId(leagueId) {
    return await fetch(BASE_PATH + 'league/' + leagueId + '/rosters')
        .then(resp => resp.json())
        .catch(err => err);
}

function getBestAtPosition(position) {
    return sleeperService.findHighestRankedForPosition(nfl, position);
}

module.exports = { getUser, getLeaguesByUserId, getRostersByLeagueId, getBestAtPosition };
