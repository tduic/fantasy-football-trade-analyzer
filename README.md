# fantasy-football-trade-analyzer

A Node.js/Express REST API for analyzing fantasy football trades using data from the [Sleeper](https://sleeper.com) platform.

## Overview

This service exposes HTTP endpoints that fetch fantasy football data from the public Sleeper API (users, leagues, and rosters) and combines it with a bundled NFL player dataset (`nfl.json`) to rank players by position and lay the groundwork for evaluating whether a proposed trade improves a team.

## Features

- Look up a Sleeper user by username
- List a user's NFL leagues
- Fetch all rosters in a given league
- Find the highest-ranked available player at a given position from the local NFL player dataset
- Trade-scoring logic (in progress) that compares a team before and after a trade based on projected and actual player scores

## API Endpoints

The server listens on port `8080`.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/sleeper/user/:user` | Get a Sleeper user by username |
| GET | `/sleeper/leagues/:username` | Get the NFL leagues for a user |
| GET | `/sleeper/rosters/:leagueId` | Get all rosters in a league |
| GET | `/sleeper/best/:position` | Get the highest-ranked player for a position |

## Tech Stack

- **Node.js** (CommonJS)
- **Express** for routing and the HTTP server
- **node-fetch** for calling the Sleeper API
- **nodemon** for development
- Bundled `nfl.json` player dataset

## Getting Started

### Prerequisites

- Node.js installed

### Installation

```bash
npm install
```

### Running

```bash
node index.js
```

Or, with auto-reload during development:

```bash
npx nodemon index.js
```

The server will start on `http://localhost:8080`.

### Example

```bash
curl http://localhost:8080/sleeper/best/QB
```

## Project Structure

```
index.js                    # Express app and route definitions
sleeper/sleeperController.js # Calls the Sleeper API and the service layer
sleeper/sleeperService.js    # Player ranking and trade-scoring logic
nfl.json                     # Local NFL player dataset
```

## Status

Early-stage / work in progress. Core data-fetching endpoints work; the trade-scoring and lineup-building logic is still being developed.
