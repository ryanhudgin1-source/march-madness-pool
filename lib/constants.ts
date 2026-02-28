export const PARTICIPANT_COLORS = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231",
  "#911eb4", "#42d4f4", "#f032e6", "#bfef45",
];

export const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
};

export const MATCHUP_SEEDS: [number, number][] = [
  [1, 16], [8, 9], [5, 12], [4, 13],
  [2, 15], [7, 10], [6, 11], [3, 14],
];
