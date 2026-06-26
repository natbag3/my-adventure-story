// Mock data for Adventure Club UI shell. Replace with real backend later.

export type Child = {
  id: string;
  name: string;
  age: number;
  birthday: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  favoriteColor: string;
  favoriteAnimal: string;
  favoriteToy: string;
  favoriteFood: string;
  personality: string[];
  wantsToLearn: string[];
  fears: string[];
  avatarEmoji: string;
  accent: "lavender" | "peach" | "mint" | "star";
};

export type Story = {
  id: string;
  childId: string;
  title: string;
  adventure: string;
  mood: string;
  lesson: string;
  lengthMinutes: 3 | 5 | 10;
  createdAt: string;
  favorite: boolean;
  progress: number; // 0..1
  coverEmoji: string;
  coverGradient: string;
  pages: { text: string; sceneEmoji: string }[];
};

export type PassportStamp = {
  id: string;
  label: string;
  emoji: string;
  unlockedAt?: string;
  category: "destination" | "creature" | "skill";
};

export type Achievement = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  unlocked: boolean;
};

export type Adventure = {
  id: string;
  label: string;
  emoji: string;
};

export const PARENT_NAME = "Sarah";

export const CHILDREN: Child[] = [
  {
    id: "leo",
    name: "Leo",
    age: 6,
    birthday: "2019-04-12",
    hairColor: "Brown, messy",
    eyeColor: "Amber",
    skinTone: "Warm beige",
    favoriteColor: "Forest green",
    favoriteAnimal: "Dragon",
    favoriteToy: "Wooden sword",
    favoriteFood: "Pancakes",
    personality: ["Curious", "Brave", "Gentle"],
    wantsToLearn: ["Constellations", "How volcanoes work"],
    fears: ["The dark"],
    avatarEmoji: "🦁",
    accent: "peach",
  },
  {
    id: "mira",
    name: "Mira",
    age: 4,
    birthday: "2021-09-03",
    hairColor: "Black, curly",
    eyeColor: "Hazel",
    skinTone: "Warm tan",
    favoriteColor: "Lavender",
    favoriteAnimal: "Otter",
    favoriteToy: "Plush bunny",
    favoriteFood: "Strawberries",
    personality: ["Funny", "Imaginative", "Kind"],
    wantsToLearn: ["Numbers", "Animal sounds"],
    fears: ["Thunder"],
    avatarEmoji: "🦊",
    accent: "lavender",
  },
];

export const ADVENTURES: Adventure[] = [
  { id: "dinosaurs", label: "Dinosaurs", emoji: "🦕" },
  { id: "dragons", label: "Dragons", emoji: "🐉" },
  { id: "fairies", label: "Fairies", emoji: "🧚" },
  { id: "pirates", label: "Pirates", emoji: "🏴‍☠️" },
  { id: "space", label: "Space", emoji: "🚀" },
  { id: "underwater", label: "Underwater", emoji: "🐙" },
  { id: "jungle", label: "Jungle", emoji: "🌴" },
  { id: "egypt", label: "Ancient Egypt", emoji: "🏺" },
  { id: "rome", label: "Ancient Rome", emoji: "🏛️" },
  { id: "castles", label: "Medieval Castles", emoji: "🏰" },
  { id: "vikings", label: "Vikings", emoji: "⚔️" },
  { id: "samurai", label: "Samurai Japan", emoji: "🗾" },
  { id: "australia", label: "Australia", emoji: "🦘" },
  { id: "safari", label: "Africa Safari", emoji: "🦒" },
  { id: "arctic", label: "Arctic Expedition", emoji: "🧊" },
  { id: "timetravel", label: "Time Travel", emoji: "⏳" },
  { id: "magicschool", label: "Magic School", emoji: "🪄" },
  { id: "superheroes", label: "Superheroes", emoji: "🦸" },
  { id: "robots", label: "Robots", emoji: "🤖" },
  { id: "christmas", label: "Christmas", emoji: "🎄" },
  { id: "halloween", label: "Halloween", emoji: "🎃" },
  { id: "treasure", label: "Treasure Hunt", emoji: "💎" },
  { id: "camping", label: "Camping", emoji: "🏕️" },
  { id: "world", label: "Around the World", emoji: "🌍" },
];

export const MOODS = [
  { id: "bedtime", label: "Bedtime", emoji: "🌙" },
  { id: "funny", label: "Funny", emoji: "😄" },
  { id: "exciting", label: "Exciting", emoji: "⚡" },
  { id: "heartwarming", label: "Heartwarming", emoji: "💛" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "mystery", label: "Mystery", emoji: "🔍" },
];

export const LESSONS = [
  { id: "kindness", label: "Kindness", emoji: "🤝" },
  { id: "courage", label: "Courage", emoji: "🦁" },
  { id: "confidence", label: "Confidence", emoji: "✨" },
  { id: "friendship", label: "Friendship", emoji: "💞" },
  { id: "honesty", label: "Honesty", emoji: "🪞" },
  { id: "gratitude", label: "Gratitude", emoji: "🙏" },
  { id: "problem-solving", label: "Problem Solving", emoji: "🧩" },
  { id: "curiosity", label: "Curiosity", emoji: "🔭" },
  { id: "resilience", label: "Resilience", emoji: "🌱" },
  { id: "respect", label: "Respect", emoji: "🕊️" },
];

export const LENGTHS = [
  { id: 3, label: "3 minutes", helper: "Short & sweet" },
  { id: 5, label: "5 minutes", helper: "Cozy bedtime length" },
  { id: 10, label: "10 minutes", helper: "Full adventure" },
] as const;

export const STORIES: Story[] = [
  {
    id: "moon-whale",
    childId: "leo",
    title: "The Moon-Whale's Secret",
    adventure: "Underwater",
    mood: "Bedtime",
    lesson: "Curiosity",
    lengthMinutes: 5,
    createdAt: "2026-06-24",
    favorite: true,
    progress: 0.64,
    coverEmoji: "🐋",
    coverGradient: "from-[oklch(0.35_0.12_260)] via-[oklch(0.28_0.08_280)] to-[oklch(0.22_0.05_295)]",
    pages: [
      { text: "Far below the silver waves, Leo dove deeper than ever before. The water glowed a soft, friendly blue.", sceneEmoji: "🌊" },
      { text: "A great gentle whale drifted out of the dark, her skin shining like the moon itself.", sceneEmoji: "🐋" },
      { text: "\"I've been waiting for you, Leo,\" she sang. \"There's a secret song the ocean sings only to brave hearts.\"", sceneEmoji: "🎶" },
      { text: "Leo listened, and inside the song he heard every wave, every star, every wish he'd ever made.", sceneEmoji: "✨" },
      { text: "When he came back up, the moon was waiting. \"Goodnight, little explorer,\" it whispered. And Leo smiled.", sceneEmoji: "🌙" },
    ],
  },
  {
    id: "tokyo-lanterns",
    childId: "leo",
    title: "The Lantern Festival of Tokyo",
    adventure: "Samurai Japan",
    mood: "Heartwarming",
    lesson: "Kindness",
    lengthMinutes: 5,
    createdAt: "2026-06-18",
    favorite: true,
    progress: 1,
    coverEmoji: "🏮",
    coverGradient: "from-[oklch(0.32_0.14_25)] via-[oklch(0.26_0.1_30)] to-[oklch(0.2_0.06_290)]",
    pages: [],
  },
  {
    id: "dino-valley",
    childId: "leo",
    title: "Leo and the Hatching Egg",
    adventure: "Dinosaurs",
    mood: "Exciting",
    lesson: "Courage",
    lengthMinutes: 10,
    createdAt: "2026-06-10",
    favorite: false,
    progress: 1,
    coverEmoji: "🦖",
    coverGradient: "from-[oklch(0.3_0.1_150)] via-[oklch(0.25_0.08_170)] to-[oklch(0.2_0.05_290)]",
    pages: [],
  },
  {
    id: "pirate-cove",
    childId: "mira",
    title: "Mira and the Singing Compass",
    adventure: "Pirates",
    mood: "Funny",
    lesson: "Friendship",
    lengthMinutes: 3,
    createdAt: "2026-06-05",
    favorite: false,
    progress: 1,
    coverEmoji: "🧭",
    coverGradient: "from-[oklch(0.3_0.12_45)] via-[oklch(0.25_0.08_60)] to-[oklch(0.2_0.05_290)]",
    pages: [],
  },
  {
    id: "fairy-meadow",
    childId: "mira",
    title: "The Meadow That Whispered Back",
    adventure: "Fairies",
    mood: "Bedtime",
    lesson: "Gratitude",
    lengthMinutes: 5,
    createdAt: "2026-05-28",
    favorite: true,
    progress: 1,
    coverEmoji: "🧚",
    coverGradient: "from-[oklch(0.32_0.12_320)] via-[oklch(0.26_0.08_300)] to-[oklch(0.2_0.05_280)]",
    pages: [],
  },
  {
    id: "rocket-mira",
    childId: "mira",
    title: "A Rocket Made of Strawberries",
    adventure: "Space",
    mood: "Funny",
    lesson: "Curiosity",
    lengthMinutes: 3,
    createdAt: "2026-05-20",
    favorite: false,
    progress: 1,
    coverEmoji: "🚀",
    coverGradient: "from-[oklch(0.3_0.14_300)] via-[oklch(0.25_0.1_280)] to-[oklch(0.2_0.06_260)]",
    pages: [],
  },
];

export const PASSPORT_STAMPS: PassportStamp[] = [
  { id: "japan", label: "Visited Japan", emoji: "🇯🇵", unlockedAt: "2026-06-18", category: "destination" },
  { id: "ocean", label: "Ocean Explorer", emoji: "🌊", unlockedAt: "2026-06-24", category: "destination" },
  { id: "dino", label: "Dinosaur Expert", emoji: "🦖", unlockedAt: "2026-06-10", category: "creature" },
  { id: "pirate", label: "Sailed with Pirates", emoji: "🏴‍☠️", unlockedAt: "2026-06-05", category: "destination" },
  { id: "fairy", label: "Met a Fairy", emoji: "🧚", unlockedAt: "2026-05-28", category: "creature" },
  { id: "space", label: "Flew to Space", emoji: "🚀", unlockedAt: "2026-05-20", category: "destination" },
  { id: "egypt", label: "Explored Ancient Egypt", emoji: "🏺", category: "destination" },
  { id: "dragon", label: "Met a Dragon", emoji: "🐉", category: "creature" },
  { id: "treasure", label: "Found Hidden Treasure", emoji: "💎", category: "skill" },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "courage", label: "Courage Badge", description: "Finished 3 brave adventures", emoji: "🦁", unlocked: true },
  { id: "kindness", label: "Kindness Badge", description: "Chose kindness 5 times", emoji: "💛", unlocked: true },
  { id: "curiosity", label: "Curiosity Badge", description: "Explored 5 new worlds", emoji: "🔭", unlocked: true },
  { id: "friendship", label: "Friendship Badge", description: "Made 4 new story friends", emoji: "💞", unlocked: false },
  { id: "resilience", label: "Resilience Badge", description: "Read on 7 nights in a row", emoji: "🌱", unlocked: false },
];

export const REWARDS = {
  stars: 2450,
  points: 1280,
  level: 12,
  nextLevelAt: 1500,
  outfits: [
    { id: "wizard-cape", label: "Wizard Cape", emoji: "🧙", owned: true },
    { id: "astronaut-helmet", label: "Astronaut Helmet", emoji: "👨‍🚀", owned: true },
    { id: "knight-armor", label: "Knight Armor", emoji: "🛡️", owned: false },
  ],
  pets: [
    { id: "baby-dragon", label: "Baby Dragon", emoji: "🐲", owned: true },
    { id: "moon-cat", label: "Moon Cat", emoji: "🐱", owned: false },
  ],
  items: [
    { id: "wand", label: "Sparkling Wand", emoji: "🪄", owned: true },
    { id: "compass", label: "Singing Compass", emoji: "🧭", owned: true },
    { id: "lantern", label: "Lantern of Wishes", emoji: "🏮", owned: false },
  ],
};

export const SUBSCRIPTION = {
  plan: "Adventure Club Premium" as "Free" | "Adventure Club Premium" | "Family Plan",
  price: "$9.99/month",
  renewsOn: "2026-07-12",
  storiesThisMonth: 14,
  storiesLimit: Infinity as number,
};

export function getChild(id: string) {
  return CHILDREN.find((c) => c.id === id);
}
export function getStory(id: string) {
  return STORIES.find((s) => s.id === id);
}
export function storiesForChild(id: string) {
  return STORIES.filter((s) => s.childId === id);
}
