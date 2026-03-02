"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "./admin-context";

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
  const { isAdmin, adminKey } = useAdmin();

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
    const resp = await fetch("/api/init-db", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
    });
    const data = await resp.json();
    if (!data.success) {
      alert(data.message);
      setLoading(false);
      return;
    }
    setDbReady(true);
    const r = await fetch("/api/tournament");
    setTournaments(await r.json());
    setLoading(false);
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-500",
      drafting: "bg-cyan-500",
      complete: "bg-slate-500",
      setup: "bg-amber-500",
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${colors[s] ?? "bg-slate-500"}`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto relative z-10">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold mb-3 text-white drop-shadow-lg">
          <span>&#127942;</span> March Madness Pool
        </h1>
        <p className="text-white/70 text-lg">
          Draft teams, track the tournament, crown the champion.
        </p>
      </div>

      {!dbReady && isAdmin && (
        <div className="glass rounded-xl p-6 text-center mb-6">
          <p className="mb-3 text-white/60">
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
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-semibold text-white">Tournaments</h2>
          {isAdmin && (
            <Link
              href="/setup"
              className="btn-primary text-sm px-4 py-1.5"
            >
              + New Tournament
            </Link>
          )}
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-white/40 text-center">Loading...</p>
          ) : tournaments.length === 0 ? (
            <p className="text-white/40 text-center">
              No tournaments yet. Create one to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-white">{t.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {statusBadge(t.status)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {t.status === "setup" && (
                      <Link
                        href={`/tournament/${t.id}`}
                        className="text-sm px-3 py-1 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                      >
                        Setup
                      </Link>
                    )}
                    {(t.status === "setup" || t.status === "drafting") && (
                      <Link
                        href={`/tournament/${t.id}/draft`}
                        className="text-sm px-3 py-1 rounded-lg border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 transition-colors"
                      >
                        Draft
                      </Link>
                    )}
                    <Link
                      href={`/tournament/${t.id}/dashboard`}
                      className="text-sm px-3 py-1 rounded-lg border border-indigo-400/50 text-indigo-300 hover:bg-indigo-400/10 transition-colors"
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
