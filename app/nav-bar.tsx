"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdmin } from "./admin-context";

export default function NavBar() {
  const { isAdmin, login, logout } = useAdmin();
  const [showPrompt, setShowPrompt] = useState(false);
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(password);
    setPassword("");
    setShowPrompt(false);
  }

  return (
    <>
      <nav
        id="app-nav"
        className="glass-strong sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
      >
        <Link href="/" className="font-bold text-lg flex items-center gap-2 text-white">
          <span>&#127942;</span>
          March Madness Pool
        </Link>

        <button
          onClick={() => (isAdmin ? logout() : setShowPrompt(true))}
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5"
          style={{
            borderColor: isAdmin ? "rgb(34 197 94 / 0.5)" : "rgb(255 255 255 / 0.2)",
            color: isAdmin ? "#4ade80" : "#cbd5e1",
          }}
          title={isAdmin ? "Logged in as commissioner — click to log out" : "Commissioner login"}
        >
          <span>{isAdmin ? "\u{1F513}" : "\u{1F512}"}</span>
          {isAdmin ? "Commissioner" : "Login"}
        </button>
      </nav>

      {showPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="glass-strong rounded-2xl p-6 w-full max-w-sm"
          >
            <h2 className="text-lg font-bold text-white mb-1">Commissioner Login</h2>
            <p className="text-sm text-white/50 mb-4">Enter the admin password to unlock editing.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2 mb-4"
              placeholder="Password"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPrompt(false);
                  setPassword("");
                }}
                className="px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!password}
                className="btn-primary px-4 py-2 disabled:opacity-50"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
