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
    const resp = await fetch(`/api/tournament/${id}/data`);
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
    const parsed: Record<string, string[]> = {};
    for (const [r, text] of Object.entries(regions)) {
      const names = text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length === 0) {
        alert(`Please fill in teams for ${r}`);
        return;
      }
      parsed[r] = names;
    }
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
      alert(data.message);
    }
  }

  if (!tournament) return <p className="text-fg-muted text-center">Loading...</p>;

  const regionGroups = teams.reduce<Record<string, TeamRow[]>>((acc, t) => {
    (acc[t.region] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-yellow-700">
          {tournament.status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Participants */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Participants</h2>
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span>
                {p.draft_order}. {p.name}
              </span>
            </div>
          ))}
        </div>

        {/* Teams */}
        <div className="md:col-span-2 bg-bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold">Teams ({teams.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={importESPN}
                disabled={importing}
                className="text-sm px-3 py-1 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import from ESPN"}
              </button>
              <button
                onClick={() => setShowManual(true)}
                className="text-sm px-3 py-1 rounded border border-border hover:bg-bg-hover"
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
                      <h3 className="text-xs font-bold text-fg-muted uppercase mb-2">
                        {region}
                      </h3>
                      {rTeams.map((t) => (
                        <div
                          key={t.id}
                          className="text-sm py-0.5 flex gap-2"
                        >
                          <span className="text-fg-muted w-5 text-right">
                            {t.seed}
                          </span>
                          <span>{t.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <Link
                  href={`/tournament/${id}/draft`}
                  className="mt-4 block text-center bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg font-medium"
                >
                  Start Draft
                </Link>
              </>
            ) : (
              <p className="text-fg-muted text-center">
                No teams loaded. Import from ESPN or add manually.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Manual entry modal */}
      {showManual && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Manual Team Entry</h2>
              <button
                onClick={() => setShowManual(false)}
                className="text-fg-muted hover:text-fg text-xl"
              >
                &times;
              </button>
            </div>
            <p className="text-sm text-fg-muted mb-4">
              Enter 16 team names per region, one per line, in seed order
              (1-seed first).
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.keys(regions).map((r) => (
                <div key={r}>
                  <label className="block text-sm font-bold mb-1">{r}</label>
                  <textarea
                    value={regions[r]}
                    onChange={(e) =>
                      setRegions({ ...regions, [r]: e.target.value })
                    }
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 h-48 text-sm"
                    placeholder={`1-seed\n2-seed\n3-seed\n...\n16-seed`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowManual(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={submitManual}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                Save Teams
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
