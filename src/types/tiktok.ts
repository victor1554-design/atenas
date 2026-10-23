export type GiftTier = 'heart' | 'flower' | 'donut' | 'big_gift';

export interface GiftDefinition {
  id: string;
  name: string;
  tier: GiftTier;
  coins: number;
  icon: string;
  badgeColor: string;
  description: string;
}

export interface DonorItem {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl: string;
  giftTier: GiftTier;
  giftName: string;
  coins: number;
  giftIcon: string;
  timestamp: number;
  comment?: string;
  status: 'drawing' | 'conveyor' | 'completed';
  drawnCanvasDataUrl?: string;
}

export interface StreamSettings {
  tiktokUsername: string;
  conveyorSpeed: number; // pixels per second (e.g. 60)
  soundEnabled: boolean;
  soundVolume: number; // 0 to 1
  showBrushCursor: boolean;
  showPencilCursor?: boolean;
  autoSimulateRandomDonations: boolean;
  obsMode: boolean; // transparent background
  conveyorPosition: 'left' | 'right' | 'center';
  bannerText: string;
  drawOnLikes?: boolean; // trigger drawing when viewer gives screen likes / hearts
  likesThreshold?: number; // how many likes from a user needed to trigger drawing (e.g. 10)
  tierTriggers: TierTriggers;
  colorTierTriggers?: ColorTierTriggers;
  plotterSound: PlotterSoundId;
  plotterVolume: number; // 0 to 1, multiplied by the master soundVolume
}

export type PlotterSoundId = 'pencil' | 'dot_matrix' | 'pen_plotter' | 'off';

export const PLOTTER_SOUNDS: { id: PlotterSoundId; label: string; description: string }[] = [
  { id: 'pencil', label: '✏️ Lápiz clásico', description: 'El rasgueo de lápiz original' },
  { id: 'dot_matrix', label: '🖨️ Impresora de matriz', description: 'Agujas rápidas tipo impresora antigua' },
  { id: 'pen_plotter', label: '🖊️ Plumilla suave', description: 'Trazo de rotulador sobre papel, suave' },
  { id: 'off', label: '🔇 Sin sonido de dibujo', description: 'El plotter dibuja en silencio' },
];

export const PRESET_GIFTS: GiftDefinition[] = [
  {
    id: 'gift_yo',
    name: 'Escribir "yo" en el Chat',
    tier: 'heart',
    coins: 1,
    icon: '💬',
    badgeColor: 'from-slate-700 to-slate-900',
    description: 'Dibuja en Blanco y Negro (Sumi-e) cuando comentan "yo"',
  },
  {
    id: 'gift_flower',
    name: 'Flor',
    tier: 'flower',
    coins: 1,
    icon: '🌸',
    badgeColor: 'from-pink-500 to-rose-400',
    description: 'Regalo Flor (1 moneda) - Dibuja a Color Pequeño',
  },
  {
    id: 'gift_korean_heart',
    name: 'Corazoncito Coreano',
    tier: 'donut',
    coins: 5,
    icon: '🫰',
    badgeColor: 'from-rose-500 to-pink-600',
    description: 'Regalo Corazoncito Coreano (5 monedas) - Dibuja a Color Mediano',
  },
  {
    id: 'gift_rosquilla',
    name: 'Rosquilla / VIP',
    tier: 'big_gift',
    coins: 30,
    icon: '🍩',
    badgeColor: 'from-amber-400 via-yellow-500 to-amber-600',
    description: 'Regalo Rosquilla / VIP (30 monedas) - ¡Dibuja en GRANDE con sello GOAT!',
  },
];

// ---- Configurable capture triggers per drawing tier ----
export type TriggerMode = 'likes' | 'gift' | 'text' | 'follow';

export interface TierTrigger {
  mode: TriggerMode;
  likes: number; // screen taps needed (mode 'likes')
  giftName: string; // TikTok gift name as sent by the API (mode 'gift')
  text: string; // chat keyword (mode 'text', only for the B/N tier)
}

export type TierTriggers = Record<GiftTier, TierTrigger>;

// Highest priority first: big > medium > small color > small B/N
export const TIER_PRIORITY: GiftTier[] = ['big_gift', 'donut', 'flower', 'heart'];

export const TIER_LABELS: Record<GiftTier, string> = {
  heart: 'Peque B/N',
  flower: 'Peque Color',
  donut: 'Mediano',
  big_gift: 'Grande',
};

export interface TikTokGift {
  name: string; // official name sent by TikTok Live (English)
  label: string; // Spanish label shown in the UI
  icon: string;
  coins: number;
}

export const TIKTOK_GIFTS: TikTokGift[] = [
  { name: 'Rose', label: 'Rosa', icon: '🌹', coins: 1 },
  { name: 'TikTok', label: 'TikTok', icon: '🎵', coins: 1 },
  { name: 'GG', label: 'GG', icon: '🎮', coins: 1 },
  { name: 'Ice Cream Cone', label: 'Cono de helado', icon: '🍦', coins: 1 },
  { name: 'Heart Me', label: 'Corazón', icon: '💗', coins: 1 },
  { name: 'Finger Heart', label: 'Corazón coreano', icon: '🫰', coins: 5 },
  { name: 'Friendship Necklace', label: 'Collar de amistad', icon: '📿', coins: 10 },
  { name: 'Rosa', label: 'Rosa luminosa', icon: '🌺', coins: 10 },
  { name: 'Perfume', label: 'Perfume', icon: '🧴', coins: 20 },
  { name: 'Doughnut', label: 'Rosquilla', icon: '🍩', coins: 30 },
  { name: 'Cap', label: 'Gorra', icon: '🧢', coins: 99 },
  { name: 'Little Crown', label: 'Corona', icon: '👑', coins: 99 },
  { name: 'Hand Hearts', label: 'Manos de corazón', icon: '🫶', coins: 100 },
  { name: 'Sunglasses', label: 'Gafas de sol', icon: '🕶️', coins: 199 },
  { name: 'Corgi', label: 'Corgi', icon: '🐕', coins: 299 },
  { name: 'Money Gun', label: 'Pistola de dinero', icon: '💸', coins: 500 },
  { name: 'Galaxy', label: 'Galaxia', icon: '🌌', coins: 1000 },
  { name: 'Lion', label: 'León', icon: '🦁', coins: 29999 },
  { name: 'Universe', label: 'Universo', icon: '🪐', coins: 34999 },
];

export const findTikTokGift = (name: string) =>
  TIKTOK_GIFTS.find((g) => g.name.toLowerCase() === (name || '').toLowerCase().trim());

export const DEFAULT_TIER_TRIGGERS: TierTriggers = {
  heart: { mode: 'likes', likes: 5, giftName: 'Rose', text: 'yo' },
  flower: { mode: 'likes', likes: 10, giftName: 'Rose', text: '' },
  donut: { mode: 'likes', likes: 15, giftName: 'Finger Heart', text: '' },
  big_gift: { mode: 'likes', likes: 20, giftName: 'Doughnut', text: '' },
};

/** Short caption printed under a drawing, e.g. "5 likes", "Rosa" or "\"yo\"" */
export const triggerCaption = (t: TierTrigger) => {
  if (t.mode === 'follow') return 'Siguiendo';
  if (t.mode === 'likes') return `${t.likes} likes`;
  if (t.mode === 'text') return `"${t.text}"`;
  return findTikTokGift(t.giftName)?.label || t.giftName;
};

/** Short legend text for a tier, e.g. "Peque B/N - 5x ❤️" or "Grande - 🍩 Rosquilla" */
export const describeTrigger = (tier: GiftTier, t: TierTrigger) => {
  if (t.mode === 'follow') return `${TIER_LABELS[tier]} - ➕ Seguir`;
  if (t.mode === 'likes') return `${TIER_LABELS[tier]} - ${t.likes}x ❤️`;
  if (t.mode === 'text') return `${TIER_LABELS[tier]} - 💬 "${t.text}"`;
  const g = findTikTokGift(t.giftName);
  return `${TIER_LABELS[tier]} - ${g ? `${g.icon} ${g.label}` : `🎁 ${t.giftName}`}`;
};

// ============================================================================
// APP 4: IMPRESORA A COLOR (1 HOJA A LA VEZ + MARCOS DE DONACIÓN DEL VIDEO)
// ============================================================================
export type ColorFrameTier =
  | 'bw_follow'
  | 'color_rose'
  | 'frame_gold'
  | 'frame_emerald'
  | 'frame_azure'
  | 'frame_mythic';

export type ColorTierTriggers = Record<ColorFrameTier, TierTrigger>;

export const COLOR_TIER_PRIORITY: ColorFrameTier[] = [
  'frame_mythic',
  'frame_azure',
  'frame_emerald',
  'frame_gold',
  'color_rose',
  'bw_follow',
];

export const COLOR_TIER_LABELS: Record<ColorFrameTier, string> = {
  bw_follow: 'Blanco y Negro',
  color_rose: 'Color Rosa (1)',
  frame_gold: 'Marco Dorado (5)',
  frame_emerald: 'Marco Esmeralda (10)',
  frame_azure: 'Marco Rosquilla (30)',
  frame_mythic: 'Marco Místico VIP (99)',
};

export const DEFAULT_COLOR_TIER_TRIGGERS: ColorTierTriggers = {
  bw_follow: { mode: 'follow', likes: 5, giftName: 'Rose', text: 'yo' },
  color_rose: { mode: 'gift', likes: 10, giftName: 'Rose', text: '' },
  frame_gold: { mode: 'gift', likes: 25, giftName: 'Finger Heart', text: '' },
  frame_emerald: { mode: 'gift', likes: 50, giftName: 'Friendship Necklace', text: '' },
  frame_azure: { mode: 'gift', likes: 100, giftName: 'Doughnut', text: '' },
  frame_mythic: { mode: 'gift', likes: 300, giftName: 'Little Crown', text: '' },
};

export interface ColorDonorItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  frameTier: ColorFrameTier;
  giftName: string;
  giftIcon: string;
  coins: number;
  timestamp: number;
  actionText: string; // e.g. "Siguiendo", "🌹 con Rose", "🍩 con Rosquilla"
}

export const describeColorTrigger = (tier: ColorFrameTier, t: TierTrigger) => {
  if (t.mode === 'follow') return `${COLOR_TIER_LABELS[tier]}: ➕ Seguir`;
  if (t.mode === 'likes') return `${COLOR_TIER_LABELS[tier]}: ${t.likes}x ❤️`;
  if (t.mode === 'text') return `${COLOR_TIER_LABELS[tier]}: 💬 "${t.text}"`;
  const g = findTikTokGift(t.giftName);
  return `${COLOR_TIER_LABELS[tier]}: ${g ? `${g.icon} ${g.label} (${g.coins})` : `🎁 ${t.giftName}`}`;
};

