const express = require('express');
const sleeperController = require('./sleeper/sleeperController.js');

const app = express();

// Send the handler's result, or a JSON error with a matching HTTP status
// (Sleeper failures carry their own status; anything else is a 500).
const handle = (fn) => async (req, res) => {
    try {
        res.send(await fn(req));
    } catch (err) {
        if (err.status) {
            res.status(err.status).json({ error: err.message });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

// Route handling
app.get('/sleeper/user/:user', handle((req) => sleeperController.getUser(req.params.user)));

app.get('/sleeper/leagues/:username', handle(async (req) => {
    const user = await sleeperController.getUser(req.params.username);
    if (!user || !user.user_id) {
        throw new sleeperController.SleeperApiError(`Sleeper user "${req.params.username}" not found`, 404);
    }
    return sleeperController.getLeaguesByUserId(user.user_id);
}));

app.get('/sleeper/rosters/:leagueId', handle((req) => sleeperController.getRostersByLeagueId(req.params.leagueId)));

app.get('/sleeper/best/:position', handle((req) => sleeperController.getBestAtPosition(req.params.position)));

// Server setup (only when run directly, so tests can import the app)
if (require.main === module) {
    app.listen(8080, () => {
        console.log('server listening on port 8080');
    });
}

module.exports = app;
