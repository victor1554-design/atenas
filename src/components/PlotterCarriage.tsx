import React from 'react';
import { GiftTier } from '../types/tiktok';

interface PlotterCarriageProps {
  isDrawing: boolean;
  tier?: GiftTier;
}

/**
 * Authentic 2D CNC Plotter Carriage & Pen assembly.
 * Modeled directly after reference screenshot image_d67b91db.png:
 * - Upper blue cap and upper white barrel stick UP above the purple clamp.
 * - Purple clamp block grips the pen right at the horizontal rail centerline.
 * - Lower white barrel + red accent band + tapered cone + drawing nib extend DOWN.
 * - The very tip of the nib is located at EXACTLY y = +38px from the rail center.
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
      {/* 1. UPPER PEN SECTION (Sticks UP above the rail clamp - reference image_d67b91db.png) */}
      <div className="flex flex-col items-center -mb-1 z-10 drop-shadow-md">
        {/* Deep Blue Cap on top with rounded top crest */}
        <div className="h-5 w-3.5 rounded-t-sm bg-gradient-to-r from-blue-800 via-blue-600 to-blue-900 border-t border-x border-blue-400 shadow-sm" />
        {/* Cap parting groove */}
        <div className="h-0.5 w-3.5 bg-blue-950" />
        {/* Upper White Barrel visible above clamp */}
        <div className="h-2.5 w-3.5 bg-gradient-to-r from-slate-200 via-white to-slate-300 border-x border-slate-300" />
      </div>

      {/* 2. PURPLE CARRIAGE CLAMP (Centered right over the horizontal rail, height: 20px) */}
      <div className="relative h-5 w-10 rounded-md bg-gradient-to-b from-fuchsia-800 via-purple-900 to-purple-950 border-2 border-purple-400 shadow-xl flex items-center justify-center z-20">
        {/* Chrome rail groove through center */}
        <div className="h-1.5 w-7 rounded-full bg-slate-300/80 shadow-inner" />
        {/* Mechanical mounting bolts */}
        <div className="absolute left-1 top-1 h-1 w-1 rounded-full bg-slate-200 shadow-sm" />
        <div className="absolute right-1 top-1 h-1 w-1 rounded-full bg-slate-200 shadow-sm" />
      </div>

      {/* 3. LOWER PEN & DRAWING NIB (Extends down exactly 38px below rail center) */}
      <div className="flex flex-col items-center -mt-1 z-30 drop-shadow-lg">
        {/* Lower White Barrel (height: 12px) */}
        <div className="h-3 w-3.5 bg-gradient-to-r from-slate-200 via-white to-slate-300 border-x border-slate-300" />

        {/* Red Accent Band (height: 4px, visible in reference image) */}
        <div className="h-1 w-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 shadow-sm" />

        {/* Tapered Nib Cone (height: 8px) */}
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-200" />

        {/* Fine Nib / Brush Tip (height: 4px) touching paper */}
        <div
          className="w-1.5 h-1 -mt-0.5 rounded-b-[1px] shadow-sm"
          style={{ backgroundColor: tipInkColor }}
        />

        {/* Contact Ink Wet Point directly at paper contact */}
        {isDrawing && (
          <div
            className="h-2 w-2 -mt-0.5 rounded-full blur-[0.5px] animate-pulse"
            style={{
              backgroundColor: tipInkColor,
              boxShadow: `0 0 6px ${tipInkColor}`,
            }}
          />
        )}
      </div>
    </div>
  );
};
