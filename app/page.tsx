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
      active: "bg-emerald-500 text-white",
      drafting: "bg-cyan-500 text-white",
      complete: "bg-slate-400 text-white",
      setup: "bg-amber-500 text-white",
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[s] ?? "bg-slate-400 text-white"}`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 text-slate-800">
          <span>&#127942;</span> March Madness Pool
        </h1>
        <p className="text-slate-500">
          Draft teams, track the tournament, crown the champion.
        </p>
      </div>

      {!dbReady && (
        <div className="glass rounded-xl p-6 text-center mb-6">
          <p className="mb-3 text-slate-500">
            Database tables need to be created first.
          </p>
          <button
            onClick={initDb}
            className="btn-primary px-5 py-2.5"
          >
            Initialize Database
          </button>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/30">
          <h2 className="font-semibold text-slate-700">Tournaments</h2>
          <Link
            href="/setup"
            className="btn-primary text-sm px-4 py-1.5"
          >
            + New Tournament
          </Link>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-slate-400 text-center">Loading...</p>
          ) : tournaments.length === 0 ? (
            <p className="text-slate-400 text-center">
              No tournaments yet. Create one to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg glass-subtle hover:bg-white/50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-slate-800">{t.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {statusBadge(t.status)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {t.status === "setup" && (
                      <Link
                        href={`/tournament/${t.id}`}
                        className="text-sm px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-white/60 transition-colors"
                      >
                        Setup
                      </Link>
                    )}
                    {(t.status === "setup" || t.status === "drafting") && (
                      <Link
                        href={`/tournament/${t.id}/draft`}
                        className="text-sm px-3 py-1 rounded-lg border border-cyan-400 text-cyan-600 hover:bg-cyan-50/60 transition-colors"
                      >
                        Draft
                      </Link>
                    )}
                    <Link
                      href={`/tournament/${t.id}/dashboard`}
                      className="text-sm px-3 py-1 rounded-lg border border-indigo-400 text-indigo-600 hover:bg-indigo-50/60 transition-colors"
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
