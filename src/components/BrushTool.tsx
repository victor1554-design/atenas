import React from 'react';
import { GiftTier } from '../types/tiktok';

interface BrushToolProps {
  x: number;
  y: number;
  isDrawing: boolean;
  angle?: number;
  tier: GiftTier;
  scale?: number;
}

export const BrushTool: React.FC<BrushToolProps> = ({
  x,
  y,
  isDrawing,
  angle = -35,
  tier,
  scale = 1,
}) => {
  // Brush tip ink color according to gift tier
  const tipInkColor =
    tier === 'heart'
      ? '#18181b' // deep black ink
      : tier === 'flower'
      ? '#ec4899' // rose pink ink
      : tier === 'donut'
      ? '#f59e0b' // warm amber ink
      : '#eab308'; // golden ink for big gift

  return (
    <div
      className="pointer-events-none absolute z-30 transition-transform duration-75 will-change-transform"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-18px, -82px) scale(${scale})`,
      }}
    >
      {/* Contact ink droplet/shadow under tip */}
      {isDrawing && (
        <div
          className="absolute left-[16px] top-[80px] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[1px] transition-all"
          style={{
            backgroundColor: tipInkColor,
            opacity: 0.7,
            boxShadow: `0 0 8px ${tipInkColor}`,
          }}
        />
      )}

      {/* Realistic Fine Art Paint Brush SVG */}
      <svg
        width="56"
        height="96"
        viewBox="0 0 56 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transformOrigin: '18px 82px',
          transform: `rotate(${angle}deg)`,
          filter: 'drop-shadow(3px 5px 6px rgba(0,0,0,0.45))',
        }}
      >
        <defs>
          {/* Wooden / Sleek Studio Handle Gradient */}
          <linearGradient id="handleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="40%" stop-color="#64748b" />
            <stop offset="70%" stop-color="#475569" />
            <stop offset="100%" stop-color="#1e293b" />
          </linearGradient>

          {/* Chrome / Silver Ferrule Gradient */}
          <linearGradient id="ferruleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#94a3b8" />
            <stop offset="35%" stop-color="#f8fafc" />
            <stop offset="70%" stop-color="#cbd5e1" />
            <stop offset="100%" stop-color="#64748b" />
          </linearGradient>

          {/* Natural Bristles Gradient */}
          <linearGradient id="bristleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#d97706" />
            <stop offset="45%" stop-color="#b45309" />
            <stop offset="85%" stop-color={tipInkColor} />
            <stop offset="100%" stop-color={tipInkColor} />
          </linearGradient>
        </defs>

        {/* 1. Long Ergonomic Artist Handle */}
        <path
          d="M 15 2 Q 18 0 21 2 L 23 48 L 13 48 Z"
          fill="url(#handleGrad)"
        />
        {/* Handle highlight */}
        <line x1="17.5" y1="3" x2="18" y2="46" stroke="#94a3b8" stroke-width="1" opacity="0.6" />

        {/* 2. Chrome Ferrule (Metal Clamp) */}
        <rect x="12" y="48" width="12" height="18" rx="1.5" fill="url(#ferruleGrad)" stroke="#475569" stroke-width="0.5" />
        {/* Ferrule crimps / bands */}
        <line x1="12" y1="54" x2="24" y2="54" stroke="#475569" stroke-width="0.8" />
        <line x1="12" y1="60" x2="24" y2="60" stroke="#475569" stroke-width="0.8" />

        {/* 3. Soft Tapered Bristles (Cerdas del pincel) */}
        <path
          d="M 12.5 66 C 12 73, 16 82, 18 83 C 20 82, 24 73, 23.5 66 Z"
          fill="url(#bristleGrad)"
        />

        {/* Bristle individual hair texture lines */}
        <path d="M 14.5 66 Q 15.5 74 18 82" stroke="rgba(255,255,255,0.25)" stroke-width="0.5" fill="none" />
        <path d="M 17 66 L 18 82" stroke="rgba(0,0,0,0.3)" stroke-width="0.5" fill="none" />
        <path d="M 21.5 66 Q 20.5 74 18 82" stroke="rgba(255,255,255,0.25)" stroke-width="0.5" fill="none" />

        {/* 4. Wet Ink Glow at the Tip */}
        <circle cx="18" cy="82" r="2.5" fill={tipInkColor} opacity="0.9" />
      </svg>
    </div>
  );
};
