import { NextRequest, NextResponse } from "next/server";
import { advanceWinner, getTournament, getTeamsWithOwners } from "@/lib/db";
import { fetchLatestResults } from "@/lib/espn";
import { neon } from "@neondatabase/serverless";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const tournamentId = Number(params.id);
  const body = await req.json();
  const action: string = body.action;

  try {
    if (action === "advance") {
      await advanceWinner(Number(body.gameId), Number(body.winnerId), tournamentId);
      return NextResponse.json({ success: true });
    }

    if (action === "refresh") {
      const tournament = await getTournament(tournamentId);
      if (!tournament)
        return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

      const dbTeams = await getTeamsWithOwners(tournamentId);
      const espnMap: Record<string, number> = {};
      for (const row of dbTeams) {
        if (row.espn_id) espnMap[row.espn_id] = row.id;
      }

      const results = await fetchLatestResults(tournament.year);
      const sql = neon(process.env.DATABASE_URL!, { fullResults: true });
      let updated = 0;

      for (const r of results) {
        const winnerId = espnMap[r.winner_espn];
        const loserId = espnMap[r.loser_espn];
        if (!winnerId) continue;

        const { rows: games } = await sql`
          SELECT id FROM games
          WHERE tournament_id = ${tournamentId}
            AND winner_id IS NULL
            AND ((team1_id = ${winnerId} AND team2_id = ${loserId || null})
              OR (team2_id = ${winnerId} AND team1_id = ${loserId || null}))
          LIMIT 1`;

        if (games.length > 0) {
          await advanceWinner(games[0].id, winnerId, tournamentId);
          updated++;
        }
      }
      return NextResponse.json({ success: true, gamesUpdated: updated });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
