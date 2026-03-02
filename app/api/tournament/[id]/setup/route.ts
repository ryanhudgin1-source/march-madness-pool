import { NextRequest, NextResponse } from "next/server";
import { addTeamsManual, importTeamsFromData, getTournament } from "@/lib/db";
import { fetchTournamentTeams } from "@/lib/espn";
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
      const count = await addTeamsManual(tournamentId, regions);
      return NextResponse.json({ success: true, message: `Added teams with ${count} first-round games` });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
