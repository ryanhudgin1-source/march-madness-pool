import { neon } from "@neondatabase/serverless";
import { PARTICIPANT_COLORS, MATCHUP_SEEDS } from "./constants";

function q() {
  return neon(process.env.DATABASE_URL!, { fullResults: true });
}

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

export async function initSchema() {
  const sql = q();
  await sql`
    CREATE TABLE IF NOT EXISTS tournaments (
      id SERIAL PRIMARY KEY,
      year INTEGER NOT NULL UNIQUE,
      name VARCHAR(100) DEFAULT 'March Madness',
      status VARCHAR(20) DEFAULT 'setup'
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      seed INTEGER NOT NULL,
      region VARCHAR(20) NOT NULL,
      espn_id VARCHAR(20),
      logo_url VARCHAR(500),
      eliminated BOOLEAN DEFAULT FALSE,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(10),
      draft_order INTEGER,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS draft_picks (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES teams(id) UNIQUE,
      pick_number INTEGER NOT NULL,
      draft_round INTEGER NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      round INTEGER NOT NULL,
      region VARCHAR(20),
      bracket_position INTEGER,
      team1_id INTEGER REFERENCES teams(id),
      team2_id INTEGER REFERENCES teams(id),
      winner_id INTEGER REFERENCES teams(id),
      team1_score INTEGER,
      team2_score INTEGER,
      game_date VARCHAR(30),
      espn_game_id VARCHAR(20),
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE
    )`;
}

/* ------------------------------------------------------------------ */
/*  Tournaments                                                        */
/* ------------------------------------------------------------------ */

export async function getTournaments() {
  const sql = q();
  const { rows } = await sql`SELECT * FROM tournaments ORDER BY year DESC`;
  return rows;
}

export async function getTournament(id: number) {
  const sql = q();
  const { rows } = await sql`SELECT * FROM tournaments WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function createTournament(
  year: number,
  name: string,
  participantNames: string[]
) {
  const sql = q();
  const { rows } = await sql`
    INSERT INTO tournaments (year, name, status)
    VALUES (${year}, ${name}, 'setup')
    ON CONFLICT (year) DO UPDATE SET name = EXCLUDED.name
    RETURNING id`;
  const tid = rows[0].id;

  await sql`DELETE FROM participants WHERE tournament_id = ${tid}`;

  for (let i = 0; i < participantNames.length; i++) {
    const color = PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length];
    await sql`
      INSERT INTO participants (name, color, draft_order, tournament_id)
      VALUES (${participantNames[i].trim()}, ${color}, ${i + 1}, ${tid})`;
  }
  return tid;
}

/* ------------------------------------------------------------------ */
/*  Teams                                                              */
/* ------------------------------------------------------------------ */

export async function getTeamsWithOwners(tournamentId: number) {
  const sql = q();
  const { rows } = await sql`
    SELECT t.*,
           p.name  AS owner_name,
           p.color AS owner_color,
           dp.pick_number
    FROM   teams t
    LEFT JOIN draft_picks dp ON dp.team_id = t.id
    LEFT JOIN participants p  ON p.id = dp.participant_id
    WHERE  t.tournament_id = ${tournamentId}
    ORDER BY t.region, t.seed`;
  return rows;
}

export async function addTeamsManual(
  tournamentId: number,
  regions: Record<string, string[]>
) {
  const sql = q();
  await sql`DELETE FROM draft_picks WHERE team_id IN (SELECT id FROM teams WHERE tournament_id = ${tournamentId})`;
  await sql`DELETE FROM games WHERE tournament_id = ${tournamentId}`;
  await sql`DELETE FROM teams WHERE tournament_id = ${tournamentId}`;

  let position = 0;
  for (const [regionName, teamNames] of Object.entries(regions)) {
    const seedIds: Record<number, number> = {};
    for (let i = 0; i < teamNames.length; i++) {
      const seed = i + 1;
      const { rows } = await sql`
        INSERT INTO teams (name, seed, region, tournament_id)
        VALUES (${teamNames[i].trim()}, ${seed}, ${regionName}, ${tournamentId})
        RETURNING id`;
      seedIds[seed] = rows[0].id;
    }
    for (const [s1, s2] of MATCHUP_SEEDS) {
      await sql`
        INSERT INTO games (round, region, bracket_position, team1_id, team2_id, tournament_id)
        VALUES (1, ${regionName}, ${position}, ${seedIds[s1] ?? null}, ${seedIds[s2] ?? null}, ${tournamentId})`;
      position++;
    }
  }
  return position;
}

export async function importTeamsFromData(
  tournamentId: number,
  teamsRaw: { name: string; seed: number | null; region: string; espn_id: string; logo_url: string }[],
  gamesRaw: { espn_game_id: string; date: string; region: string; teams: { espn_id: string }[] }[]
) {
  const sql = q();
  await sql`DELETE FROM draft_picks WHERE team_id IN (SELECT id FROM teams WHERE tournament_id = ${tournamentId})`;
  await sql`DELETE FROM games WHERE tournament_id = ${tournamentId}`;
  await sql`DELETE FROM teams WHERE tournament_id = ${tournamentId}`;

  const espnToId: Record<string, number> = {};
  for (const t of teamsRaw) {
    const { rows } = await sql`
      INSERT INTO teams (name, seed, region, espn_id, logo_url, tournament_id)
      VALUES (${t.name}, ${t.seed ?? 16}, ${t.region}, ${t.espn_id}, ${t.logo_url}, ${tournamentId})
      RETURNING id`;
    espnToId[t.espn_id] = rows[0].id;
  }

  const dates = [...new Set(gamesRaw.map((g) => g.date.slice(0, 10)))].sort();
  const round1Dates = new Set(dates.slice(0, 4));
  let pos = 0;
  for (const g of gamesRaw) {
    if (!round1Dates.has(g.date.slice(0, 10))) continue;
    const e1 = g.teams[0]?.espn_id;
    const e2 = g.teams[1]?.espn_id;
    await sql`
      INSERT INTO games (round, region, bracket_position, team1_id, team2_id, game_date, espn_game_id, tournament_id)
      VALUES (1, ${g.region}, ${pos}, ${e1 ? espnToId[e1] ?? null : null}, ${e2 ? espnToId[e2] ?? null : null}, ${g.date}, ${g.espn_game_id}, ${tournamentId})`;
    pos++;
  }
  return { teamCount: Object.keys(espnToId).length, gameCount: pos };
}

/* ------------------------------------------------------------------ */
/*  Draft                                                              */
/* ------------------------------------------------------------------ */

export async function getParticipants(tournamentId: number) {
  const sql = q();
  const { rows } = await sql`
    SELECT * FROM participants
    WHERE tournament_id = ${tournamentId}
    ORDER BY draft_order`;
  return rows;
}

export async function getDraftPicks(tournamentId: number) {
  const sql = q();
  const { rows } = await sql`
    SELECT dp.*, t.name AS team_name, t.seed, t.region,
           p.name AS participant_name, p.color AS participant_color
    FROM   draft_picks dp
    JOIN   teams t ON t.id = dp.team_id
    JOIN   participants p ON p.id = dp.participant_id
    WHERE  t.tournament_id = ${tournamentId}
    ORDER BY dp.pick_number`;
  return rows;
}

export async function makeDraftPick(tournamentId: number, teamId: number) {
  const sql = q();
  const { rows: participants } = await sql`
    SELECT * FROM participants WHERE tournament_id = ${tournamentId} ORDER BY draft_order`;
  const n = participants.length;
  if (n === 0) throw new Error("No participants");

  const { rows: countRows } = await sql`
    SELECT COUNT(*)::int AS c FROM draft_picks dp
    JOIN teams t ON t.id = dp.team_id WHERE t.tournament_id = ${tournamentId}`;
  const pickNumber = countRows[0].c + 1;

  const { rows: dup } = await sql`SELECT id FROM draft_picks WHERE team_id = ${teamId}`;
  if (dup.length > 0) throw new Error("Team already drafted");

  const draftRound = Math.ceil(pickNumber / n);
  const pos = (pickNumber - 1) % n;
  const idx = draftRound % 2 === 1 ? pos : n - 1 - pos;
  const participant = participants[idx];

  await sql`
    INSERT INTO draft_picks (participant_id, team_id, pick_number, draft_round)
    VALUES (${participant.id}, ${teamId}, ${pickNumber}, ${draftRound})`;

  const { rows: tc } = await sql`
    SELECT COUNT(*)::int AS c FROM teams WHERE tournament_id = ${tournamentId}`;
  const total = tc[0].c;
  if (pickNumber >= total) {
    await sql`UPDATE tournaments SET status = 'active' WHERE id = ${tournamentId}`;
  }

  const np = pickNumber + 1;
  const nr = Math.ceil(np / n);
  const npos = (np - 1) % n;
  const nidx = nr % 2 === 1 ? npos : n - 1 - npos;
  const next = nidx < n ? participants[nidx] : null;

  return {
    pickNumber,
    draftRound,
    participant: { name: participant.name, color: participant.color },
    nextDrafter: next ? { name: next.name, color: next.color } : null,
    draftComplete: pickNumber >= total,
  };
}

export async function undoDraftPick(tournamentId: number) {
  const sql = q();
  const { rows } = await sql`
    SELECT dp.id, dp.team_id FROM draft_picks dp
    JOIN teams t ON t.id = dp.team_id
    WHERE t.tournament_id = ${tournamentId}
    ORDER BY dp.pick_number DESC LIMIT 1`;
  if (rows.length === 0) throw new Error("No picks to undo");
  await sql`DELETE FROM draft_picks WHERE id = ${rows[0].id}`;
  return rows[0].team_id;
}

/* ------------------------------------------------------------------ */
/*  Games & scoring                                                    */
/* ------------------------------------------------------------------ */

export async function advanceWinner(
  gameId: number,
  winnerId: number,
  tournamentId: number
) {
  const sql = q();
  const { rows } = await sql`SELECT * FROM games WHERE id = ${gameId}`;
  if (rows.length === 0) throw new Error("Game not found");
  const game = rows[0];

  await sql`UPDATE games SET winner_id = ${winnerId} WHERE id = ${gameId}`;

  const loserId = winnerId === game.team1_id ? game.team2_id : game.team1_id;
  if (loserId) {
    await sql`UPDATE teams SET eliminated = TRUE WHERE id = ${loserId}`;
  }

  if (game.round < 6) {
    const nextRound = game.round + 1;
    const nextPos = Math.floor(game.bracket_position / 2);
    const nextRegion = nextRound <= 4 ? game.region : null;

    const { rows: existing } = await sql`
      SELECT id FROM games
      WHERE tournament_id = ${tournamentId}
        AND round = ${nextRound}
        AND bracket_position = ${nextPos}`;

    if (existing.length === 0) {
      if (game.bracket_position % 2 === 0) {
        await sql`
          INSERT INTO games (round, region, bracket_position, team1_id, tournament_id)
          VALUES (${nextRound}, ${nextRegion}, ${nextPos}, ${winnerId}, ${tournamentId})`;
      } else {
        await sql`
          INSERT INTO games (round, region, bracket_position, team2_id, tournament_id)
          VALUES (${nextRound}, ${nextRegion}, ${nextPos}, ${winnerId}, ${tournamentId})`;
      }
    } else {
      if (game.bracket_position % 2 === 0) {
        await sql`UPDATE games SET team1_id = ${winnerId} WHERE id = ${existing[0].id}`;
      } else {
        await sql`UPDATE games SET team2_id = ${winnerId} WHERE id = ${existing[0].id}`;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Full tournament data (single call for dashboard)                   */
/* ------------------------------------------------------------------ */

export async function getFullTournamentData(tournamentId: number) {
  const sql = q();
  const [tRes, teamsRes, partsRes, gamesRes] = await Promise.all([
    sql`SELECT * FROM tournaments WHERE id = ${tournamentId}`,
    sql`
      SELECT t.*, p.name AS owner_name, p.color AS owner_color, dp.pick_number
      FROM teams t
      LEFT JOIN draft_picks dp ON dp.team_id = t.id
      LEFT JOIN participants p ON p.id = dp.participant_id
      WHERE t.tournament_id = ${tournamentId}
      ORDER BY t.region, t.seed`,
    sql`SELECT * FROM participants WHERE tournament_id = ${tournamentId} ORDER BY draft_order`,
    sql`SELECT * FROM games WHERE tournament_id = ${tournamentId} ORDER BY round, bracket_position`,
  ]);

  const teams = teamsRes.rows;
  const games = gamesRes.rows;
  const participants = partsRes.rows;

  const leaderboard = participants
    .map((p) => {
      const owned = teams.filter((t) => t.owner_name === p.name);
      let totalPoints = 0;
      let teamsAlive = 0;
      let hasChampion = false;

      const teamDetails = owned.map((team) => {
        const wins = games.filter((g) => g.winner_id === team.id);
        const points = wins.reduce(
          (s: number, w) => s + team.seed * (w.round as number),
          0 as number
        );
        totalPoints += points;
        if (!team.eliminated) teamsAlive++;
        const champGame = games.find(
          (g) => g.round === 6 && g.winner_id === team.id
        );
        if (champGame) hasChampion = true;
        return {
          id: team.id,
          name: team.name,
          seed: team.seed,
          region: team.region,
          points,
          alive: !team.eliminated,
          display: `(${team.seed}) ${team.name}`,
        };
      });
      teamDetails.sort((a, b) => b.points - a.points);

      return {
        id: p.id,
        name: p.name,
        color: p.color,
        totalPoints,
        teamsAlive,
        hasChampion,
        teams: teamDetails,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const upcoming = games
    .filter((g) => !g.winner_id && g.team1_id && g.team2_id)
    .map((g) => {
      const t1 = teams.find((t) => t.id === g.team1_id);
      const t2 = teams.find((t) => t.id === g.team2_id);
      return { ...g, team1Detail: t1, team2Detail: t2 };
    });

  const gamesByRound: Record<number, typeof games> = {};
  for (const g of games) {
    (gamesByRound[g.round] ??= []).push(g);
  }

  return {
    tournament: tRes.rows[0] ?? null,
    teams,
    participants,
    games,
    leaderboard,
    upcoming,
    gamesByRound,
  };
}
