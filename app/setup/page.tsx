"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [names, setNames] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const participants = names
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (participants.length === 0) {
      alert("Enter at least one participant name");
      setLoading(false);
      return;
    }

    const resp = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        name: `March Madness ${year}`,
        participants,
      }),
    });
    const data = await resp.json();
    if (data.success) {
      router.push(`/tournament/${data.id}`);
    } else {
      alert(data.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">New Tournament Setup</h1>

      <form
        onSubmit={handleSubmit}
        className="glass rounded-xl p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">
            Tournament Year
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-lg px-3 py-2"
            min={2000}
            max={2099}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">
            Participant Names
          </label>
          <textarea
            value={names}
            onChange={(e) => setNames(e.target.value)}
            className="w-full rounded-lg px-3 py-2 h-28"
            placeholder="Enter names separated by commas&#10;e.g. Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Hank"
          />
          <p className="text-xs text-slate-400 mt-1">
            Enter up to 8 names, separated by commas.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-2.5 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Tournament"}
        </button>
      </form>
    </div>
  );
}
