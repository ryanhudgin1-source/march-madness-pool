"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tournament {
  id: number;
  year: number;
  name: string;
  status: string;
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  useEffect(() => {
    fetch("/api/tournament")
      .then((r) => {
        if (!r.ok) throw new Error("DB not ready");
        return r.json();
      })
      .then(setTournaments)
      .catch(() => setDbReady(false))
      .finally(() => setLoading(false));
  }, []);

  async function initDb() {
    setLoading(true);
    await fetch("/api/init-db", { method: "POST" });
    setDbReady(true);
    const r = await fetch("/api/tournament");
    setTournaments(await r.json());
    setLoading(false);
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-700",
      drafting: "bg-cyan-700",
      complete: "bg-gray-600",
      setup: "bg-yellow-700",
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${colors[s] ?? "bg-gray-600"}`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-yellow-400">&#127942;</span> March Madness Pool
        </h1>
        <p className="text-fg-muted">
          Draft teams, track the tournament, crown the champion.
        </p>
      </div>

      {!dbReady && (
        <div className="bg-bg-card border border-border rounded-lg p-6 text-center mb-6">
          <p className="mb-3 text-fg-muted">
            Database tables need to be created first.
          </p>
          <button
            onClick={initDb}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium"
          >
            Initialize Database
          </button>
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Tournaments</h2>
          <Link
            href="/setup"
            className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1.5 rounded-lg"
          >
            + New Tournament
          </Link>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-fg-muted text-center">Loading...</p>
          ) : tournaments.length === 0 ? (
            <p className="text-fg-muted text-center">
              No tournaments yet. Create one to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg hover:bg-bg-hover transition-colors"
                >
                  <div>
                    <h3 className="font-medium">{t.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {statusBadge(t.status)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {t.status === "setup" && (
                      <Link
                        href={`/tournament/${t.id}`}
                        className="text-sm px-3 py-1 rounded border border-border hover:bg-bg-hover"
                      >
                        Setup
                      </Link>
                    )}
                    {(t.status === "setup" || t.status === "drafting") && (
                      <Link
                        href={`/tournament/${t.id}/draft`}
                        className="text-sm px-3 py-1 rounded border border-cyan-700 text-cyan-400 hover:bg-cyan-900/30"
                      >
                        Draft
                      </Link>
                    )}
                    <Link
                      href={`/tournament/${t.id}/dashboard`}
                      className="text-sm px-3 py-1 rounded border border-blue-700 text-blue-400 hover:bg-blue-900/30"
                    >
                      Dashboard
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
