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
export type TriggerMode = 'likes' | 'gift' | 'text';

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
  { name: 'Perfume', label: 'Perfume', icon: '🧴', coins: 20 },
  { name: 'Doughnut', label: 'Rosquilla', icon: '🍩', coins: 30 },
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
  if (t.mode === 'likes') return `${t.likes} likes`;
  if (t.mode === 'text') return `"${t.text}"`;
  return findTikTokGift(t.giftName)?.label || t.giftName;
};

/** Short legend text for a tier, e.g. "Peque B/N - 5x ❤️" or "Grande - 🍩 Rosquilla" */
export const describeTrigger = (tier: GiftTier, t: TierTrigger) => {
  if (t.mode === 'likes') return `${TIER_LABELS[tier]} - ${t.likes}x ❤️`;
  if (t.mode === 'text') return `${TIER_LABELS[tier]} - 💬 "${t.text}"`;
  const g = findTikTokGift(t.giftName);
  return `${TIER_LABELS[tier]} - ${g ? `${g.icon} ${g.label}` : `🎁 ${t.giftName}`}`;
};
