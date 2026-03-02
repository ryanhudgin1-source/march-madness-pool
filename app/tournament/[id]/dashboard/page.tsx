"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ROUND_NAMES } from "@/lib/constants";
import { useAdmin } from "../../../admin-context";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Tab = "leaderboard" | "bracket" | "games" | "teams" | "whatif";

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, adminKey } = useAdmin();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [roundFilter, setRoundFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);

  // What-If state
  const [wiGames, setWiGames] = useState<any[]>([]);
  const [wiTeams, setWiTeams] = useState<any[]>([]);
  const [wiDirty, setWiDirty] = useState(false);

  const loadData = useCallback(async () => {
    const resp = await fetch(`/api/tournament/${id}/data?t=${Date.now()}`);
    const d = await resp.json();
    setData(d);
    resetWhatIf(d);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetWhatIf(src?: any) {
    const d = src ?? data;
    if (!d) return;
    setWiGames(JSON.parse(JSON.stringify(d.games ?? [])));
    setWiTeams(JSON.parse(JSON.stringify(d.teams ?? [])));
    setWiDirty(false);
  }

  async function refreshScores() {
    const resp = await fetch(`/api/tournament/${id}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ action: "refresh" }),
    });
    const result = await resp.json();
    if (!result.success) {
      alert(result.message);
      return;
    }
    await loadData();
    alert(`Scores refreshed! ${result.gamesUpdated ?? 0} game(s) updated.`);
  }

  async function advanceWinner(gameId: number, winnerId: number) {
    await fetch(`/api/tournament/${id}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ action: "advance", gameId, winnerId }),
    });
    await loadData();
  }

  // ---------- What-If helpers ----------

  function wiPickWinner(gameId: number, winnerId: number) {
    const games = [...wiGames];
    const teams = [...wiTeams];
    const gi = games.findIndex((g: any) => g.id === gameId);
    if (gi === -1) return;
    const game = { ...games[gi] };

    game.winner_id = winnerId;
    games[gi] = game;

    const loserId = winnerId === game.team1_id ? game.team2_id : game.team1_id;
    if (loserId) {
      const li = teams.findIndex((t: any) => t.id === loserId);
      if (li !== -1) teams[li] = { ...teams[li], eliminated: true };
    }

    if (game.round < 6) {
      const nextRound = game.round + 1;
      const nextPos = Math.floor(game.bracket_position / 2);
      const slot = game.bracket_position % 2 === 0 ? "team1_id" : "team2_id";
      const existing = games.findIndex(
        (g: any) => g.round === nextRound && g.bracket_position === nextPos
      );
      if (existing !== -1) {
        games[existing] = { ...games[existing], [slot]: winnerId };
      } else {
        const nextRegion = nextRound <= 4 ? game.region : null;
        games.push({
          id: -(games.length + 1),
          round: nextRound,
          region: nextRegion,
          bracket_position: nextPos,
          team1_id: slot === "team1_id" ? winnerId : null,
          team2_id: slot === "team2_id" ? winnerId : null,
          winner_id: null,
          tournament_id: game.tournament_id,
        });
      }
    }

    setWiGames(games);
    setWiTeams(teams);
    setWiDirty(true);
  }

  function buildWiLeaderboard() {
    if (!data) return [];
    const participants: any[] = data.participants ?? [];
    return participants
      .map((p: any) => {
        const owned = wiTeams.filter((t: any) => t.owner_name === p.name);
        let totalPoints = 0;
        let teamsAlive = 0;
        let hasChampion = false;
        for (const team of owned) {
          const wins = wiGames.filter((g: any) => g.winner_id === team.id);
          const pts = wins.reduce((s: number, w: any) => s + team.seed * (w.round as number), 0);
          totalPoints += pts;
          if (!team.eliminated) teamsAlive++;
          if (wiGames.find((g: any) => g.round === 6 && g.winner_id === team.id)) hasChampion = true;
        }
        return { id: p.id, name: p.name, color: p.color, totalPoints, teamsAlive, hasChampion };
      })
      .sort((a: any, b: any) => b.totalPoints - a.totalPoints);
  }

  // ---------- Chart helpers ----------

  function buildChartData() {
    if (!data) return { series: [], maxPts: 0, rounds: [] };
    const games: any[] = data.games ?? [];
    const teams: any[] = data.teams ?? [];
    const participants: any[] = data.participants ?? [];

    const activeRounds = [...new Set(games.filter((g: any) => g.winner_id).map((g: any) => g.round as number))].sort((a, b) => a - b);
    const rounds = [0, ...activeRounds];

    const series = participants.map((p: any) => {
      const owned = teams.filter((t: any) => t.owner_name === p.name);
      const cumulative = rounds.map((rd) => {
        let pts = 0;
        for (const team of owned) {
          const wins = games.filter((g: any) => g.winner_id === team.id && g.round <= rd);
          pts += wins.reduce((s: number, w: any) => s + team.seed * (w.round as number), 0);
        }
        return pts;
      });
      return { name: p.name, color: p.color, data: cumulative };
    });

    const maxPts = Math.max(1, ...series.map((s) => Math.max(...s.data)));

    return { series, maxPts, rounds };
  }

  // ---------- End helpers ----------

  if (loading || !data)
    return <p className="text-white/40 text-center py-12">Loading...</p>;

  const { tournament, teams, leaderboard, upcoming, gamesByRound } = data;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "leaderboard", label: "Leaderboard", icon: "&#9776;" },
    { key: "bracket", label: "Bracket", icon: "&#9670;" },
    { key: "games", label: "Games", icon: "&#128197;" },
    { key: "teams", label: "Teams", icon: "&#128101;" },
    { key: "whatif", label: "What-If", icon: "&#9889;" },
  ];

  const filteredUpcoming =
    roundFilter === "all"
      ? upcoming
      : upcoming.filter((g: any) => g.round === Number(roundFilter));

  // What-If derived data
  const wiGamesByRound: Record<number, any[]> = {};
  for (const g of wiGames) {
    (wiGamesByRound[g.round] ??= []).push(g);
  }
  const wiLeaderboard = buildWiLeaderboard();

  const realRankMap: Record<number, { rank: number; pts: number }> = {};
  leaderboard.forEach((p: any, i: number) => {
    realRankMap[p.id] = { rank: i + 1, pts: p.totalPoints };
  });

  // Chart data
  const chart = buildChartData();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={refreshScores}
              className="text-sm px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
            >
              Refresh Scores
            </button>
          )}
          <Link
            href={`/tournament/${id}/draft`}
            className="text-sm px-3 py-1 rounded-lg border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 transition-colors"
          >
            Draft
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 glass-subtle rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.key
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            <span dangerouslySetInnerHTML={{ __html: t.icon }} />{" "}
            {t.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Tab */}
      {tab === "leaderboard" && (
        <div>
          {/* Chart toggle */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowChart(!showChart)}
              className="text-sm px-3 py-1 rounded-lg border border-white/20 text-white/70 hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <span>{showChart ? "\u25BC" : "\u25B6"}</span>
              {showChart ? "Hide Graph" : "Points Graph"}
            </button>
          </div>

          {/* SVG Points Chart */}
          {showChart && chart.rounds.length > 1 && (
            <div className="glass rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-white/70 mb-3">Points by Round</h3>
              <div className="overflow-x-auto">
                <PointsChart series={chart.series} maxPts={chart.maxPts} rounds={chart.rounds} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {chart.series.map((s: any) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-white/70">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          {showChart && chart.rounds.length <= 1 && (
            <div className="glass rounded-xl p-6 mb-4 text-center text-white/40 text-sm">
              No completed rounds yet to graph.
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 glass rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-sm text-white/50">
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-center">Points</th>
                    <th className="p-3 text-center">Alive</th>
                    <th className="p-3 text-center">Champ</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((p: any, i: number) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedParticipant(p)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-bold text-white/70">{i + 1}</td>
                      <td className="p-3 text-white/90">
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                        {p.hasChampion && (
                          <span className="ml-1">&#127942;</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-white">
                        {p.totalPoints}
                      </td>
                      <td className="p-3 text-center text-white/60">
                        {p.teamsAlive}/{p.teams.length}
                      </td>
                      <td className="p-3 text-center">
                        {p.hasChampion ? (
                          <span className="text-emerald-400">&#10003;</span>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-2 glass rounded-xl p-4">
              {selectedParticipant ? (
                <>
                  <h3
                    className="font-bold text-lg mb-2"
                    style={{ color: selectedParticipant.color }}
                  >
                    {selectedParticipant.name}
                  </h3>
                  <p className="text-sm text-white/50 mb-3">
                    Total: {selectedParticipant.totalPoints} pts
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 border-b border-white/10">
                        <th className="py-1 text-left">Team</th>
                        <th className="py-1 text-center">Seed</th>
                        <th className="py-1 text-center">Pts</th>
                        <th className="py-1 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedParticipant.teams.map((t: any) => (
                        <tr
                          key={t.id}
                          className={`border-b border-white/5 ${t.alive ? "" : "opacity-40"}`}
                        >
                          <td className={`py-1 text-white/80 ${t.alive ? "" : "line-through"}`}>
                            {t.name}
                          </td>
                          <td className="py-1 text-center text-white/60">{t.seed}</td>
                          <td className="py-1 text-center font-bold text-white">
                            {t.points}
                          </td>
                          <td className="py-1 text-center">
                            {t.alive ? (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                                Alive
                              </span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                                Out
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-white/40 text-center">
                  Click a participant to see their teams.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bracket Tab */}
      {tab === "bracket" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {Object.keys(gamesByRound)
              .map(Number)
              .sort((a, b) => a - b)
              .map((round) => (
                <div key={round} className="min-w-[220px]">
                  <div className="text-center text-xs font-bold text-white/50 uppercase glass-subtle rounded-lg py-1.5 mb-2">
                    {ROUND_NAMES[round] ?? `Round ${round}`}
                  </div>
                  {gamesByRound[round].map((g: any) => {
                    const t1 = teams.find((t: any) => t.id === g.team1_id);
                    const t2 = teams.find((t: any) => t.id === g.team2_id);
                    const complete = g.winner_id != null;
                    const canPick = !complete && t1 && t2 && isAdmin;

                    return (
                      <div
                        key={g.id}
                        className={`bracket-game ${complete ? "complete" : ""}`}
                      >
                        {[
                          { team: t1, slot: "team1" },
                          { team: t2, slot: "team2" },
                        ].map(({ team }, si) => {
                          if (!team)
                            return (
                              <div key={si} className="bracket-team tbd">
                                TBD
                              </div>
                            );
                          const isWinner = g.winner_id === team.id;
                          const isLoser =
                            g.winner_id && g.winner_id !== team.id;
                          return (
                            <div
                              key={si}
                              className={`bracket-team ${isWinner ? "winner" : ""} ${isLoser ? "loser" : ""}`}
                              style={{ cursor: canPick ? "pointer" : "default" }}
                              onClick={() =>
                                canPick && advanceWinner(g.id, team.id)
                              }
                            >
                              <span
                                className="owner-stripe"
                                style={{
                                  backgroundColor:
                                    team.owner_color ?? "#475569",
                                }}
                              />
                              <span className="flex-1 truncate text-sm text-white/80">
                                ({team.seed}) {team.name}
                              </span>
                              <span
                                className="text-xs truncate font-medium"
                                style={{ color: team.owner_color ?? "#64748b" }}
                              >
                                {team.owner_name ?? ""}
                              </span>
                            </div>
                          );
                        })}
                        {!complete && t1 && t2 && (
                          <div className="text-center text-[10px] text-white/30">
                            vs
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Games Tab */}
      {tab === "games" && (
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-end mb-3">
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="rounded-lg px-3 py-1 text-sm"
            >
              <option value="all">All Rounds</option>
              {Object.entries(ROUND_NAMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {filteredUpcoming.length === 0 ? (
            <p className="text-white/40 text-center">No upcoming games.</p>
          ) : (
            filteredUpcoming.map((g: any) => {
              const t1 = g.team1Detail;
              const t2 = g.team2Detail;
              return (
                <div key={g.id} className="matchup-card">
                  <div className="text-xs text-white/40 uppercase mb-2 font-medium">
                    {ROUND_NAMES[g.round] ?? `Round ${g.round}`}
                    {g.region ? ` - ${g.region}` : ""}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="matchup-team-slot">
                      <span
                        className="owner-stripe"
                        style={{
                          backgroundColor: t1?.owner_color ?? "#475569",
                        }}
                      />
                      <div>
                        <div className="font-bold text-white/90">
                          ({t1?.seed}) {t1?.name}
                        </div>
                        <small style={{ color: t1?.owner_color ?? "#64748b" }} className="font-medium">
                          {t1?.owner_name ?? "Undrafted"}
                        </small>
                      </div>
                    </div>
                    <span className="text-white/30 font-bold text-sm shrink-0">
                      VS
                    </span>
                    <div className="matchup-team-slot">
                      <span
                        className="owner-stripe"
                        style={{
                          backgroundColor: t2?.owner_color ?? "#475569",
                        }}
                      />
                      <div>
                        <div className="font-bold text-white/90">
                          ({t2?.seed}) {t2?.name}
                        </div>
                        <small style={{ color: t2?.owner_color ?? "#64748b" }} className="font-medium">
                          {t2?.owner_name ?? "Undrafted"}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Teams Tab */}
      {tab === "teams" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {leaderboard.map((p: any) => (
            <div
              key={p.id}
              className="glass rounded-xl overflow-hidden"
            >
              <div
                className="px-3 py-2 flex items-center justify-between"
                style={{ borderBottom: `3px solid ${p.color}` }}
              >
                <span className="font-bold" style={{ color: p.color }}>
                  {p.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-medium">
                  {p.totalPoints} pts
                </span>
              </div>
              <div className="p-2">
                {p.teams.map((t: any) => (
                  <div
                    key={t.id}
                    className={`roster-item ${t.alive ? "" : "eliminated"}`}
                  >
                    <span className="text-white/80">{t.display}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${t.alive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/40"}`}
                    >
                      {t.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* What-If Tab */}
      {tab === "whatif" && (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 overflow-x-auto pb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white/80">Simulate Games</h2>
              <button
                onClick={() => resetWhatIf()}
                disabled={!wiDirty}
                className="text-sm px-3 py-1 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                Reset
              </button>
            </div>
            <div className="flex gap-3 min-w-max">
              {Object.keys(wiGamesByRound)
                .map(Number)
                .sort((a, b) => a - b)
                .map((round) => (
                  <div key={round} className="min-w-[220px]">
                    <div className="text-center text-xs font-bold text-white/50 uppercase glass-subtle rounded-lg py-1.5 mb-2">
                      {ROUND_NAMES[round] ?? `Round ${round}`}
                    </div>
                    {wiGamesByRound[round].map((g: any) => {
                      const t1 = wiTeams.find((t: any) => t.id === g.team1_id);
                      const t2 = wiTeams.find((t: any) => t.id === g.team2_id);
                      const complete = g.winner_id != null;
                      const canPick = !complete && t1 && t2;

                      const realGame = data.games.find((rg: any) => rg.id === g.id);
                      const isHypothetical = realGame ? realGame.winner_id == null && g.winner_id != null : g.id < 0;

                      return (
                        <div
                          key={g.id}
                          className={`bracket-game ${complete ? "complete" : ""}`}
                          style={isHypothetical ? { boxShadow: "0 0 0 2px rgba(99,102,241,0.5)" } : undefined}
                        >
                          {[
                            { team: t1, slot: "team1" },
                            { team: t2, slot: "team2" },
                          ].map(({ team }, si) => {
                            if (!team)
                              return (
                                <div key={si} className="bracket-team tbd">
                                  TBD
                                </div>
                              );
                            const isWinner = g.winner_id === team.id;
                            const isLoser = g.winner_id && g.winner_id !== team.id;
                            return (
                              <div
                                key={si}
                                className={`bracket-team ${isWinner ? "winner" : ""} ${isLoser ? "loser" : ""}`}
                                style={{ cursor: canPick ? "pointer" : "default" }}
                                onClick={() => canPick && wiPickWinner(g.id, team.id)}
                              >
                                <span
                                  className="owner-stripe"
                                  style={{
                                    backgroundColor: team.owner_color ?? "#475569",
                                  }}
                                />
                                <span className="flex-1 truncate text-sm text-white/80">
                                  ({team.seed}) {team.name}
                                </span>
                                <span
                                  className="text-xs truncate font-medium"
                                  style={{ color: team.owner_color ?? "#64748b" }}
                                >
                                  {team.owner_name ?? ""}
                                </span>
                              </div>
                            );
                          })}
                          {!complete && t1 && t2 && (
                            <div className="text-center text-[10px] text-white/30">
                              vs
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="font-semibold text-white/80 mb-3">Projected Leaderboard</h2>
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-sm text-white/50">
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-center">Pts</th>
                    <th className="p-3 text-center">vs Real</th>
                  </tr>
                </thead>
                <tbody>
                  {wiLeaderboard.map((p: any, i: number) => {
                    const real = realRankMap[p.id];
                    const rankDelta = real ? real.rank - (i + 1) : 0;
                    const ptsDelta = real ? p.totalPoints - real.pts : 0;
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-white/5 transition-colors"
                      >
                        <td className="p-3 font-bold text-white/70">{i + 1}</td>
                        <td className="p-3 text-white/90">
                          <span
                            className="inline-block w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                          {p.hasChampion && (
                            <span className="ml-1">&#127942;</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-white">
                          {p.totalPoints}
                        </td>
                        <td className="p-3 text-center text-sm">
                          {ptsDelta !== 0 && (
                            <span className={ptsDelta > 0 ? "text-emerald-400" : "text-red-400"}>
                              {ptsDelta > 0 ? "+" : ""}{ptsDelta} pts
                            </span>
                          )}
                          {rankDelta !== 0 && (
                            <span className={`ml-1.5 ${rankDelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {rankDelta > 0 ? "\u25B2" : "\u25BC"}{Math.abs(rankDelta)}
                            </span>
                          )}
                          {ptsDelta === 0 && rankDelta === 0 && (
                            <span className="text-white/30">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {wiDirty && (
              <p className="text-xs text-indigo-400 mt-2 text-center">
                Hypothetical results shown &mdash; no real data is affected.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Pure SVG line chart — no external dependencies            */
/* ---------------------------------------------------------- */

function PointsChart({
  series,
  maxPts,
  rounds,
}: {
  series: { name: string; color: string; data: number[] }[];
  maxPts: number;
  rounds: number[];
}) {
  const W = 600;
  const H = 260;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 36;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const niceMax = Math.ceil(maxPts / 10) * 10 || 10;

  function x(i: number) {
    return PAD_L + (i / Math.max(rounds.length - 1, 1)) * plotW;
  }
  function y(v: number) {
    return PAD_T + plotH - (v / niceMax) * plotH;
  }

  const gridLines = 5;
  const gridVals = Array.from({ length: gridLines + 1 }, (_, i) =>
    Math.round((niceMax / gridLines) * i)
  );

  const shortNames: Record<number, string> = {
    0: "Start",
    1: "R64",
    2: "R32",
    3: "S16",
    4: "E8",
    5: "F4",
    6: "Champ",
  };

  const [hover, setHover] = useState<number | null>(null);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxWidth: W, minWidth: 360 }}
    >
      {/* Grid lines */}
      {gridVals.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            y1={y(v)}
            x2={W - PAD_R}
            y2={y(v)}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray={v === 0 ? "0" : "4 4"}
          />
          <text
            x={PAD_L - 6}
            y={y(v) + 4}
            textAnchor="end"
            fill="rgba(255,255,255,0.4)"
            fontSize="10"
          >
            {v}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {rounds.map((rd, i) => (
        <text
          key={rd}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="10"
        >
          {shortNames[rd] ?? `R${rd}`}
        </text>
      ))}

      {/* Lines */}
      {series.map((s) => {
        const points = s.data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        return (
          <polyline
            key={s.name}
            points={points}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={hover === null || hover === series.indexOf(s) ? 1 : 0.2}
          />
        );
      })}

      {/* Dots */}
      {series.map((s, si) =>
        s.data.map((v, i) => (
          <circle
            key={`${s.name}-${i}`}
            cx={x(i)}
            cy={y(v)}
            r={hover === si ? 5 : 3.5}
            fill={s.color}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
            opacity={hover === null || hover === si ? 1 : 0.15}
            onMouseEnter={() => setHover(si)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer" }}
          >
            <title>{`${s.name}: ${v} pts (${shortNames[rounds[i]] ?? `Round ${rounds[i]}`})`}</title>
          </circle>
        ))
      )}

      {/* Hover value labels */}
      {hover !== null &&
        series[hover].data.map((v, i) => (
          <text
            key={i}
            x={x(i)}
            y={y(v) - 8}
            textAnchor="middle"
            fill={series[hover].color}
            fontSize="10"
            fontWeight="bold"
          >
            {v}
          </text>
        ))}
    </svg>
  );
}
