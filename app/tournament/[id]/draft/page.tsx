"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Team {
  id: number;
  name: string;
  seed: number;
  region: string;
  owner_name: string | null;
  owner_color: string | null;
  pick_number: number | null;
}
interface Participant {
  id: number;
  name: string;
  color: string;
  draft_order: number;
}
interface Pick {
  pick_number: number;
  draft_round: number;
  participant_name: string;
  participant_color: string;
  team_name: string;
  seed: number;
  team_id: number;
}

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const resp = await fetch(`/api/tournament/${id}/data`);
    const data = await resp.json();
    setTeams(data.teams ?? []);
    setParticipants(data.participants ?? []);

    const sorted = [...(data.teams ?? [])]
      .filter((t: Team) => t.pick_number !== null)
      .sort((a: Team, b: Team) => (a.pick_number ?? 0) - (b.pick_number ?? 0));
    const pickList: Pick[] = sorted.map((t: Team) => ({
      pick_number: t.pick_number!,
      draft_round: Math.ceil(
        t.pick_number! / (data.participants?.length ?? 8)
      ),
      participant_name: t.owner_name ?? "",
      participant_color: t.owner_color ?? "#999",
      team_name: t.name,
      seed: t.seed,
      team_id: t.id,
    }));
    setPicks(pickList);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const n = participants.length || 8;
  const totalTeams = teams.length;
  const totalRounds = Math.ceil(totalTeams / n);
  const pickCount = picks.length;
  const draftComplete = pickCount >= totalTeams && totalTeams > 0;

  function getCurrentDrafter() {
    const pn = pickCount + 1;
    const dr = Math.ceil(pn / n);
    const pos = (pn - 1) % n;
    const idx = dr % 2 === 1 ? pos : n - 1 - pos;
    return participants[idx] ?? null;
  }

  async function draftTeam(teamId: number) {
    if (draftComplete) return;
    const resp = await fetch(`/api/tournament/${id}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    const data = await resp.json();
    if (!data.success) {
      alert(data.message);
      return;
    }
    await loadData();
  }

  async function undoPick() {
    if (pickCount === 0) return;
    const resp = await fetch(`/api/tournament/${id}/draft`, {
      method: "DELETE",
    });
    const data = await resp.json();
    if (data.success) await loadData();
    else alert(data.message);
  }

  const drafter = getCurrentDrafter();
  const regionGroups = teams.reduce<Record<string, Team[]>>((acc, t) => {
    (acc[t.region] ??= []).push(t);
    return acc;
  }, {});

  // Build draft board grid
  function getDraftBoard() {
    const board: (Pick | null)[][] = [];
    for (let r = 1; r <= totalRounds; r++) {
      const row: (Pick | null)[] = [];
      for (let p = 0; p < n; p++) {
        const pn =
          r % 2 === 1
            ? (r - 1) * n + p + 1
            : (r - 1) * n + (n - p);
        const pick = picks.find((pk) => pk.pick_number === pn) ?? null;
        row.push(pick);
      }
      board.push(row);
    }
    return board;
  }

  if (loading) return <p className="text-fg-muted text-center">Loading...</p>;

  const board = getDraftBoard();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Snake Draft</h1>
        <div className="flex gap-2">
          <button
            onClick={undoPick}
            className="text-sm px-3 py-1 rounded border border-yellow-700 text-yellow-400 hover:bg-yellow-900/30"
          >
            Undo
          </button>
          <Link
            href={`/tournament/${id}/dashboard`}
            className="text-sm px-3 py-1 rounded border border-blue-700 text-blue-400 hover:bg-blue-900/30"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Current drafter banner */}
      <div
        className="rounded-lg py-2 px-4 mb-4 text-center text-lg"
        style={{
          backgroundColor: draftComplete
            ? "rgba(34,197,94,0.15)"
            : `${drafter?.color ?? "#333"}22`,
          borderLeft: `4px solid ${draftComplete ? "#22c55e" : drafter?.color ?? "#333"}`,
        }}
      >
        {draftComplete ? (
          <span className="text-green-400 font-bold">Draft Complete!</span>
        ) : (
          <>
            <strong>Pick #{pickCount + 1}</strong> &mdash;{" "}
            <span style={{ color: drafter?.color }}>
              {drafter?.name}
            </span>{" "}
            is on the clock
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Available Teams (3 cols) */}
        <div className="lg:col-span-3 bg-bg-card border border-border rounded-lg p-3">
          <h2 className="font-semibold mb-2">Available Teams</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(regionGroups).map(([region, rTeams]) => (
              <div key={region}>
                <h3 className="text-xs font-bold text-fg-muted uppercase text-center mb-1">
                  {region}
                </h3>
                {rTeams.map((t) => {
                  const drafted = t.owner_name !== null;
                  return (
                    <div
                      key={t.id}
                      className={`team-card ${drafted ? "drafted" : ""}`}
                      style={
                        drafted
                          ? { borderLeftColor: t.owner_color ?? "#999" }
                          : undefined
                      }
                      onClick={() => !drafted && draftTeam(t.id)}
                    >
                      <span className="w-6 h-6 rounded-full bg-bg flex items-center justify-center text-xs font-bold shrink-0">
                        {t.seed}
                      </span>
                      <span className="truncate">{t.name}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Draft Board + Pick Log (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-bg-card border border-border rounded-lg">
            <h2 className="font-semibold p-3 border-b border-border">
              Draft Board
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-center text-fg-muted">Rd</th>
                    {participants.map((p) => (
                      <th
                        key={p.id}
                        className="p-1 text-center"
                        style={{ borderBottom: `3px solid ${p.color}` }}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {board.map((row, ri) => (
                    <tr key={ri}>
                      <td className="p-1 text-center text-fg-muted">
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="p-1 text-center"
                          style={
                            cell
                              ? {
                                  backgroundColor: `${cell.participant_color}33`,
                                }
                              : undefined
                          }
                        >
                          {cell && (
                            <span
                              className="truncate block"
                              title={`(${cell.seed}) ${cell.team_name}`}
                            >
                              ({cell.seed}) {cell.team_name}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-lg">
            <h2 className="font-semibold p-3 border-b border-border">
              Pick Log
            </h2>
            <div className="p-2 max-h-72 overflow-y-auto">
              {[...picks].reverse().map((p) => (
                <div
                  key={p.pick_number}
                  className="py-1 px-2 border-b border-border/40 text-sm flex items-center gap-2"
                >
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: p.participant_color }}
                  >
                    {p.pick_number}
                  </span>
                  <strong style={{ color: p.participant_color }}>
                    {p.participant_name}
                  </strong>
                  <span className="text-fg-muted">&rarr;</span>
                  ({p.seed}) {p.team_name}
                </div>
              ))}
              {picks.length === 0 && (
                <p className="text-fg-muted text-center text-sm">
                  No picks yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
