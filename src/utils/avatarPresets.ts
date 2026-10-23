/**
 * Diverse, colorful SVG avatar generator to guarantee 100% offline reliability
 * without relying on external image CDNs that might block canvas reading (CORS).
 */

export interface PresetAvatar {
  id: string;
  name: string;
  dataUrl: string;
}

export function generateSvgAvatar(name: string, bgGradient: [string, string], faceColor: string, hairColor: string, accessories: 'glasses' | 'cap' | 'crown' | 'headphones' | 'none' = 'none'): string {
  const initial = name.slice(0, 2).toUpperCase();

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}" />
        <stop offset="100%" stop-color="${bgGradient[1]}" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25"/>
      </filter>
    </defs>
    <!-- Background Circle -->
    <rect width="200" height="200" rx="100" fill="url(#bg)" />

    <!-- Shoulders & Body -->
    <path d="M 40 190 C 40 145, 160 145, 160 190 Z" fill="#1e293b" opacity="0.9" />

    <!-- Neck -->
    <rect x="85" y="115" width="30" height="25" rx="6" fill="${faceColor}" />

    <!-- Head / Face -->
    <ellipse cx="100" cy="90" rx="42" ry="48" fill="${faceColor}" filter="url(#shadow)" />

    <!-- Hair Base -->
    <path d="M 58 85 C 55 50, 145 50, 142 85 C 130 65, 70 65, 58 85 Z" fill="${hairColor}" />

    <!-- Eyes -->
    <ellipse cx="85" cy="90" rx="4.5" ry="5.5" fill="#0f172a" />
    <ellipse cx="115" cy="90" rx="4.5" ry="5.5" fill="#0f172a" />
    <circle cx="87" cy="88" r="1.5" fill="#ffffff" />
    <circle cx="117" cy="88" r="1.5" fill="#ffffff" />

    <!-- Eyebrows -->
    <path d="M 78 80 Q 86 77 92 80" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <path d="M 108 80 Q 114 77 122 80" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none" />

    <!-- Nose -->
    <path d="M 100 90 L 98 98 L 104 98" stroke="#334155" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />

    <!-- Smile / Mouth -->
    <path d="M 88 112 Q 100 122 112 112" stroke="#be123c" stroke-width="3" stroke-linecap="round" fill="none" />

    <!-- Cheeks (Blush) -->
    <ellipse cx="76" cy="100" rx="7" ry="4" fill="#fb7185" opacity="0.45" />
    <ellipse cx="124" cy="100" rx="7" ry="4" fill="#fb7185" opacity="0.45" />

    ${
      accessories === 'glasses'
        ? `
      <!-- Glasses -->
      <circle cx="85" cy="90" r="14" stroke="#1e293b" stroke-width="3" fill="none" />
      <circle cx="115" cy="90" r="14" stroke="#1e293b" stroke-width="3" fill="none" />
      <path d="M 99 90 L 101 90" stroke="#1e293b" stroke-width="3" />
      <path d="M 71 88 L 60 84" stroke="#1e293b" stroke-width="2" />
      <path d="M 129 88 L 140 84" stroke="#1e293b" stroke-width="2" />
    `
        : accessories === 'crown'
        ? `
      <!-- Golden Crown -->
      <path d="M 75 52 L 85 30 L 100 45 L 115 30 L 125 52 Z" fill="#eab308" stroke="#ca8a04" stroke-width="2" />
      <circle cx="85" cy="30" r="2.5" fill="#f43f5e" />
      <circle cx="100" cy="45" r="2.5" fill="#3b82f6" />
      <circle cx="115" cy="30" r="2.5" fill="#10b981" />
    `
        : accessories === 'headphones'
        ? `
      <!-- Headphones -->
      <path d="M 52 90 A 48 48 0 0 1 148 90" stroke="#0ea5e9" stroke-width="5" fill="none" />
      <rect x="46" y="80" width="12" height="24" rx="6" fill="#0284c7" />
      <rect x="142" y="80" width="12" height="24" rx="6" fill="#0284c7" />
    `
        : accessories === 'cap'
        ? `
      <!-- Cap -->
      <path d="M 54 75 Q 100 40 146 75 Z" fill="#dc2626" />
      <path d="M 70 75 Q 110 75 155 82" stroke="#991b1b" stroke-width="4" stroke-linecap="round" fill="none" />
    `
        : ''
    }

    <!-- Watermark / Tag Initials -->
    <g transform="translate(145, 145)">
      <circle cx="15" cy="15" r="15" fill="#0f172a" opacity="0.8" />
      <text x="15" y="20" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">${initial}</text>
    </g>
  </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'streamer_1',
    name: 'Carlos_Gamer',
    dataUrl: generateSvgAvatar('Carlos', ['#3b82f6', '#1d4ed8'], '#ffd1b3', '#262626', 'headphones'),
  },
  {
    id: 'streamer_2',
    name: 'Sofia_Tiktok',
    dataUrl: generateSvgAvatar('Sofia', ['#ec4899', '#be185d'], '#ffdfba', '#7c2d12', 'crown'),
  },
  {
    id: 'streamer_3',
    name: 'Alex_Master',
    dataUrl: generateSvgAvatar('Alex', ['#10b981', '#047857'], '#e2b392', '#18181b', 'glasses'),
  },
  {
    id: 'streamer_4',
    name: 'Luna_Star',
    dataUrl: generateSvgAvatar('Luna', ['#8b5cf6', '#6d28d9'], '#ffe0bd', '#431407', 'cap'),
  },
  {
    id: 'streamer_5',
    name: 'Mateo_GOOT',
    dataUrl: generateSvgAvatar('Mateo', ['#f59e0b', '#b45309'], '#f3c19e', '#0f172a', 'crown'),
  },
  {
    id: 'streamer_6',
    name: 'Camila_Live',
    dataUrl: generateSvgAvatar('Camila', ['#06b6d4', '#0e7490'], '#ffd6ba', '#5b21b6', 'headphones'),
  },
];
