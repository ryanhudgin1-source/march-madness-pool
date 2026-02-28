const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

interface RawTeam {
  name: string;
  seed: number | null;
  region: string;
  espn_id: string;
  logo_url: string;
}

interface RawGame {
  espn_game_id: string;
  date: string;
  status: string;
  region: string;
  teams: { espn_id: string; score: number; winner: boolean }[];
}

function tournamentDates(year: number): string[] {
  const start = new Date(year, 2, 14); // March 14
  return Array.from({ length: 25 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  });
}

function extractRegion(event: Record<string, unknown>): string {
  let text =
    ((event.name as string) ?? "") + " " + ((event.shortName as string) ?? "");
  const comps = (event.competitions as Record<string, unknown>[]) ?? [{}];
  for (const note of (comps[0]?.notes as { headline?: string }[]) ?? []) {
    text += " " + (note.headline ?? "");
  }
  const lower = text.toLowerCase();
  for (const r of ["east", "west", "south", "midwest"]) {
    if (lower.includes(r)) return r.charAt(0).toUpperCase() + r.slice(1);
  }
  return "TBD";
}

export async function fetchTournamentTeams(
  year: number
): Promise<{ teams: RawTeam[]; games: RawGame[] }> {
  const teams: RawTeam[] = [];
  const games: RawGame[] = [];
  const seen = new Set<string>();

  for (const dateStr of tournamentDates(year)) {
    try {
      const resp = await fetch(
        `${ESPN_SCOREBOARD}?groups=100&dates=${dateStr}&limit=100`
      );
      if (!resp.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await resp.json();

      for (const event of data.events ?? []) {
        const gid = event.id as string;
        if (seen.has(gid)) continue;
        seen.add(gid);

        if ((event.season?.type ?? 0) !== 3) continue;

        const comp = event.competitions?.[0] ?? {};
        const competitors = comp.competitors ?? [];
        if (competitors.length !== 2) continue;

        const region = extractRegion(event);
        const gameTeams: RawGame["teams"] = [];

        for (const c of competitors) {
          const td = c.team ?? {};
          const seedRaw = c.curatedRank?.current ?? c.seed;
          let seedVal: number | null = null;
          try {
            seedVal = seedRaw ? parseInt(String(seedRaw), 10) : null;
          } catch {
            seedVal = null;
          }
          if (seedVal && isNaN(seedVal)) seedVal = null;

          const logos = td.logos ?? td.logo ?? [];
          let logo = "";
          if (Array.isArray(logos) && logos.length > 0) {
            logo =
              typeof logos[0] === "string" ? logos[0] : logos[0]?.href ?? "";
          }

          const espnId = String(td.id ?? "");
          gameTeams.push({
            espn_id: espnId,
            score: parseInt(c.score ?? "0", 10) || 0,
            winner: c.winner === true,
          });

          if (espnId && !teams.some((t) => t.espn_id === espnId)) {
            teams.push({
              name: td.displayName ?? td.shortDisplayName ?? "",
              seed: seedVal,
              region,
              espn_id: espnId,
              logo_url: logo,
            });
          }
        }

        games.push({
          espn_game_id: gid,
          date: comp.date ?? "",
          status: comp.status?.type?.name ?? "",
          region,
          teams: gameTeams,
        });
      }
    } catch {
      continue;
    }
  }
  return { teams, games };
}

export async function fetchLatestResults(year: number) {
  const results: {
    winner_espn: string;
    loser_espn: string;
    scores: Record<string, number>;
  }[] = [];

  for (const dateStr of tournamentDates(year)) {
    try {
      const resp = await fetch(
        `${ESPN_SCOREBOARD}?groups=100&dates=${dateStr}&limit=100`
      );
      if (!resp.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await resp.json();

      for (const event of data.events ?? []) {
        const comp = event.competitions?.[0] ?? {};
        if (comp.status?.type?.name !== "STATUS_FINAL") continue;
        const competitors = comp.competitors ?? [];
        if (competitors.length !== 2) continue;

        let winnerEspn = "";
        let loserEspn = "";
        const scores: Record<string, number> = {};
        for (const c of competitors) {
          const eid = String(c.team?.id ?? "");
          scores[eid] = parseInt(c.score ?? "0", 10) || 0;
          if (c.winner) winnerEspn = eid;
          else loserEspn = eid;
        }
        if (winnerEspn) {
          results.push({ winner_espn: winnerEspn, loser_espn: loserEspn, scores });
        }
      }
    } catch {
      continue;
    }
  }
  return results;
}
