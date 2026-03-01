"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tournament {
  id: number;
  year: number;
  name: string;
  status: string;
}

const SLIDES = [
  "https://images.unsplash.com/photo-1504450758481-7338bbe75c8e?w=1920&q=80",
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&q=80",
  "https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=1920&q=80",
  "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=1920&q=80",
  "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=1920&q=80",
];

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
    <>
      {/* Slideshow background - covers the gradient from layout */}
      <div className="slideshow-bg">
        {SLIDES.map((url, i) => (
          <div
            key={i}
            className="slide"
            style={{ backgroundImage: `url(${url})` }}
          />
        ))}
      </div>

      {/* Override layout styles for home page */}
      <style>{`
        body { background: #111 !important; }
        #app-nav {
          background: rgba(0, 0, 0, 0.4) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border-color: rgba(255,255,255,0.1) !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3) !important;
        }
        #app-nav a { color: #fff !important; }
      `}</style>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-3 text-white drop-shadow-lg">
            <span>&#127942;</span> March Madness Pool
          </h1>
          <p className="text-white/70 text-lg">
            Draft teams, track the tournament, crown the champion.
          </p>
        </div>

        {!dbReady && (
          <div className="glass-dark rounded-xl p-6 text-center mb-6">
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

        <div className="glass-dark rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Tournaments</h2>
            <Link
              href="/setup"
              className="btn-primary text-sm px-4 py-1.5"
            >
              + New Tournament
            </Link>
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
    </>
  );
}
