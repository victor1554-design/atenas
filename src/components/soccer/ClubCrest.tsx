import React from 'react';

interface ClubCrestProps {
  teamId: string;
  size?: number;
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
  shortName?: string;
}

export const ClubCrest: React.FC<ClubCrestProps> = ({
  teamId,
  size = 36,
  className = '',
  primaryColor = '#1d4ed8',
  secondaryColor = '#ffffff',
  shortName = 'FC',
}) => {
  const s = size;

  switch (teamId) {
    case 'boca':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M15 15 H85 V60 C85 85 50 95 50 95 C50 95 15 85 15 60 Z" fill="#001489" stroke="#FFD100" strokeWidth="4" />
          <path d="M15 42 H85 V62 H15 Z" fill="#FFD100" />
          <text x="50" y="56" fill="#001489" fontSize="13" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">CABJ</text>
          <circle cx="50" cy="28" r="3.5" fill="#FFD100" />
          <circle cx="36" cy="32" r="3" fill="#FFD100" />
          <circle cx="64" cy="32" r="3" fill="#FFD100" />
        </svg>
      );

    case 'river':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M15 15 H85 V58 C85 82 50 94 50 94 C50 94 15 82 15 58 Z" fill="#ffffff" stroke="#111827" strokeWidth="4" />
          <path d="M15 22 L82 85 H85 V65 L35 15 H15 Z" fill="#dc2626" />
          <circle cx="50" cy="50" r="16" fill="#ffffff" stroke="#111827" strokeWidth="2.5" />
          <text x="50" y="55" fill="#111827" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">CARP</text>
        </svg>
      );

    case 'flamengo':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M15 15 H85 V58 C85 85 50 95 50 95 C50 95 15 85 15 58 Z" fill="#c1121f" stroke="#111827" strokeWidth="4" />
          <path d="M15 28 H85 V40 H15 Z" fill="#111827" />
          <path d="M15 52 H85 V64 H15 Z" fill="#111827" />
          <rect x="18" y="18" width="30" height="28" fill="#111827" rx="3" />
          <text x="33" y="37" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">CRF</text>
        </svg>
      );

    case 'palmeiras':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="44" fill="#006437" stroke="#ffffff" strokeWidth="4" />
          <circle cx="50" cy="50" r="34" fill="#ffffff" stroke="#006437" strokeWidth="2" />
          <circle cx="50" cy="50" r="26" fill="#006437" />
          <text x="50" y="59" fill="#ffffff" fontSize="26" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">P</text>
        </svg>
      );

    case 'saopaulo':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M15 20 H85 L50 90 Z" fill="#ffffff" stroke="#111827" strokeWidth="4" />
          <rect x="15" y="20" width="70" height="18" fill="#111827" />
          <text x="50" y="34" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">SPFC</text>
          <path d="M25 40 H48 L48 70 Z" fill="#dc2626" />
          <path d="M75 40 H52 L52 70 Z" fill="#111827" />
        </svg>
      );

    case 'corinthians':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="44" fill="#18181b" stroke="#dc2626" strokeWidth="3" />
          <circle cx="50" cy="50" r="32" fill="#ffffff" stroke="#18181b" strokeWidth="3" />
          <line x1="28" y1="28" x2="72" y2="72" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
          <line x1="72" y1="28" x2="28" y2="72" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="50" r="16" fill="#18181b" />
          <text x="50" y="55" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">CP</text>
        </svg>
      );

    case 'santos':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M15 15 H85 V60 C85 85 50 95 50 95 C50 95 15 85 15 60 Z" fill="#ffffff" stroke="#111827" strokeWidth="4" />
          <path d="M15 15 L85 85 V90 L15 20 Z" fill="#111827" />
          <circle cx="36" cy="36" r="10" fill="#111827" />
          <text x="50" y="55" fill="#111827" fontSize="12" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">SFC</text>
        </svg>
      );

    case 'penarol':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M18 15 H82 V55 C82 80 50 95 50 95 C50 95 18 80 18 55 Z" fill="#facc15" stroke="#111827" strokeWidth="4" />
          <path d="M30 15 V90 M43 15 V95 M57 15 V95 M70 15 V90" stroke="#111827" strokeWidth="6" />
          <rect x="25" y="20" width="50" height="24" fill="#111827" rx="4" />
          <text x="50" y="36" fill="#facc15" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">CAP</text>
        </svg>
      );

    case 'nacional':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M15 20 H85 V65 C85 85 50 95 50 95 C50 95 15 85 15 65 Z" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
          <path d="M15 30 L85 70 V85 L15 45 Z" fill="#ffffff" />
          <path d="M15 35 L85 75 V80 L15 40 Z" fill="#ef4444" />
          <text x="50" y="44" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">C.N.deF</text>
        </svg>
      );

    case 'olimpia':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#111827" strokeWidth="4" />
          <rect x="6" y="38" width="88" height="24" fill="#111827" />
          <text x="50" y="55" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">OLIMPIA</text>
          <path d="M50 14 L53 22 L62 22 L55 27 L57 35 L50 30 L43 35 L45 27 L38 22 L47 22 Z" fill="#eab308" />
        </svg>
      );

    case 'colocolo':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#111827" strokeWidth="4" />
          <rect x="10" y="16" width="80" height="20" fill="#111827" rx="3" />
          <text x="50" y="30" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">COLO-COLO</text>
          <circle cx="50" cy="62" r="18" fill="#111827" />
          <path d="M42 56 Q50 48 58 56 Q54 68 50 72 Q46 68 42 56 Z" fill="#ffffff" />
        </svg>
      );

    case 'atleticonacional':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M15 15 H85 V60 C85 85 50 95 50 95 C50 95 15 85 15 60 Z" fill="#15803d" stroke="#ffffff" strokeWidth="3" />
          <path d="M28 15 V90 M42 15 V95 M58 15 V95 M72 15 V90" stroke="#ffffff" strokeWidth="6" />
          <rect x="25" y="20" width="50" height="24" fill="#ffffff" rx="4" />
          <text x="50" y="37" fill="#15803d" fontSize="14" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">NN</text>
        </svg>
      );

    case 'millonarios':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="44" fill="#1e40af" stroke="#ffffff" strokeWidth="4" />
          <circle cx="50" cy="50" r="32" fill="#1e40af" stroke="#ffffff" strokeWidth="2.5" />
          <path d="M34 62 L42 38 L50 50 L58 38 L66 62" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'ldu':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M18 15 H82 V60 C82 85 50 95 50 95 C50 95 18 85 18 60 Z" fill="#ffffff" stroke="#dc2626" strokeWidth="4" />
          <path d="M30 30 H70 L50 55 Z" fill="#dc2626" />
          <path d="M38 52 H62 L50 72 Z" fill="#2563eb" />
          <text x="50" y="44" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">LDU</text>
        </svg>
      );

    case 'alianza':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M16 15 H84 V60 C84 85 50 95 50 95 C50 95 16 85 16 60 Z" fill="#0a1d47" stroke="#ffffff" strokeWidth="3" />
          <path d="M30 15 V90 M44 15 V95 M56 15 V95 M70 15 V90" stroke="#ffffff" strokeWidth="5" />
          <circle cx="50" cy="30" r="12" fill="#0a1d47" stroke="#ffffff" strokeWidth="2" />
          <text x="50" y="34" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">AL</text>
        </svg>
      );

    case 'universitario':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="44" fill="#fef08a" stroke="#881337" strokeWidth="5" />
          <circle cx="50" cy="50" r="35" fill="#fef08a" stroke="#881337" strokeWidth="2" />
          <text x="50" y="66" fill="#881337" fontSize="46" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">U</text>
        </svg>
      );

    case 'racing':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M16 15 H84 V60 C84 85 50 95 50 95 C50 95 16 85 16 60 Z" fill="#38bdf8" stroke="#ffffff" strokeWidth="3" />
          <path d="M30 15 V90 M44 15 V95 M56 15 V95 M70 15 V90" stroke="#ffffff" strokeWidth="5" />
          <rect x="25" y="20" width="50" height="24" fill="#0284c7" rx="3" />
          <text x="50" y="36" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">RC</text>
        </svg>
      );

    case 'independiente':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M16 15 H84 V60 C84 85 50 95 50 95 C50 95 16 85 16 60 Z" fill="#dc2626" stroke="#ffffff" strokeWidth="3" />
          <path d="M16 25 L84 75 V85 L16 35 Z" fill="#ffffff" />
          <circle cx="50" cy="52" r="16" fill="#dc2626" stroke="#ffffff" strokeWidth="2.5" />
          <text x="50" y="57" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">CAI</text>
        </svg>
      );

    case 'gremio':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="44" fill="#0284c7" stroke="#ffffff" strokeWidth="3" />
          <rect x="6" y="38" width="88" height="24" fill="#09090b" />
          <text x="50" y="55" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">GREMIO</text>
          <line x1="16" y1="28" x2="84" y2="28" stroke="#ffffff" strokeWidth="3" />
          <line x1="16" y1="72" x2="84" y2="72" stroke="#ffffff" strokeWidth="3" />
        </svg>
      );

    case 'cerroporteno':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M16 15 H84 V60 C84 85 50 95 50 95 C50 95 16 85 16 60 Z" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
          <path d="M30 15 V90 M44 15 V95 M56 15 V95 M70 15 V90" stroke="#dc2626" strokeWidth="6" />
          <circle cx="50" cy="35" r="14" fill="#ffffff" />
          <text x="50" y="40" fill="#1d4ed8" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">CCP</text>
        </svg>
      );

    case 'bolivar':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M16 15 H84 V60 C84 85 50 95 50 95 C50 95 16 85 16 60 Z" fill="#38bdf8" stroke="#ffffff" strokeWidth="3" />
          <path d="M16 20 L84 75 V85 L16 30 Z" fill="#ffffff" />
          <circle cx="50" cy="52" r="16" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
          <text x="50" y="58" fill="#ffffff" fontSize="16" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">B</text>
        </svg>
      );

    case 'sanlorenzo':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="44" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
          <path d="M32 15 V85 M50 15 V85 M68 15 V85" stroke="#dc2626" strokeWidth="10" />
          <circle cx="50" cy="50" r="22" fill="#ffffff" stroke="#111827" strokeWidth="2" />
          <text x="50" y="55" fill="#1d4ed8" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">CASLA</text>
        </svg>
      );

    case 'sportingcristal':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M16 15 H84 V60 C84 85 50 95 50 95 C50 95 16 85 16 60 Z" fill="#38bdf8" stroke="#ffffff" strokeWidth="3" />
          <rect x="22" y="24" width="56" height="26" fill="#ffffff" rx="4" />
          <text x="50" y="42" fill="#0284c7" fontSize="13" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">SC</text>
          <circle cx="50" cy="68" r="8" fill="#ffffff" />
        </svg>
      );

    case 'barcelonaec':
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path d="M16 15 H84 V60 C84 85 50 95 50 95 C50 95 16 85 16 60 Z" fill="#facc15" stroke="#111827" strokeWidth="3" />
          <path d="M16 15 H50 V45 H16 Z" fill="#ffffff" />
          <line x1="33" y1="15" x2="33" y2="45" stroke="#dc2626" strokeWidth="4" />
          <line x1="16" y1="30" x2="50" y2="30" stroke="#dc2626" strokeWidth="4" />
          <text x="50" y="65" fill="#111827" fontSize="12" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">BSC</text>
        </svg>
      );

    default:
      // Sleek dynamic badge generator for any other club using its authentic primary & secondary colors
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" className={className} fill="none">
          <path
            d="M16 15 H84 V60 C84 85 50 95 50 95 C50 95 16 85 16 60 Z"
            fill={primaryColor}
            stroke={secondaryColor === '#ffffff' ? '#ffffff' : secondaryColor}
            strokeWidth="3.5"
          />
          <path d="M22 24 H78 V44 H22 Z" fill={secondaryColor} opacity="0.9" rx="3" />
          <text
            x="50"
            y="39"
            fill={primaryColor === '#ffffff' ? '#111827' : primaryColor}
            fontSize="12"
            fontWeight="900"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            {shortName.slice(0, 4)}
          </text>
          <circle cx="50" cy="68" r="10" fill={secondaryColor} opacity="0.8" />
          <circle cx="50" cy="68" r="4" fill={primaryColor} />
        </svg>
      );
  }
};
