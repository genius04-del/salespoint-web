import type { HelpAudience, HelpEntry } from "./content";

const STOP = new Set([
  "a", "an", "the", "i", "me", "my", "to", "do", "does", "how", "what", "where", "can", "cant", "cannot", "is", "are", "it", "of", "in", "on", "for",
  "and", "or", "with", "this", "that", "we", "you", "your", "please", "need", "want", "get", "got", "will", "when", "should", "not", "no", "am", "be", "if", "so", "then",
]);

// People type these several ways; map them to one word before matching.
const SYNONYMS: Record<string, string> = {
  momo: "mobile",
  cashup: "cash",
  stocktake: "count",
  voided: "cancel",
  void: "cancel",
  remove: "delete",
  buy: "purchase",
  bought: "purchase",
  fix: "adjust",
  login: "sign",
  logon: "sign",
  signin: "sign",
  spoilt: "spoiled",
  broken: "damaged",
  waste: "write",
  wastage: "write",
  boss: "owner",
  waiter: "table",
  waitress: "table",
  bill: "tab",
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SYNONYMS[w] ?? w)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

interface Indexed {
  entry: HelpEntry;
  title: Set<string>;
  keywords: Set<string>;
  body: Set<string>;
  phrases: string[]; // lowercase keywords/title, for whole-phrase hits
}

export function buildIndex(entries: HelpEntry[]): Indexed[] {
  return entries.map((entry) => ({
    entry,
    title: new Set(tokenize(entry.title)),
    keywords: new Set(entry.keywords.flatMap(tokenize)),
    body: new Set(tokenize([entry.answer, ...(entry.steps ?? [])].join(" "))),
    phrases: [entry.title.toLowerCase(), ...entry.keywords.map((k) => k.toLowerCase())],
  }));
}

export interface HelpHit {
  entry: HelpEntry;
  score: number;
}

// Simple, predictable ranking: whole-phrase hits beat title words, which beat
// keyword words, which beat words found only in the answer text.
export function searchHelp(index: Indexed[], query: string, audience?: HelpAudience, limit = 4): HelpHit[] {
  const q = query.toLowerCase();
  const tokens = Array.from(new Set(tokenize(query)));
  if (tokens.length === 0) return [];

  const hits: HelpHit[] = [];
  for (const it of index) {
    if (audience && !it.entry.audience.includes(audience)) continue;
    let score = 0;
    for (const p of it.phrases) if (p.length > 3 && q.includes(p)) score += 6;
    let matched = 0;
    for (const t of tokens) {
      let s = 0;
      if (it.title.has(t)) s = 3;
      else if (it.keywords.has(t)) s = 2;
      else if (it.body.has(t)) s = 1;
      if (s > 0) matched++;
      score += s;
    }
    // Reward answers that cover most of what was asked.
    if (matched / tokens.length >= 0.6) score += 2;
    if (score >= 3) hits.push({ entry: it.entry, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
