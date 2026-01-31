export type PriorityProfile =
  | { name: "low"; solLamports: number }
  | { name: "normal"; solLamports: number }
  | { name: "high"; solLamports: number };

export const PRIORITY_PROFILES: PriorityProfile[] = [
  { name: "low", solLamports: 1_000 },       // ~dust
  { name: "normal", solLamports: 50_000 },   // noticeable
  { name: "high", solLamports: 500_000 },    // loud
];

export function getPriorityProfile(name: PriorityProfile["name"]): PriorityProfile {
  const p = PRIORITY_PROFILES.find(p => p.name === name);
  if (!p) throw new Error("unknown priority profile");
  return p;
}
