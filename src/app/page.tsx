"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MatchScore, SavedTicket, ScoresResponse, Ticket, TicketLeg, TicketsResponse } from "@/lib/types";
import { addTicket, loadTickets, removeTicket, ticketKey } from "@/lib/storage";

const kickoffFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Skopje",
});

const COUNT_OPTIONS = [10, 20, 30, 50];
const LEG_OPTIONS = [2, 3, 4, 5, 6];

function LegRow({ leg, score }: { leg: TicketLeg; score?: MatchScore }) {
  let scoreLine: React.ReactNode = null;
  if (score?.status === "live") {
    scoreLine = (
      <span className="font-semibold text-red-400">
        ⏱ {score.minute ?? "live"} · {score.home}:{score.visitor}
        {score.htHome !== null && ` (HT ${score.htHome}:${score.htVisitor})`}
      </span>
    );
  } else if (score?.status === "finished") {
    scoreLine = (
      <span className="font-semibold text-slate-200">
        FT {score.home}:{score.visitor}
        {score.htHome !== null && ` (HT ${score.htHome}:${score.htVisitor})`}
      </span>
    );
  } else if (leg.kickoff > Date.now()) {
    scoreLine = <span className="text-slate-500">starts {kickoffFormat.format(new Date(leg.kickoff))}</span>;
  } else {
    scoreLine = <span className="text-slate-500">awaiting score…</span>;
  }

  return (
    <div className="rounded-lg bg-slate-900/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{leg.teams}</span>
        <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 font-mono text-sm font-bold text-amber-300">
          {leg.code}
        </span>
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {leg.competition} · {kickoffFormat.format(new Date(leg.kickoff))}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-slate-300">
          {leg.market}: <span className="font-bold text-white">{leg.pick}</span>
        </span>
        <span className="font-mono font-semibold text-emerald-300">{leg.odd.toFixed(2)}</span>
      </div>
      <div className="mt-2 text-sm">{scoreLine}</div>
    </div>
  );
}

function BuilderTicketCard({
  ticket,
  index,
  added,
  onAdd,
}: {
  ticket: Ticket;
  index: number;
  added: boolean;
  onAdd: (t: Ticket) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 shadow-lg">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-400">Ticket #{index + 1}</span>
        <div className="text-right">
          <span className="text-2xl font-bold text-emerald-400">{ticket.totalOdd.toFixed(2)}</span>
          <span className="ml-2 text-xs text-slate-400">payout {ticket.payoutPct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="space-y-3">
        {ticket.legs.map((leg) => (
          <div key={`${leg.matchId}-${leg.market}-${leg.pick}`} className="rounded-lg bg-slate-900/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{leg.teams}</span>
              <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 font-mono text-sm font-bold text-amber-300">
                {leg.code}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {leg.competition} · {kickoffFormat.format(new Date(leg.kickoff))}
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-300">
                {leg.market}: <span className="font-bold text-white">{leg.pick}</span>
              </span>
              <span className="font-mono font-semibold text-emerald-300">{leg.odd.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onAdd(ticket)}
        disabled={added}
        className="mt-3 w-full rounded-md bg-sky-600 py-1.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-default disabled:bg-slate-700 disabled:text-slate-400"
      >
        {added ? "✓ Added" : "Add ticket"}
      </button>
    </div>
  );
}

function MyTickets({
  tickets,
  onRemove,
}: {
  tickets: SavedTicket[];
  onRemove: (id: string) => void;
}) {
  const [scores, setScores] = useState<Record<number, MatchScore>>({});
  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const now = Date.now();
      const legs = tickets.flatMap((t) => t.legs);
      // Only matches that have kicked off and aren't known to be finished.
      const pending = legs.filter(
        (l) => l.kickoff <= now && scoresRef.current[l.matchId]?.status !== "finished"
      );
      if (pending.length === 0) return;
      const ids = [...new Set(pending.map((l) => l.matchId))];
      const from = Math.min(...pending.map((l) => l.kickoff));
      const to = Math.max(...pending.map((l) => l.kickoff));
      try {
        const res = await fetch(`/api/scores?matchIds=${ids.join(",")}&from=${from}&to=${to}`);
        if (!res.ok || cancelled) return;
        const json: ScoresResponse = await res.json();
        setScores((prev) => {
          const next = { ...prev };
          for (const s of json.scores) next[s.matchId] = s;
          return next;
        });
      } catch {
        // transient network error — next poll retries
      }
    }

    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tickets]);

  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-6 text-slate-300">
        No saved tickets yet — add some from the Builder tab.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tickets.map((t) => (
        <div key={t.id} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 shadow-lg">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-400">
              added {new Date(t.addedAt).toLocaleDateString()}{" "}
              {new Date(t.addedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-2xl font-bold text-emerald-400">{t.totalOdd.toFixed(2)}</span>
          </div>
          <div className="space-y-3">
            {t.legs.map((leg) => (
              <LegRow key={`${leg.matchId}-${leg.market}-${leg.pick}`} leg={leg} score={scores[leg.matchId]} />
            ))}
          </div>
          <button
            onClick={() => onRemove(t.id)}
            className="mt-3 w-full rounded-md border border-red-800 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-950"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"builder" | "mine">("builder");
  const [target, setTarget] = useState("5");
  const [count, setCount] = useState(10);
  const [legs, setLegs] = useState(2);
  const [data, setData] = useState<TicketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedTicket[]>([]);

  useEffect(() => {
    setSaved(loadTickets());
  }, []);

  const load = useCallback(async (targetValue: string, countValue: number, legsValue: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const t = Number(targetValue);
      if (Number.isFinite(t) && t > 1) params.set("target", String(t));
      params.set("count", String(countValue));
      params.set("legs", String(legsValue));
      const res = await fetch(`/api/tickets?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("5", 10, 2);
  }, [load]);

  const savedKeys = new Set(saved.map(ticketKey));

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-slate-100">
      <header className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Ticket Builder</h1>
            <p className="mt-1 text-sm text-slate-400">
              Today&apos;s football on mozzartbet.mk — 2-leg tickets at or above your target
              coefficient, lowest bookmaker margin first.
            </p>
          </div>
          {tab === "builder" && (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                load(target, count, legs);
              }}
            >
              <label className="text-sm text-slate-400">
                Target coef
                <input
                  type="number"
                  step="0.5"
                  min="1.5"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1 block w-24 rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100"
                />
              </label>
              <label className="text-sm text-slate-400">
                Legs
                <select
                  value={legs}
                  onChange={(e) => {
                    const l = Number(e.target.value);
                    setLegs(l);
                    load(target, count, l);
                  }}
                  className="mt-1 block w-16 rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100"
                >
                  {LEG_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-400">
                Tips
                <select
                  value={count}
                  onChange={(e) => {
                    const c = Number(e.target.value);
                    setCount(c);
                    load(target, c, legs);
                  }}
                  className="mt-1 block w-20 rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100"
                >
                  {COUNT_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-emerald-600 px-4 py-1.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </form>
          )}
        </div>
        <nav className="mt-5 flex gap-1 border-b border-slate-700">
          {(
            [
              ["builder", "Builder"],
              ["mine", `My tickets (${saved.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-t-md px-4 py-2 text-sm font-semibold ${
                tab === key
                  ? "border border-b-0 border-slate-700 bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "mine" ? (
        <MyTickets tickets={saved} onRemove={(id) => setSaved(removeTicket(id))} />
      ) : (
        <>
          {error && (
            <div className="rounded-lg border border-red-700 bg-red-950/50 p-4 text-red-300">{error}</div>
          )}

          {!error && !loading && data && data.tickets.length === 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-6 text-slate-300">
              No tickets found — there are only {data.matchCount} upcoming matches today. Try again
              earlier in the day or with a different target.
            </div>
          )}

          {loading && !data && <div className="p-6 text-slate-400">Fetching today&apos;s odds…</div>}

          {data && data.tickets.length > 0 && (
            <>
              <p className="mb-4 text-xs text-slate-500">
                {data.matchCount} upcoming matches · generated{" "}
                {new Date(data.generatedAt).toLocaleTimeString()}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.tickets.map((t, i) => (
                  <BuilderTicketCard
                    key={i}
                    ticket={t}
                    index={i}
                    added={savedKeys.has(ticketKey(t))}
                    onAdd={(ticket) => setSaved(addTicket(ticket))}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
