"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ROUND_NAMES } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Tab = "leaderboard" | "bracket" | "games" | "teams";

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [roundFilter, setRoundFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const resp = await fetch(`/api/tournament/${id}/data`);
    setData(await resp.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function refreshScores() {
    const resp = await fetch(`/api/tournament/${id}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    });
    const result = await resp.json();
    await loadData();
    alert(`Scores refreshed! ${result.gamesUpdated ?? 0} game(s) updated.`);
  }

  async function advanceWinner(gameId: number, winnerId: number) {
    await fetch(`/api/tournament/${id}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance", gameId, winnerId }),
    });
    await loadData();
  }

  if (loading || !data)
    return <p className="text-fg-muted text-center py-12">Loading...</p>;

  const { tournament, teams, leaderboard, upcoming, gamesByRound } = data;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "leaderboard", label: "Leaderboard", icon: "&#9776;" },
    { key: "bracket", label: "Bracket", icon: "&#9670;" },
    { key: "games", label: "Games", icon: "&#128197;" },
    { key: "teams", label: "Teams", icon: "&#128101;" },
  ];

  const filteredUpcoming =
    roundFilter === "all"
      ? upcoming
      : upcoming.filter((g: any) => g.round === Number(roundFilter));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={refreshScores}
            className="text-sm px-3 py-1 rounded bg-green-700 hover:bg-green-600"
          >
            Refresh Scores
          </button>
          <Link
            href={`/tournament/${id}/draft`}
            className="text-sm px-3 py-1 rounded border border-cyan-700 text-cyan-400 hover:bg-cyan-900/30"
          >
            Draft
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            <span dangerouslySetInnerHTML={{ __html: t.icon }} />{" "}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Leaderboard Tab ── */}
      {tab === "leaderboard" && (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-sm text-fg-muted">
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
                    className="border-b border-border/40 hover:bg-bg-hover cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-bold">{i + 1}</td>
                    <td className="p-3">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                      {p.hasChampion && (
                        <span className="text-yellow-400 ml-1">&#127942;</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {p.totalPoints}
                    </td>
                    <td className="p-3 text-center">
                      {p.teamsAlive}/{p.teams.length}
                    </td>
                    <td className="p-3 text-center">
                      {p.hasChampion ? (
                        <span className="text-green-400">&#10003;</span>
                      ) : (
                        <span className="text-fg-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-2 bg-bg-card border border-border rounded-lg p-4">
            {selectedParticipant ? (
              <>
                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: selectedParticipant.color }}
                >
                  {selectedParticipant.name}
                </h3>
                <p className="text-sm text-fg-muted mb-3">
                  Total: {selectedParticipant.totalPoints} pts
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-fg-muted border-b border-border">
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
                        className={`border-b border-border/30 ${t.alive ? "" : "opacity-40"}`}
                      >
                        <td className={`py-1 ${t.alive ? "" : "line-through"}`}>
                          {t.name}
                        </td>
                        <td className="py-1 text-center">{t.seed}</td>
                        <td className="py-1 text-center font-bold">
                          {t.points}
                        </td>
                        <td className="py-1 text-center">
                          {t.alive ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-800">
                              Alive
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700">
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
              <p className="text-fg-muted text-center">
                Click a participant to see their teams.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Bracket Tab ── */}
      {tab === "bracket" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {Object.keys(gamesByRound)
              .map(Number)
              .sort((a, b) => a - b)
              .map((round) => (
                <div key={round} className="min-w-[220px]">
                  <div className="text-center text-xs font-bold text-fg-muted uppercase bg-bg-card rounded-md py-1.5 mb-2">
                    {ROUND_NAMES[round] ?? `Round ${round}`}
                  </div>
                  {gamesByRound[round].map((g: any) => {
                    const t1 = teams.find((t: any) => t.id === g.team1_id);
                    const t2 = teams.find((t: any) => t.id === g.team2_id);
                    const complete = g.winner_id != null;
                    const canPick = !complete && t1 && t2;

                    return (
                      <div
                        key={g.id}
                        className={`bracket-game ${complete ? "complete" : ""}`}
                      >
                        {[
                          { team: t1, slot: "team1" },
                          { team: t2, slot: "team2" },
                        ].map(({ team, slot }, si) => {
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
                                    team.owner_color ?? "#555",
                                }}
                              />
                              <span className="flex-1 truncate text-sm">
                                ({team.seed}) {team.name}
                              </span>
                              <span
                                className="text-xs truncate"
                                style={{ color: team.owner_color ?? "#888" }}
                              >
                                {team.owner_name ?? ""}
                              </span>
                            </div>
                          );
                        })}
                        {!complete && t1 && t2 && (
                          <div className="text-center text-[10px] text-fg-muted">
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

      {/* ── Games Tab ── */}
      {tab === "games" && (
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-end mb-3">
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-1 text-sm"
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
            <p className="text-fg-muted text-center">No upcoming games.</p>
          ) : (
            filteredUpcoming.map((g: any) => {
              const t1 = g.team1Detail;
              const t2 = g.team2Detail;
              return (
                <div key={g.id} className="matchup-card">
                  <div className="text-xs text-fg-muted uppercase mb-2">
                    {ROUND_NAMES[g.round] ?? `Round ${g.round}`}
                    {g.region ? ` - ${g.region}` : ""}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="matchup-team-slot">
                      <span
                        className="owner-stripe"
                        style={{
                          backgroundColor: t1?.owner_color ?? "#555",
                        }}
                      />
                      <div>
                        <div className="font-bold">
                          ({t1?.seed}) {t1?.name}
                        </div>
                        <small style={{ color: t1?.owner_color ?? "#888" }}>
                          {t1?.owner_name ?? "Undrafted"}
                        </small>
                      </div>
                    </div>
                    <span className="text-fg-muted font-bold text-sm shrink-0">
                      VS
                    </span>
                    <div className="matchup-team-slot">
                      <span
                        className="owner-stripe"
                        style={{
                          backgroundColor: t2?.owner_color ?? "#555",
                        }}
                      />
                      <div>
                        <div className="font-bold">
                          ({t2?.seed}) {t2?.name}
                        </div>
                        <small style={{ color: t2?.owner_color ?? "#888" }}>
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

      {/* ── Teams Tab ── */}
      {tab === "teams" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {leaderboard.map((p: any) => (
            <div
              key={p.id}
              className="bg-bg-card border border-border rounded-lg overflow-hidden"
            >
              <div
                className="px-3 py-2 flex items-center justify-between"
                style={{ borderBottom: `3px solid ${p.color}` }}
              >
                <span className="font-bold" style={{ color: p.color }}>
                  {p.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-800">
                  {p.totalPoints} pts
                </span>
              </div>
              <div className="p-2">
                {p.teams.map((t: any) => (
                  <div
                    key={t.id}
                    className={`roster-item ${t.alive ? "" : "eliminated"}`}
                  >
                    <span>{t.display}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${t.alive ? "bg-green-800" : "bg-gray-700"}`}
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
    </div>
  );
}
