import React from 'react';
import { GiftTier } from '../types/tiktok';

interface PlotterCarriageProps {
  isDrawing: boolean;
  tier?: GiftTier;
}

/**
 * High-realism 2D CNC Plotter Carriage & Artist Pen/Marker assembly.
 * Preserves the exact vertical geometry:
 * - Upper cap & barrel: 26px height with -mb-1 (22px net above clamp)
 * - Central anodized clamp block: 20px height (centered on the 16px rail)
 * - Lower barrel + metallic ferrule cone + nib: extends down so the exact nib tip
 *   remains at y = +38px from rail center (PEN_TIP_OFFSET_Y = 46px from gantry top).
 */
export const PlotterCarriage: React.FC<PlotterCarriageProps> = ({
  isDrawing,
  tier,
}) => {
  const tipInkColor =
    tier === 'heart'
      ? '#18181b'
      : tier === 'flower'
      ? '#ec4899'
      : tier === 'donut'
      ? '#f59e0b'
      : '#eab308';

  return (
    <div className="relative flex flex-col items-center select-none pointer-events-none">
      {/* Cast shadow of the pen & carriage onto the paper sheet */}
      <div
        className="pointer-events-none absolute top-3 left-2.5 h-16 w-8 rounded-full bg-slate-900/20 blur-[4px] -z-10"
        style={{ transform: 'rotate(-8deg)' }}
      />

      {/* 1. UPPER PEN SECTION (Sticks UP above the rail clamp: 28px total - 4px overlap) */}
      <div className="relative flex flex-col items-center -mb-1 z-10 drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)]">
        {/* Realistic Vent Cap Button on top */}
        <div
          className="h-1 w-2.5 rounded-t-full border-t border-blue-300/60"
          style={{
            background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 40%, #1d4ed8 75%, #172554 100%)',
          }}
        />
        {/* Cylindrical Deep Cobalt Cap with metallic pocket clip on the right */}
        <div
          className="relative h-4 w-4 rounded-t-[3px] border-t border-x border-blue-400/50"
          style={{
            background:
              'linear-gradient(90deg, #172554 0%, #2563eb 28%, #60a5fa 45%, #1d4ed8 72%, #0f172a 100%)',
          }}
        >
          {/* Metallic pen clip on right side */}
          <div
            className="absolute -right-[3px] top-0.5 h-3.5 w-[2.5px] rounded-r-sm"
            style={{
              background: 'linear-gradient(180deg, #f8fafc 0%, #94a3b8 50%, #475569 100%)',
            }}
          />
          {/* Specular cylindrical highlight */}
          <div className="absolute left-1 top-0.5 bottom-0.5 w-[1.5px] bg-white/40 rounded-full" />
        </div>

        {/* Chrome Knurled Collar Ring */}
        <div
          className="h-1 w-4 border-y border-slate-500/80"
          style={{
            background:
              'linear-gradient(90deg, #475569 0%, #e2e8f0 30%, #ffffff 50%, #94a3b8 75%, #334155 100%)',
          }}
        />

        {/* Upper Cylindrical Marker Barrel above clamp */}
        <div
          className="relative h-2.5 w-4 border-x border-slate-400/80"
          style={{
            background:
              'linear-gradient(90deg, #cbd5e1 0%, #f8fafc 25%, #ffffff 45%, #e2e8f0 75%, #94a3b8 100%)',
          }}
        >
          {/* Active Ink Color Indicator Ring */}
          <div
            className="absolute inset-x-0 top-0.5 h-[3px] opacity-90"
            style={{ backgroundColor: tipInkColor }}
          />
        </div>
      </div>

      {/* 2. CNC ANODIZED CARRIAGE CLAMP ASSEMBLY (Centered over horizontal rail, height: 20px) */}
      <div
        className="relative h-5 w-11 rounded-[5px] border border-purple-300/60 shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] flex items-center justify-center z-20"
        style={{
          background:
            'linear-gradient(180deg, #86198f 0%, #581c87 45%, #3b0764 85%, #2e1065 100%)',
        }}
      >
        {/* Knurled Brass Pen-Locking Thumbscrew sticking out on the right */}
        <div
          className="absolute -right-2 top-1/2 -translate-y-1/2 h-2.5 w-2 rounded-r-sm border border-amber-600/80 shadow"
          style={{
            background:
              'linear-gradient(180deg, #fef08a 0%, #f59e0b 45%, #b45309 85%, #78350f 100%)',
          }}
        />

        {/* Machined Center Bore Holding the Pen Barrel */}
        <div
          className="h-3.5 w-5 rounded-[3px] border border-slate-400/60 flex items-center justify-center shadow-inner"
          style={{
            background: 'linear-gradient(90deg, #1e293b 0%, #475569 50%, #0f172a 100%)',
          }}
        >
          {/* Pen barrel passing through the clamp window */}
          <div
            className="h-full w-3.5"
            style={{
              background:
                'linear-gradient(90deg, #94a3b8 0%, #f8fafc 40%, #ffffff 55%, #64748b 100%)',
            }}
          />
        </div>

        {/* 4 Corner Socket Head Allen Bolts */}
        <div className="absolute left-1 top-0.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-600 border border-slate-700 flex items-center justify-center">
          <div className="h-0.5 w-0.5 rounded-full bg-slate-800" />
        </div>
        <div className="absolute right-1 top-0.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-600 border border-slate-700 flex items-center justify-center">
          <div className="h-0.5 w-0.5 rounded-full bg-slate-800" />
        </div>
        <div className="absolute left-1 bottom-0.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-600 border border-slate-700 flex items-center justify-center">
          <div className="h-0.5 w-0.5 rounded-full bg-slate-800" />
        </div>
        <div className="absolute right-1 bottom-0.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-600 border border-slate-700 flex items-center justify-center">
          <div className="h-0.5 w-0.5 rounded-full bg-slate-800" />
        </div>
      </div>

      {/* 3. LOWER PEN BARREL, METALLIC FERRULE & PRECISION NIB (Extends down exactly 38px below rail center) */}
      <div className="flex flex-col items-center -mt-1 z-30 drop-shadow-[0_4px_5px_rgba(0,0,0,0.45)]">
        {/* Lower Cylindrical White Grip Barrel (height: 12px) */}
        <div
          className="relative h-3 w-4 border-x border-slate-400/80 flex flex-col justify-evenly items-center"
          style={{
            background:
              'linear-gradient(90deg, #cbd5e1 0%, #f8fafc 28%, #ffffff 48%, #e2e8f0 75%, #94a3b8 100%)',
          }}
        >
          {/* Subtle anti-slip grip grooves */}
          <div className="w-full h-[1px] bg-slate-400/40" />
          <div className="w-full h-[1px] bg-slate-400/40" />
        </div>

        {/* Crimson Anodized Ring Band (height: 4px) */}
        <div
          className="h-1 w-4 border-x border-rose-900/50"
          style={{
            background:
              'linear-gradient(90deg, #881337 0%, #e11d48 30%, #fb7185 48%, #be123c 75%, #4c0519 100%)',
          }}
        />

        {/* Tapered Machined Steel Ferrule Cone (height: 8px) using SVG for crisp 3D metallic cone */}
        <svg width="16" height="8" viewBox="0 0 16 8" className="overflow-visible">
          <defs>
            <linearGradient id="ferruleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="32%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="75%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          <polygon points="0,0 16,0 10.5,8 5.5,8" fill="url(#ferruleGrad)" stroke="#475569" strokeWidth="0.5" />
          {/* Precision brass nib sleeve at tip of cone */}
          <polygon points="5.8,5.5 10.2,5.5 9.2,8 6.8,8" fill="#d97706" />
        </svg>

        {/* Fine Fiber/Technical Nib Tip (height: 4px) touching paper */}
        <div
          className="w-1.5 h-1 -mt-0.5 rounded-b-full shadow-sm"
          style={{
            background: `linear-gradient(90deg, ${tipInkColor}, ${tipInkColor})`,
          }}
        />

        {/* Contact Ink Wet Point directly at paper contact */}
        {isDrawing && (
          <div
            className="h-2 w-2 -mt-0.5 rounded-full blur-[0.5px] animate-pulse"
            style={{
              backgroundColor: tipInkColor,
              boxShadow: `0 0 8px ${tipInkColor}`,
            }}
          />
        )}
      </div>
    </div>
  );
};

