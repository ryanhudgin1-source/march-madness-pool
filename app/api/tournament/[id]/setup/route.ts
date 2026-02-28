import { NextRequest, NextResponse } from "next/server";
import { addTeamsManual, importTeamsFromData, getTournament, getTeamsWithOwners } from "@/lib/db";
import { fetchTournamentTeams } from "@/lib/espn";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tournamentId = Number(params.id);
  const body = await req.json();
  const action: string = body.action;

  // #region agent log
  const debugInfo: Record<string, unknown> = { tournamentId, paramsId: params.id, action };
  // #endregion

  try {
    if (action === "import-espn") {
      const tournament = await getTournament(tournamentId);
      if (!tournament)
        return NextResponse.json({ success: false, message: "Tournament not found" }, { status: 404 });

      const { teams, games } = await fetchTournamentTeams(tournament.year);
      if (teams.length === 0)
        return NextResponse.json(
          { success: false, message: "No teams found. Bracket may not be available yet." },
          { status: 400 }
        );

      const result = await importTeamsFromData(tournamentId, teams, games);
      return NextResponse.json({
        success: true,
        message: `Imported ${result.teamCount} teams and ${result.gameCount} games`,
      });
    }

    if (action === "manual") {
      const regions: Record<string, string[]> = body.regions;
      // #region agent log
      debugInfo.regionKeys = Object.keys(regions);
      debugInfo.regionCounts = Object.fromEntries(Object.entries(regions).map(([k, v]) => [k, v.length]));
      // #endregion
      const count = await addTeamsManual(tournamentId, regions);
      // #region agent log
      debugInfo.gamesCreated = count;
      const verifyTeams = await getTeamsWithOwners(tournamentId);
      debugInfo.teamsAfterInsert = verifyTeams.length;
      // #endregion
      return NextResponse.json({
        success: true,
        message: `Added teams with ${count} first-round games`,
        // #region agent log
        debug: debugInfo,
        // #endregion
      });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    // #region agent log
    debugInfo.error = msg;
    debugInfo.stack = e instanceof Error ? e.stack : undefined;
    // #endregion
    return NextResponse.json({ success: false, message: msg, debug: debugInfo }, { status: 500 });
  }
}
