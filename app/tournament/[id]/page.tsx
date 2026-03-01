"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface TeamRow {
  id: number;
  name: string;
  seed: number;
  region: string;
}
interface ParticipantRow {
  id: number;
  name: string;
  color: string;
  draft_order: number;
}

export default function TournamentSetupPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<{
    name: string;
    status: string;
  } | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [regions, setRegions] = useState<Record<string, string>>({
    East: "",
    West: "",
    South: "",
    Midwest: "",
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const resp = await fetch(`/api/tournament/${id}/data?t=${Date.now()}`);
    const data = await resp.json();
    setTournament(data.tournament);
    setTeams(data.teams ?? []);
    setParticipants(data.participants ?? []);
  }

  async function importESPN() {
    setImporting(true);
    const resp = await fetch(`/api/tournament/${id}/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import-espn" }),
    });
    const data = await resp.json();
    if (data.success) {
      await loadData();
    } else {
      alert("Import failed: " + data.message);
    }
    setImporting(false);
  }

  async function submitManual() {
    setSubmitting(true);
    const parsed: Record<string, string[]> = {};
    for (const [r, text] of Object.entries(regions)) {
      const names = text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length === 0) {
        alert(`Please fill in teams for ${r}`);
        setSubmitting(false);
        return;
      }
      parsed[r] = names;
    }
    try {
      const resp = await fetch(`/api/tournament/${id}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual", regions: parsed }),
      });
      const data = await resp.json();
      if (data.success) {
        setShowManual(false);
        await loadData();
      } else {
        alert("Error: " + (data.message || "Unknown error"));
      }
    } catch (err: unknown) {
      alert("Request failed: " + String(err));
    }
    setSubmitting(false);
  }

  if (!tournament) return <p className="text-slate-400 text-center">Loading...</p>;

  const regionGroups = teams.reduce<Record<string, TeamRow[]>>((acc, t) => {
    (acc[t.region] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{tournament.name}</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-amber-500 text-white font-medium">
          {tournament.status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Participants */}
        <div className="glass rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-slate-700">Participants</h2>
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-slate-700">
                {p.draft_order}. {p.name}
              </span>
            </div>
          ))}
        </div>

        {/* Teams */}
        <div className="md:col-span-2 glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/30">
            <h2 className="font-semibold text-slate-700">Teams ({teams.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={importESPN}
                disabled={importing}
                className="text-sm px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
              >
                {importing ? "Importing..." : "Import from ESPN"}
              </button>
              <button
                onClick={() => setShowManual(true)}
                className="text-sm px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-white/60 transition-colors"
              >
                Manual Entry
              </button>
            </div>
          </div>
          <div className="p-4">
            {teams.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(regionGroups).map(([region, rTeams]) => (
                    <div key={region}>
                      <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
                        {region}
                      </h3>
                      {rTeams.map((t) => (
                        <div
                          key={t.id}
                          className="text-sm py-0.5 flex gap-2"
                        >
                          <span className="text-slate-400 w-5 text-right">
                            {t.seed}
                          </span>
                          <span className="text-slate-700">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <Link
                  href={`/tournament/${id}/draft`}
                  className="mt-4 block text-center btn-primary py-2.5"
                >
                  Start Draft
                </Link>
              </>
            ) : (
              <p className="text-slate-400 text-center">
                No teams loaded. Import from ESPN or add manually.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Manual entry modal */}
      {showManual && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Manual Team Entry</h2>
              <button
                onClick={() => setShowManual(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                &times;
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Enter 16 team names per region, one per line, in seed order
              (1-seed first).
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.keys(regions).map((r) => (
                <div key={r}>
                  <label className="block text-sm font-bold mb-1 text-slate-700">{r}</label>
                  <textarea
                    value={regions[r]}
                    onChange={(e) =>
                      setRegions({ ...regions, [r]: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2 h-48 text-sm"
                    placeholder={`1-seed\n2-seed\n3-seed\n...\n16-seed`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowManual(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-white/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitManual}
                disabled={submitting}
                className="btn-primary px-4 py-2 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Teams"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
