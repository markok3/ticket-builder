import { NextRequest, NextResponse } from "next/server";
import { fetchOdds, fetchTodaysMatches } from "@/lib/mozzart";
import { ALL_SUBGAME_IDS, buildSelectionPool } from "@/lib/markets";
import { buildTickets, DEFAULT_OPTIONS } from "@/lib/tickets";
import { MatchOdds, MozzartMatch, TicketsResponse } from "@/lib/types";

const CACHE_TTL_MS = 60_000;

let cached: { at: number; matches: MozzartMatch[]; odds: MatchOdds[] } | null = null;

async function getData(): Promise<{ matches: MozzartMatch[]; odds: MatchOdds[] }> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached;
  const matches = await fetchTodaysMatches();
  const odds = matches.length
    ? await fetchOdds(matches.map((m) => m.id), ALL_SUBGAME_IDS)
    : [];
  cached = { at: Date.now(), matches, odds };
  return cached;
}

function numParam(req: NextRequest, name: string, fallback: number, min: number, max: number): number {
  const raw = req.nextUrl.searchParams.get(name);
  const value = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export async function GET(req: NextRequest) {
  const target = numParam(req, "target", DEFAULT_OPTIONS.target, 1.5, 1000);
  const tolerance = numParam(req, "tolerance", DEFAULT_OPTIONS.tolerance, 0.01, target);
  const count = numParam(req, "count", DEFAULT_OPTIONS.count, 1, 50);
  const legs = Math.round(numParam(req, "legs", DEFAULT_OPTIONS.legs, 2, 6));

  try {
    const { matches, odds } = await getData();
    const pool = buildSelectionPool(matches, odds);
    const tickets = buildTickets(pool, { target, tolerance, count, legs });
    const body: TicketsResponse = {
      generatedAt: new Date().toISOString(),
      matchCount: matches.length,
      tickets,
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch data from mozzartbet.mk: ${message}` },
      { status: 502 }
    );
  }
}
