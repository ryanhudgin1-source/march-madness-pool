"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdmin } from "../../../admin-context";

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
  const { isAdmin, adminKey } = useAdmin();
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
    if (draftComplete || !isAdmin) return;
    const resp = await fetch(`/api/tournament/${id}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
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
    if (pickCount === 0 || !isAdmin) return;
    const resp = await fetch(`/api/tournament/${id}/draft`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
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

  if (loading) return <p className="text-white/40 text-center">Loading...</p>;

  const board = getDraftBoard();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-white">Snake Draft</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={undoPick}
              className="text-sm px-3 py-1 rounded-lg border border-amber-400/50 text-amber-300 hover:bg-amber-400/10 transition-colors"
            >
              Undo
            </button>
          )}
          <Link
            href={`/tournament/${id}/dashboard`}
            className="text-sm px-3 py-1 rounded-lg border border-indigo-400/50 text-indigo-300 hover:bg-indigo-400/10 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div
        className="glass rounded-xl py-2 px-4 mb-4 text-center text-lg"
        style={{
          borderLeft: `4px solid ${draftComplete ? "#22c55e" : drafter?.color ?? "#94a3b8"}`,
        }}
      >
        {draftComplete ? (
          <span className="text-emerald-400 font-bold">Draft Complete!</span>
        ) : (
          <span className="text-white/90">
            <strong>Pick #{pickCount + 1}</strong> &mdash;{" "}
            <span style={{ color: drafter?.color }} className="font-semibold">
              {drafter?.name}
            </span>{" "}
            is on the clock
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass rounded-xl p-3">
          <h2 className="font-semibold mb-2 text-white/80">Available Teams</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(regionGroups).map(([region, rTeams]) => (
              <div key={region}>
                <h3 className="text-xs font-bold text-white/40 uppercase text-center mb-1">
                  {region}
                </h3>
                {rTeams.map((t) => {
                  const drafted = t.owner_name !== null;
                  const clickable = !drafted && isAdmin;
                  return (
                    <div
                      key={t.id}
                      className={`team-card ${drafted ? "drafted" : ""}`}
                      style={{
                        ...(drafted
                          ? { borderLeftColor: t.owner_color ?? "#999" }
                          : {}),
                        cursor: clickable ? "pointer" : "default",
                      }}
                      onClick={() => clickable && draftTeam(t.id)}
                    >
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 text-white/80">
                        {t.seed}
                      </span>
                      <span className="truncate text-white/80">{t.name}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <h2 className="font-semibold p-3 border-b border-white/10 text-white/80">
              Draft Board
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-center text-white/40">Rd</th>
                    {participants.map((p) => (
                      <th
                        key={p.id}
                        className="p-1 text-center text-white/80"
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
                      <td className="p-1 text-center text-white/40">
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="p-1 text-center text-white/80"
                          style={
                            cell
                              ? {
                                  backgroundColor: `${cell.participant_color}22`,
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

          <div className="glass rounded-xl overflow-hidden">
            <h2 className="font-semibold p-3 border-b border-white/10 text-white/80">
              Pick Log
            </h2>
            <div className="p-2 max-h-72 overflow-y-auto">
              {[...picks].reverse().map((p) => (
                <div
                  key={p.pick_number}
                  className="py-1 px-2 border-b border-white/5 text-sm flex items-center gap-2"
                >
                  <span
                    className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                    style={{ backgroundColor: p.participant_color }}
                  >
                    {p.pick_number}
                  </span>
                  <strong style={{ color: p.participant_color }}>
                    {p.participant_name}
                  </strong>
                  <span className="text-white/40">&rarr;</span>
                  <span className="text-white/80">({p.seed}) {p.team_name}</span>
                </div>
              ))}
              {picks.length === 0 && (
                <p className="text-white/40 text-center text-sm">
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
