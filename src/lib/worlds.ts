// Shared world/zone definitions for the Adventure Map.
// Each ADVENTURE (from mock-data) maps to exactly one zone id.
// visited_worlds on children stores zone ids.

export type WorldZone = {
  id: string;
  label: string;
  emoji: string;
  // Rough fill palette (semantic-ish tokens fall back to plain hex here so
  // the illustrated SVG map reads at a glance).
  color: string;
  // Position + size on a 100x60 viewBox.
  x: number;
  y: number;
  w: number;
  h: number;
  // Adventure ids (from mock-data ADVENTURES) that count as visiting this zone.
  adventureIds: string[];
  // Free-text theme labels can also map here (e.g. seasonal prompts).
  themeKeywords: string[];
};

export const WORLD_ZONES: WorldZone[] = [
  {
    id: "forest",
    label: "Enchanted Forest",
    emoji: "🌲",
    color: "#4b7f52",
    x: 4,
    y: 6,
    w: 28,
    h: 22,
    adventureIds: ["fairies", "magicschool"],
    themeKeywords: ["forest", "fairy", "magic"],
  },
  {
    id: "castle",
    label: "Castle Realm",
    emoji: "🏰",
    color: "#7a5c9e",
    x: 34,
    y: 4,
    w: 30,
    h: 22,
    adventureIds: ["castles", "dragons", "vikings", "superheroes"],
    themeKeywords: ["castle", "dragon", "knight", "viking"],
  },
  {
    id: "space",
    label: "Outer Space",
    emoji: "🚀",
    color: "#2b3a7a",
    x: 66,
    y: 4,
    w: 30,
    h: 22,
    adventureIds: ["space", "robots"],
    themeKeywords: ["space", "robot", "planet", "star"],
  },
  {
    id: "jungle",
    label: "Jungle & Safari",
    emoji: "🌴",
    color: "#3f8c5a",
    x: 4,
    y: 30,
    w: 26,
    h: 26,
    adventureIds: ["jungle", "dinosaurs", "safari", "australia"],
    themeKeywords: ["jungle", "dinosaur", "safari", "outback"],
  },
  {
    id: "ancient",
    label: "Ancient Lands",
    emoji: "🏛️",
    color: "#c19a4b",
    x: 32,
    y: 30,
    w: 22,
    h: 26,
    adventureIds: ["egypt", "rome", "samurai"],
    themeKeywords: ["egypt", "rome", "samurai", "ancient"],
  },
  {
    id: "ocean",
    label: "Ocean Depths",
    emoji: "🌊",
    color: "#2f6f9e",
    x: 56,
    y: 30,
    w: 24,
    h: 26,
    adventureIds: ["underwater", "pirates", "treasure"],
    themeKeywords: ["ocean", "sea", "pirate", "underwater", "treasure"],
  },
  {
    id: "arctic",
    label: "Frozen Arctic",
    emoji: "🧊",
    color: "#6ea9c9",
    x: 82,
    y: 30,
    w: 14,
    h: 12,
    adventureIds: ["arctic"],
    themeKeywords: ["arctic", "ice", "snow"],
  },
  {
    id: "wonder",
    label: "Wonder Realm",
    emoji: "⏳",
    color: "#b56aa0",
    x: 82,
    y: 44,
    w: 14,
    h: 12,
    adventureIds: ["timetravel", "world", "camping", "halloween", "christmas"],
    themeKeywords: ["time", "world", "camping", "halloween", "christmas", "birthday", "easter"],
  },
];

export function zoneForTheme(theme: string | null | undefined): WorldZone | null {
  if (!theme) return null;
  const t = theme.toLowerCase();
  // First try adventure label match
  for (const z of WORLD_ZONES) {
    if (z.adventureIds.some((id) => t === id || t.includes(id))) return z;
  }
  // Then keyword scan
  for (const z of WORLD_ZONES) {
    if (z.themeKeywords.some((k) => t.includes(k))) return z;
  }
  return null;
}

export function zoneById(id: string): WorldZone | undefined {
  return WORLD_ZONES.find((z) => z.id === id);
}
