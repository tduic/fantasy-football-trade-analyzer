const express = require('express');
const sleeperController = require('./sleeper/sleeperController.js');

const app = express();

// Route handling
app.get('/sleeper/user/:user', async (req, res) => {
    res.send(await sleeperController.getUser(req.params.user));
});

app.get('/sleeper/leagues/:username', async (req, res) => {
    const user = await sleeperController.getUserByUsername(req.params.username);
    const userId = await user.user_id;
    res.send(await sleeperService.getLeaguesByUserId(userId));
});

app.get('/sleeper/rosters/:leagueId', async (req, res) => {
    res.send(await sleeperController.getRostersByLeagueId(req.params.leagueId));
});

app.get('/sleeper/best/:position', async (req, res) => {
    res.send(await sleeperController.getBestAtPosition(req.params.position));
});

// Server setup
app.listen(8080, () => {
    console.log('server listening on port 8080');
});
