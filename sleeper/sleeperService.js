const scoreTrade = (before, after) => {

}

/**
 * logic for defining a good trade (v1)
 * prior to trade a team will be defined as team X and after will be X'
 * for a trade to be worthwhile X' must be better off than X
 * this will be defined as having a higher starting average than before
 * if the starters average is unchanged the bench average must improve
 * inputs to function: X, X'
 * need to have ability to determine who will be on active lineup ->
 *      highest score for season taking projections + actuals into account
 */

function createLineup(players) {
    var playerScoresRemaining = scorePlayers(players);

}

function findHighestRankedForPosition(players, position) {
    var bestPlayer = null;
    var bestScore = 100000000;
    for (let [id, player] of Object.entries(players)) {
        if (player.fantasy_positions?.includes(position) && player.search_rank != null && player.search_rank < bestScore) {
            bestPlayer = player;
            bestScore = player.search_rank;
        }
    }
    return bestPlayer;
}

function scorePlayers(players) {
    // map player to stats
    // return actual scores for weeks played + projections for weeks remaining
}

module.exports = { findHighestRankedForPosition };
