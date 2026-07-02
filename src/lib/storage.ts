import { SavedTicket, Ticket } from "./types";

const KEY = "saved-tickets";

export function loadTickets(): SavedTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedTicket[]) : [];
  } catch {
    return [];
  }
}

function persist(tickets: SavedTicket[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(tickets));
}

/** Identity of a ticket: its matches + picks, independent of odds drift. */
export function ticketKey(t: Ticket | SavedTicket): string {
  return t.legs
    .map((l) => `${l.matchId}:${l.market}:${l.pick}`)
    .sort()
    .join("|");
}

export function addTicket(ticket: Ticket): SavedTicket[] {
  const tickets = loadTickets();
  if (tickets.some((t) => ticketKey(t) === ticketKey(ticket))) return tickets;
  const saved: SavedTicket = {
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
    totalOdd: ticket.totalOdd,
    payoutPct: ticket.payoutPct,
    legs: ticket.legs,
  };
  const next = [saved, ...tickets];
  persist(next);
  return next;
}

export function removeTicket(id: string): SavedTicket[] {
  const next = loadTickets().filter((t) => t.id !== id);
  persist(next);
  return next;
}
