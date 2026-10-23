import React, { useEffect, useState, useRef } from 'react';
import {
  ColorDonorItem,
  ColorFrameTier,
  ColorTierTriggers,
  findTikTokGift,
} from '../types/tiktok';
import { soundEngine } from '../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Camera } from 'lucide-react';

interface ColorPhotoPrinterProps {
  activeDonor: ColorDonorItem | null;
  queueCount: number;
  printedCount: number;
  wallItems: ColorDonorItem[];
  vipCenterItem: ColorDonorItem;
  onPrintComplete: (donor: ColorDonorItem, targetSlotIndex?: number) => void;
  obsMode: boolean;
  colorTierTriggers: ColorTierTriggers;
}

type PrintCyclePhase = 'idle' | 'printing' | 'flying' | 'celebrating';

// Exact flight offsets from the printer output slot (center) to each of the 8 wall slots
const WALL_SLOT_FLIGHT_OFFSETS: { x: number; y: number }[] = [
  { x: -168, y: -216 }, // Slot 0: Left Top-Left
  { x: -94, y: -216 },  // Slot 1: Left Top-Right
  { x: -168, y: -124 }, // Slot 2: Left Bottom-Left
  { x: -94, y: -124 },  // Slot 3: Left Bottom-Right
  { x: 94, y: -216 },   // Slot 4: Right Top-Left
  { x: 168, y: -216 },  // Slot 5: Right Top-Right
  { x: 94, y: -124 },   // Slot 6: Right Bottom-Left
  { x: 168, y: -124 },  // Slot 7: Right Bottom-Right
];

const VIP_CENTER_FLIGHT_OFFSET = { x: 0, y: -172 };

// Exact screen coordinates (left %, top px) of the center of each wall slot's image
const WALL_SLOT_SCREEN_COORDS: { left: string; top: string }[] = [
  { left: '10.5%', top: '84px' },  // Slot 0: Left Top-Left (B/W)
  { left: '27.5%', top: '84px' },  // Slot 1: Left Top-Right (B/W)
  { left: '10.5%', top: '178px' }, // Slot 2: Left Bottom-Left (B/W)
  { left: '27.5%', top: '178px' }, // Slot 3: Left Bottom-Right (B/W)
  { left: '72.5%', top: '84px' },  // Slot 4: Right Top-Left (Rosa)
  { left: '89.5%', top: '84px' },  // Slot 5: Right Top-Right (Dorado)
  { left: '72.5%', top: '178px' }, // Slot 6: Right Bottom-Left (Esmeralda)
  { left: '89.5%', top: '178px' }, // Slot 7: Right Bottom-Right (Diamante)
];

const VIP_CENTER_SCREEN_COORDS = { left: '50%', top: '131px' };

const FRAME_STYLES: Record<
  ColorFrameTier,
  {
    name: string;
    sheetBg: string;
    outerBorder: string;
    innerBorder: string;
    ringBorder: string;
    bannerBg: string;
    bannerText: string;
    subText: string;
    badgeBg: string;
    isGrayscale: boolean;
    coinsLabel: string;
  }
> = {
  bw_follow: {
    name: 'Blanco y Negro',
    sheetBg: 'linear-gradient(180deg, #FBF8F1 0%, #EFE8D8 100%)',
    outerBorder: 'border-2 border-stone-800',
    innerBorder: 'border border-stone-600/80',
    ringBorder: 'border-[3px] border-stone-900 shadow-inner',
    bannerBg: 'bg-[#F5EFE2] border-[1.5px] border-stone-800 text-stone-900',
    bannerText: 'text-stone-900 font-serif font-black',
    subText: 'text-stone-600',
    badgeBg: 'bg-red-600 text-white',
    isGrayscale: true,
    coinsLabel: 'FOLLOW',
  },
  color_rose: {
    name: 'Color Rosa',
    sheetBg: 'linear-gradient(160deg, #FFF0F5 0%, #FFD1E3 55%, #FFB8D2 100%)',
    outerBorder: 'border-2 border-pink-400',
    innerBorder: 'border border-white/80',
    ringBorder: 'border-[3px] border-white shadow-[0_0_12px_rgba(244,63,94,0.45)]',
    bannerBg: 'bg-white/95 border border-pink-300 text-rose-700 shadow-sm',
    bannerText: 'text-rose-700 font-extrabold',
    subText: 'text-rose-500',
    badgeBg: 'bg-pink-600 text-white',
    isGrayscale: false,
    coinsLabel: '1',
  },
  frame_gold: {
    name: 'Marco Dorado',
    sheetBg: 'linear-gradient(160deg, #FFFBEB 0%, #FDE68A 50%, #F59E0B 100%)',
    outerBorder: 'border-2 border-amber-500',
    innerBorder: 'border border-yellow-200',
    ringBorder: 'border-[3px] border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.65)]',
    bannerBg: 'bg-amber-950/90 border border-amber-400 text-amber-200 shadow-sm',
    bannerText: 'text-amber-200 font-extrabold',
    subText: 'text-amber-300',
    badgeBg: 'bg-amber-500 text-slate-950',
    isGrayscale: false,
    coinsLabel: '5',
  },
  frame_emerald: {
    name: 'Marco Esmeralda',
    sheetBg: 'linear-gradient(160deg, #ECFDF5 0%, #6EE7B7 45%, #059669 100%)',
    outerBorder: 'border-2 border-emerald-400',
    innerBorder: 'border border-emerald-200/80',
    ringBorder: 'border-[3px] border-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.7)]',
    bannerBg: 'bg-emerald-950/90 border border-emerald-400 text-emerald-200 shadow-sm',
    bannerText: 'text-emerald-100 font-extrabold',
    subText: 'text-emerald-300',
    badgeBg: 'bg-emerald-500 text-slate-950',
    isGrayscale: false,
    coinsLabel: '10',
  },
  frame_azure: {
    name: 'Marco Diamante',
    sheetBg: 'linear-gradient(160deg, #EFF6FF 0%, #60A5FA 48%, #1D4ED8 100%)',
    outerBorder: 'border-2 border-cyan-300',
    innerBorder: 'border border-sky-200/80',
    ringBorder: 'border-[3px] border-amber-300 shadow-[0_0_16px_rgba(56,189,248,0.85)]',
    bannerBg: 'bg-slate-950/90 border border-cyan-400 text-cyan-200 shadow-sm',
    bannerText: 'text-cyan-100 font-black',
    subText: 'text-amber-300',
    badgeBg: 'bg-cyan-500 text-slate-950',
    isGrayscale: false,
    coinsLabel: '30',
  },
  frame_mythic: {
    name: 'Marco Místico VIP',
    sheetBg: 'linear-gradient(160deg, #2E1065 0%, #7E22CE 50%, #C026D3 100%)',
    outerBorder: 'border-2 border-fuchsia-400',
    innerBorder: 'border border-purple-300/80',
    ringBorder: 'border-[3px] border-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.95)]',
    bannerBg: 'bg-purple-950/95 border border-fuchsia-400 text-fuchsia-100 shadow-md',
    bannerText: 'text-fuchsia-100 font-black',
    subText: 'text-amber-300',
    badgeBg: 'bg-fuchsia-500 text-white',
    isGrayscale: false,
    coinsLabel: '99',
  },
};

// Precomputed 72 outer rays + 48 inner core rays for realistic Chrysanthemum Firework (matching user reference image!)
const OUTER_RAYS = Array.from({ length: 72 }, (_, i) => {
  const angle = (i * 360) / 72 + (i % 3 === 0 ? 1.2 : -0.8);
  const rad = (angle * Math.PI) / 180;
  const len = i % 4 === 0 ? 78 : i % 2 === 0 ? 68 : 56;
  return { angle, rad, len, curve: i % 2 === 0 ? 6 : -5 };
});

const INNER_RAYS = Array.from({ length: 48 }, (_, i) => {
  const angle = (i * 360) / 48;
  const rad = (angle * Math.PI) / 180;
  const len = i % 2 === 0 ? 38 : 28;
  return { angle, rad, len };
});

/**
 * Realistic Chrysanthemum / Peony Firework Burst matching the user's reference image:
 * - Dense 72 long glowing outer streaks (red-orange/gold/yellow tips)
 * - 48 inner violet/blue/magenta ring streaks
 * - Intense white-hot radiating core at the center
 */
const ChrysanthemumFirework: React.FC<{
  left: string;
  top: string;
  outerColor?: string;
  tipColor?: string;
  innerColor?: string;
  delay?: number;
  scale?: number;
  rotate?: number;
  offsetX?: number;
  offsetY?: number;
}> = ({
  left,
  top,
  outerColor = '#FF3B1D',
  tipColor = '#FDE047',
  innerColor = '#8B5CF6',
  delay = 0,
  scale = 1,
  rotate = 0,
  offsetX = 0,
  offsetY = 0,
}) => {
  const uid = `fw_${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div
      className="absolute pointer-events-none z-50 w-0 h-0"
      style={{
        left: `calc(${left} + ${offsetX}px)`,
        top: `calc(${top} + ${offsetY}px)`,
      }}
    >
      {/* Center Flash Core right at the exact center (0,0) of the image */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1.5, 0.3],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 0.45, delay, ease: 'easeOut' }}
        className="absolute -left-4 -top-4 w-8 h-8 rounded-full"
        style={{
          background: `radial-gradient(circle, #FFFFFF 0%, ${tipColor} 50%, transparent 100%)`,
          boxShadow: `0 0 18px ${tipColor}`,
        }}
      />

      {/* Multi-layered Chrysanthemum Burst SVG centered at exact (0,0) of the image */}
      <motion.div
        initial={{ scale: 0.02, opacity: 0, rotate }}
        animate={{
          scale: [0.02, scale * 1.05, scale * 1.18],
          opacity: [0, 1, 0.95, 0],
          rotate: [rotate, rotate + 6],
        }}
        transition={{
          duration: 1.45,
          delay: delay + 0.05,
          times: [0, 0.28, 0.72, 1],
          ease: 'easeOut',
        }}
        className="absolute -left-[90px] -top-[90px] w-[180px] h-[180px]"
        style={{ transformOrigin: '50% 50%' }}
      >
        <svg
          viewBox="-90 -90 180 180"
          className="w-full h-full overflow-visible"
          style={{
            filter: `drop-shadow(0 0 6px ${outerColor}) drop-shadow(0 0 14px ${outerColor})`,
          }}
        >
          <defs>
            <radialGradient id={`${uid}_core`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="35%" stopColor="#FFF7ED" stopOpacity="0.95" />
              <stop offset="68%" stopColor="#F43F5E" stopOpacity="0.65" />
              <stop offset="100%" stopColor={innerColor} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}_outer`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="30%" stopColor={outerColor} stopOpacity="1" />
              <stop offset="80%" stopColor={outerColor} stopOpacity="0.95" />
              <stop offset="100%" stopColor={tipColor} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* 72 Long Curved Outer Chrysanthemum Streaks */}
          {OUTER_RAYS.map((r, idx) => {
            const x2 = Math.cos(r.rad) * r.len;
            const y2 = Math.sin(r.rad) * r.len;
            const cx = Math.cos(r.rad + 0.08) * (r.len * 0.58);
            const cy = Math.sin(r.rad + 0.08) * (r.len * 0.58) + r.curve * 0.4;
            return (
              <g key={`o_${idx}`}>
                <path
                  d={`M 0 0 Q ${cx} ${cy} ${x2} ${y2}`}
                  fill="none"
                  stroke={outerColor}
                  strokeWidth={idx % 2 === 0 ? '2.1' : '1.4'}
                  strokeLinecap="round"
                  opacity={idx % 3 === 0 ? 0.95 : 0.82}
                />
                {/* Bright glowing tip */}
                <circle
                  cx={x2}
                  cy={y2}
                  r={idx % 2 === 0 ? '1.5' : '1.1'}
                  fill={tipColor}
                />
              </g>
            );
          })}

          {/* 48 Inner Violet/Blue Ring Streaks (Just like the reference image!) */}
          {INNER_RAYS.map((r, idx) => {
            const x2 = Math.cos(r.rad) * r.len;
            const y2 = Math.sin(r.rad) * r.len;
            return (
              <line
                key={`i_${idx}`}
                x1={0}
                y1={0}
                x2={x2}
                y2={y2}
                stroke={idx % 2 === 0 ? innerColor : '#F472B6'}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            );
          })}

          {/* Blazing White-Hot Center Core */}
          <circle cx="0" cy="0" r="24" fill={`url(#${uid}_core)`} />
          <circle cx="0" cy="0" r="10" fill="#FFFFFF" />
        </svg>
      </motion.div>
    </div>
  );
};

/**
 * Renders the tier-specific fireworks directly from the exact center (50%, 43%) of the corresponding image frame
 */
const FrameCenterFireworks: React.FC<{
  tier: ColorFrameTier;
  displayName: string;
  centerTop?: string;
}> = ({ tier, displayName, centerTop = '43%' }) => {
  const cleanName = (displayName || 'VIP').toUpperCase().slice(0, 18);

  if (tier === 'frame_gold') {
    return (
      <ChrysanthemumFirework
        left="50%"
        top={centerTop}
        outerColor="#FF4500"
        tipColor="#FDE047"
        innerColor="#8B5CF6"
        delay={0}
        scale={0.95}
      />
    );
  }

  if (tier === 'frame_emerald') {
    return (
      <ChrysanthemumFirework
        left="50%"
        top={centerTop}
        outerColor="#FF3B1D"
        tipColor="#6EE7B7"
        innerColor="#6366F1"
        delay={0}
        scale={1.0}
      />
    );
  }

  if (tier === 'frame_azure') {
    return (
      <>
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#FF3B1D"
          tipColor="#FDE047"
          innerColor="#8B5CF6"
          delay={0}
          scale={1.05}
          rotate={0}
        />
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#06B6D4"
          tipColor="#FEF08A"
          innerColor="#EC4899"
          delay={0.22}
          scale={0.92}
          rotate={24}
        />
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#F59E0B"
          tipColor="#FFFFFF"
          innerColor="#3B82F6"
          delay={0.44}
          scale={1.0}
          rotate={-22}
        />
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#EC4899"
          tipColor="#FDE047"
          innerColor="#06B6D4"
          delay={0.68}
          scale={0.95}
          rotate={38}
        />
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#FF3B1D"
          tipColor="#A7F3D0"
          innerColor="#8B5CF6"
          delay={0.92}
          scale={1.04}
          rotate={-35}
        />
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#38BDF8"
          tipColor="#FDE047"
          innerColor="#F43F5E"
          delay={1.15}
          scale={1.12}
          rotate={15}
        />
      </>
    );
  }

  if (tier === 'frame_mythic') {
    return (
      <>
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#FF3B1D"
          tipColor="#FDE047"
          innerColor="#8B5CF6"
          delay={0}
          scale={1.08}
          rotate={0}
        />
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#F59E0B"
          tipColor="#FEF08A"
          innerColor="#EC4899"
          delay={0.36}
          scale={0.98}
          rotate={28}
        />
        <ChrysanthemumFirework
          left="50%"
          top={centerTop}
          outerColor="#EC4899"
          tipColor="#FDE047"
          innerColor="#38BDF8"
          delay={0.72}
          scale={1.04}
          rotate={-26}
        />

        {/* Firework Sparkler Drawing the Donor's Name right across the center of the VIP image */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-50 pointer-events-none"
          style={{ top: centerTop }}
        >
          <div className="relative h-10 flex items-center justify-center">
            <motion.div
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 1.5, delay: 0.15, ease: 'linear' }}
              className="px-3 py-0.5 rounded-full bg-black/70 backdrop-blur-[2px] border border-amber-300/80 shadow-[0_0_25px_rgba(250,204,21,0.95)]"
            >
              <span
                className="text-base sm:text-lg font-black tracking-widest text-transparent bg-clip-text whitespace-nowrap"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #FFFFFF 0%, #FEF08A 40%, #F59E0B 80%, #EF4444 100%)',
                  filter: 'drop-shadow(0 0 8px rgba(250,204,21,1))',
                }}
              >
                {cleanName}
              </span>
            </motion.div>

            {/* Moving Sparkler Point drawing the letters */}
            <motion.div
              initial={{ left: '2%', opacity: 1 }}
              animate={{
                left: ['2%', '98%'],
                opacity: [1, 1, 0],
              }}
              transition={{
                left: { duration: 1.5, delay: 0.15, ease: 'linear' },
                opacity: { duration: 1.7, times: [0, 0.9, 1] },
              }}
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #FFFFFF 0%, #FDE047 55%, #FF3B1D 100%)',
                boxShadow: '0 0 18px 6px #FACC15, 0 0 30px 10px #FF3B1D',
              }}
            />
          </div>
        </div>
      </>
    );
  }

  return null;
};

/**
 * Renders a single printed photo sheet (either sliding out of the printer or hanging on the wall)
 */
const PrintedSheetCard: React.FC<{
  item: ColorDonorItem;
  size?: 'wall' | 'printing';
}> = ({ item, size = 'printing' }) => {
  const style = FRAME_STYLES[item.frameTier] || FRAME_STYLES.bw_follow;
  const isWall = size === 'wall';

  return (
    <div
      className={`relative select-none overflow-hidden rounded-sm shadow-xl ${style.outerBorder} ${
        isWall ? 'w-[68px] h-[84px] p-1' : 'w-[172px] h-[196px] p-2.5'
      }`}
      style={{ background: style.sheetBg }}
    >
      {/* Inner decorative frame border */}
      <div
        className={`relative w-full h-full flex flex-col items-center justify-between rounded-[2px] ${style.innerBorder} ${
          isWall ? 'p-1' : 'p-2'
        }`}
      >
        {/* Corner flourishes for B/W vintage frame */}
        {item.frameTier === 'bw_follow' && !isWall && (
          <>
            <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-stone-800" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-stone-800" />
            <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-stone-800" />
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-stone-800" />
          </>
        )}

        {/* Decorative floating petals/sparkles for Color Rose & higher frames */}
        {item.frameTier === 'color_rose' && !isWall && (
          <>
            <span className="absolute top-1.5 left-2 text-[10px] opacity-80">🌸</span>
            <span className="absolute top-2 right-2 text-[10px] opacity-80">✨</span>
            <span className="absolute bottom-12 left-1.5 text-[9px] opacity-75">🌸</span>
          </>
        )}

        {item.frameTier === 'frame_gold' && !isWall && (
          <>
            <span className="absolute top-1 left-2 text-[11px]">⭐</span>
            <span className="absolute top-1 right-2 text-[11px]">🌟</span>
          </>
        )}

        {item.frameTier === 'frame_emerald' && !isWall && (
          <>
            <span className="absolute top-1 left-2 text-[11px]">💎</span>
            <span className="absolute top-1 right-2 text-[11px]">🍀</span>
          </>
        )}

        {item.frameTier === 'frame_azure' && !isWall && (
          <>
            <span className="absolute top-1 left-2 text-[11px]">🍩</span>
            <span className="absolute top-1 right-2 text-[11px]">⚡</span>
          </>
        )}

        {item.frameTier === 'frame_mythic' && !isWall && (
          <>
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-xs">👑</span>
            <span className="absolute top-2 left-2 text-[10px]">🔮</span>
            <span className="absolute top-2 right-2 text-[10px]">✨</span>
          </>
        )}

        {/* Center Portrait Circle + Side Emblems */}
        <div className="relative flex items-center justify-center mt-0.5">
          <div
            className={`relative rounded-full overflow-hidden bg-stone-200 ${style.ringBorder} ${
              isWall ? 'w-10 h-10' : 'w-[96px] h-[96px]'
            }`}
          >
            <img
              src={item.avatarUrl}
              alt={item.displayName}
              className="w-full h-full object-cover"
              style={
                style.isGrayscale
                  ? { filter: 'grayscale(100%) contrast(1.22) brightness(1.03)' }
                  : undefined
              }
            />
          </div>

          {!isWall && item.frameTier === 'bw_follow' && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-stone-900 border-2 border-[#F5EFE2] flex items-center justify-center text-[#F5EFE2] text-[11px] font-black shadow">
              ★
            </div>
          )}

          {!isWall && item.frameTier === 'color_rose' && (
            <>
              <div className="absolute -bottom-1 -left-2.5 w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-white flex items-center justify-center text-[11px] shadow-md">
                ❤️
              </div>
              <div className="absolute -bottom-1 -right-2.5 w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 border-2 border-white flex items-center justify-center text-[11px] shadow-md">
                💖
              </div>
            </>
          )}

          {!isWall && item.frameTier !== 'bw_follow' && item.frameTier !== 'color_rose' && (
            <>
              <div className="absolute -bottom-1 -left-2.5 w-6 h-6 rounded-full bg-slate-900/90 border-2 border-amber-300 flex items-center justify-center text-[11px] shadow-md">
                {item.giftIcon}
              </div>
              <div className="absolute -bottom-1 -right-2.5 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-[9px] font-black text-slate-950 shadow-md">
                {style.coinsLabel}
              </div>
            </>
          )}
        </div>

        {/* Bottom Ribbon Banner with Username & Gift caption */}
        <div className="w-full flex flex-col items-center mt-1">
          <div
            className={`w-full rounded px-1.5 text-center truncate ${style.bannerBg} ${
              isWall ? 'py-0.5 text-[7px]' : 'py-1 text-xs'
            }`}
          >
            <span className={`block truncate ${style.bannerText}`}>
              {item.displayName || item.username}
            </span>
          </div>

          {!isWall && (
            <div
              className={`mt-0.5 flex items-center justify-center gap-1 text-[10px] font-bold truncate ${style.subText}`}
            >
              <span>{item.actionText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ColorPhotoPrinter: React.FC<ColorPhotoPrinterProps> = ({
  activeDonor,
  queueCount,
  printedCount,
  wallItems,
  vipCenterItem,
  onPrintComplete,
  obsMode,
  colorTierTriggers,
}) => {
  const [printProgress, setPrintProgress] = useState<number>(0);
  const [cyclePhase, setCyclePhase] = useState<PrintCyclePhase>('idle');
  const [targetSlotIndex, setTargetSlotIndex] = useState<number>(0);
  const [manualCameraZoom, setManualCameraZoom] = useState<'auto' | 'close' | 'room'>('auto');

  const stopSoundRef = useRef<(() => void) | null>(null);

  // Fixed wall slot mapping per tier:
  // - Left side (0): Blanco y Negro (bw_follow)
  // - Right side (4..7): Rosa (4), Dorado (5), Esmeralda (6), Diamante (7)
  // - Center VIP: Marco Místico VIP (frame_mythic)
  const getFixedSlotForTier = (tier: ColorFrameTier): number => {
    switch (tier) {
      case 'bw_follow':
        return 0;
      case 'color_rose':
        return 4;
      case 'frame_gold':
        return 5;
      case 'frame_emerald':
        return 6;
      case 'frame_azure':
        return 7;
      default:
        return 0;
    }
  };

  // Timings:
  // 1) 1.75s sliding out of printer + 0.45s full uncut showcase hold before flying
  // 2) 0.56s flying from printer slot to exact target frame on the back wall
  // 3) Tier-dependent celebration hold on the back wall
  const PRINT_DURATION_MS = 1750;
  const COMPLETE_HOLD_MS = 450;
  const FLIGHT_DURATION_MS = 560;

  const getCelebrationDurationMs = (tier: ColorFrameTier): number => {
    switch (tier) {
      case 'frame_mythic':
        return 2850;
      case 'frame_azure':
        return 2350;
      case 'frame_emerald':
        return 1750;
      case 'frame_gold':
        return 1600;
      default:
        return 950;
    }
  };

  useEffect(() => {
    if (!activeDonor) {
      setPrintProgress(0);
      setCyclePhase('idle');
      return;
    }

    let isCancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let flightTimer: ReturnType<typeof setTimeout> | null = null;
    let completeTimer: ReturnType<typeof setTimeout> | null = null;

    // Each tier always flies to its own dedicated position and replaces the item there
    const assignedSlot = getFixedSlotForTier(activeDonor.frameTier);
    setTargetSlotIndex(assignedSlot);

    setPrintProgress(0);
    setCyclePhase('printing');

    // Start printer motor/head sound during printing phase
    stopSoundRef.current = soundEngine.startDrawingSound(PRINT_DURATION_MS);

    const startTime = performance.now();
    let animId = 0;

    const tick = (now: number) => {
      if (isCancelled) return;
      const elapsed = now - startTime;
      const prog = Math.min(1, elapsed / PRINT_DURATION_MS);
      setPrintProgress(prog);

      if (prog < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        // Sheet is 100% printed! Stop motor sound and hold for COMPLETE_HOLD_MS so the full sheet is seen uncut
        if (stopSoundRef.current) {
          stopSoundRef.current();
          stopSoundRef.current = null;
        }
        soundEngine.playPaperFeedSound();

        holdTimer = setTimeout(() => {
          if (isCancelled) return;
          // PHASE 2: Zoom out to back panel & fly sheet to its wall position!
          setCyclePhase('flying');

          // PHASE 3: Sheet lands on the back wall frame -> Trigger tier-specific fireworks & sounds AT THAT FRAME!
          flightTimer = setTimeout(() => {
            if (isCancelled) return;
            setCyclePhase('celebrating');

            const tier = activeDonor.frameTier;
            if (tier === 'frame_gold') {
              soundEngine.playGoldFireworkSound();
            } else if (tier === 'frame_emerald') {
              soundEngine.playEmeraldChicharraSound();
            } else if (tier === 'frame_azure') {
              soundEngine.playDiamondFiestaSound();
            } else if (tier === 'frame_mythic') {
              soundEngine.playVipHeavenlySound();
            } else {
              soundEngine.playDrawComplete('flower');
            }

            const celebrateMs = getCelebrationDurationMs(tier);
            completeTimer = setTimeout(() => {
              if (!isCancelled) {
                onPrintComplete(activeDonor, assignedSlot);
              }
            }, celebrateMs);
          }, FLIGHT_DURATION_MS);
        }, COMPLETE_HOLD_MS);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animId);
      if (holdTimer) clearTimeout(holdTimer);
      if (flightTimer) clearTimeout(flightTimer);
      if (completeTimer) clearTimeout(completeTimer);
      if (stopSoundRef.current) {
        stopSoundRef.current();
        stopSoundRef.current = null;
      }
    };
  }, [activeDonor?.id]);

  // Camera zooms in during 'printing' (including the 100% hold), and zooms out as soon as 'flying' begins
  const isZoomedIn =
    manualCameraZoom === 'close'
      ? true
      : manualCameraZoom === 'room'
      ? false
      : cyclePhase === 'printing';

  // While in 'celebrating' phase, display the newly landed donor directly inside its target frame on the wall
  const displayedWallItems = wallItems.map((item, idx) => {
    if (
      activeDonor &&
      cyclePhase === 'celebrating' &&
      activeDonor.frameTier !== 'frame_mythic' &&
      idx === targetSlotIndex
    ) {
      return activeDonor;
    }
    return item;
  });

  const displayedVipItem =
    activeDonor && cyclePhase === 'celebrating' && activeDonor.frameTier === 'frame_mythic'
      ? activeDonor
      : vipCenterItem;

  const leftWallItems = displayedWallItems.slice(0, 4);
  const rightWallItems = displayedWallItems.slice(4, 8);

  // Flight target offset & screen coordinates for the active donor's target slot
  const currentFlightTarget =
    activeDonor?.frameTier === 'frame_mythic'
      ? VIP_CENTER_FLIGHT_OFFSET
      : WALL_SLOT_FLIGHT_OFFSETS[targetSlotIndex] || WALL_SLOT_FLIGHT_OFFSETS[0];

  const currentSlotScreenCoords =
    activeDonor?.frameTier === 'frame_mythic'
      ? VIP_CENTER_SCREEN_COORDS
      : WALL_SLOT_SCREEN_COORDS[targetSlotIndex] || WALL_SLOT_SCREEN_COORDS[0];

  // 6 Right-Side Options: SQUARE transparent frames ("transparente las 6", "cuadrado no circulo", "solo salga el circulo y el marco y la donacion que hara")
  const rightLegendTiers: {
    tier: ColorFrameTier;
    frameClass: string;
    circleClass: string;
    badgeText: string;
    icon: string;
    label: string;
  }[] = [
    {
      tier: 'bw_follow',
      frameClass: 'border-2 border-stone-200 shadow-[0_0_8px_rgba(255,255,255,0.25)]',
      circleClass: 'border-2 border-stone-300',
      badgeText: 'FOLLOW',
      icon: '➕',
      label: 'B/N',
    },
    {
      tier: 'color_rose',
      frameClass: 'border-2 border-pink-400 shadow-[0_0_10px_rgba(244,63,94,0.55)]',
      circleClass: 'border-2 border-pink-300',
      badgeText: String(findTikTokGift(colorTierTriggers.color_rose.giftName)?.coins || 1),
      icon: findTikTokGift(colorTierTriggers.color_rose.giftName)?.icon || '🌹',
      label: 'Rosa',
    },
    {
      tier: 'frame_gold',
      frameClass: 'border-2 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.65)]',
      circleClass: 'border-2 border-yellow-300',
      badgeText: String(findTikTokGift(colorTierTriggers.frame_gold.giftName)?.coins || 5),
      icon: findTikTokGift(colorTierTriggers.frame_gold.giftName)?.icon || '🫰',
      label: 'Dorado',
    },
    {
      tier: 'frame_emerald',
      frameClass: 'border-2 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.65)]',
      circleClass: 'border-2 border-emerald-300',
      badgeText: String(findTikTokGift(colorTierTriggers.frame_emerald.giftName)?.coins || 10),
      icon: findTikTokGift(colorTierTriggers.frame_emerald.giftName)?.icon || '📿',
      label: 'Esmeralda',
    },
    {
      tier: 'frame_azure',
      frameClass: 'border-2 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.75)]',
      circleClass: 'border-2 border-cyan-200',
      badgeText: String(findTikTokGift(colorTierTriggers.frame_azure.giftName)?.coins || 30),
      icon: findTikTokGift(colorTierTriggers.frame_azure.giftName)?.icon || '🍩',
      label: 'Diamante',
    },
    {
      tier: 'frame_mythic',
      frameClass: 'border-2 border-fuchsia-400 shadow-[0_0_14px_rgba(217,70,239,0.85)]',
      circleClass: 'border-2 border-fuchsia-300',
      badgeText: String(findTikTokGift(colorTierTriggers.frame_mythic.giftName)?.coins || 99),
      icon: findTikTokGift(colorTierTriggers.frame_mythic.giftName)?.icon || '👑',
      label: 'VIP',
    },
  ];

  return (
    <div className="relative w-full max-w-[460px] mx-auto flex flex-col items-center select-none">
      {/* Top Black Headline Banner: "IMPRIMIMOS TU FOTO DE PERFIL" */}
      <div className="w-full bg-black text-white text-center py-2.5 px-3 rounded-t-2xl border-x border-t border-neutral-800 shadow-lg flex items-center justify-between">
        <span className="w-16" />
        <h2 className="text-xs sm:text-sm font-black tracking-wide uppercase text-white drop-shadow">
          IMPRIMIMOS TU FOTO DE PERFIL
        </h2>
        <button
          onClick={() =>
            setManualCameraZoom((prev) =>
              prev === 'auto' ? 'close' : prev === 'close' ? 'room' : 'auto'
            )
          }
          className="flex items-center gap-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 px-2 py-1 text-[10px] font-bold text-amber-300 transition-colors"
          title="Cambiar vista de cámara (Automática / Cerca / Sala completa)"
        >
          <Camera className="w-3 h-3" />
          <span>
            {manualCameraZoom === 'auto'
              ? 'Auto'
              : manualCameraZoom === 'close'
              ? 'Cerca'
              : 'Sala'}
          </span>
        </button>
      </div>

      {/* Main 3D Studio Viewport (9:16 vertical stream aspect) */}
      <div
        className={`relative w-full h-[640px] overflow-hidden rounded-b-2xl border-x border-b border-neutral-800 shadow-2xl ${
          obsMode ? 'bg-transparent' : 'bg-[#2A1B12]'
        }`}
      >
        {/* TOP HUD PILLS INSIDE SCENE: En cola & Hojas Impresas */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white shadow">
            <span>⏳ En cola:</span>
            <span className="text-amber-300 font-mono">{queueCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white shadow">
            <span>🖨️ Hojas Impresas:</span>
            <span className="text-emerald-300 font-mono">{printedCount.toLocaleString()}</span>
          </div>
        </div>

        {/* RIGHT-SIDE VERTICAL LEGEND COLUMN:
            6 Transparent SQUARE Frames + Empty Circle inside + Gift Donation Icon & Badge */}
        <div className="absolute right-2 top-12 z-30 flex flex-col gap-2 pointer-events-none">
          {rightLegendTiers.map((item) => (
            <div key={item.tier} className="relative flex flex-col items-center">
              {/* Transparent Square Frame ("cuadrado no circulo", "transparente las 6") */}
              <div
                className={`relative w-12 h-14 rounded-[4px] bg-transparent flex flex-col items-center justify-between p-1 ${item.frameClass}`}
              >
                {/* Top frame tier mini label */}
                <span className="text-[7px] font-black uppercase tracking-tighter text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-none">
                  {item.label}
                </span>

                {/* Transparent Circle inside the square frame showing only the circle + donation icon */}
                <div
                  className={`w-7 h-7 rounded-full bg-transparent flex items-center justify-center ${item.circleClass}`}
                >
                  <span className="text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                    {item.icon}
                  </span>
                </div>

                {/* Donation badge inside bottom of square frame */}
                <span
                  className={`w-full text-center rounded-[2px] py-0.2 text-[8px] font-black leading-tight ${
                    item.tier === 'bw_follow'
                      ? 'bg-red-600/90 text-white'
                      : 'bg-black/80 text-amber-300'
                  }`}
                >
                  {item.badgeText}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* =====================================================================
            OBS MODE FALLBACK FIREWORKS (WHEN WALL IS TRANSPARENT)
           ===================================================================== */}
        <AnimatePresence>
          {obsMode && activeDonor && cyclePhase === 'celebrating' && (
            <motion.div
              key={`celebrate_obs_${activeDonor.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none z-50"
              style={{
                left: currentSlotScreenCoords.left,
                top: currentSlotScreenCoords.top,
              }}
            >
              <FrameCenterFireworks
                tier={activeDonor.frameTier}
                displayName={activeDonor.displayName || activeDonor.username}
                centerTop="0px"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAMERA RIG:
            Adjusted zoom-in scale & origin so the entire 100% printed sheet is completely visible without cutting off at the bottom! */}
        <div
          className="relative w-full h-full transition-transform duration-500 ease-out"
          style={{
            transform: isZoomedIn
              ? 'scale(1.22) translateY(-15%)'
              : 'scale(1) translateY(0%)',
            transformOrigin: '50% 50%',
          }}
        >
          {/* 1. WOODEN STUDIO WALL & GALLERY FRAMES */}
          {!obsMode && (
            <div className="absolute inset-x-0 top-0 h-[365px] z-20">
              {/* Wood planks background layer */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{
                  background:
                    'repeating-linear-gradient(90deg, #4A2F1D 0px, #4A2F1D 18px, #3B2314 18px, #3B2314 22px, #563824 22px, #563824 38px)',
                }}
              >
                {/* Warm studio ceiling vignette */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 45%, rgba(255,215,150,0.18) 0%, rgba(15,10,6,0.55) 100%)',
                  }}
                />
              </div>

              {/* WALL GALLERY: Left 2x2 Grid, Center Giant Purple VIP Frame, Right 2x2 Grid */}
              <div className="relative z-10 mt-11 px-3 flex items-center justify-between gap-1.5">
                {/* Left 2x2 Wall Frames (Slots 0..3: Blanco y Negro) */}
                <div className="grid grid-cols-2 gap-1.5">
                  {leftWallItems.map((item, idx) => {
                    const isJustPlaced =
                      activeDonor &&
                      cyclePhase === 'celebrating' &&
                      activeDonor.frameTier !== 'frame_mythic' &&
                      targetSlotIndex === idx;

                    return (
                      <div
                        key={`left_slot_${idx}_${item.id}`}
                        className={`relative p-0.5 bg-neutral-900/90 rounded shadow-lg border transition-all duration-300 ${
                          isJustPlaced
                            ? 'border-amber-300 ring-4 ring-amber-400/90 shadow-[0_0_25px_rgba(251,191,36,1)] scale-105 z-40'
                            : 'border-amber-900/60'
                        }`}
                      >
                        <PrintedSheetCard item={item} size="wall" />
                        {isJustPlaced && activeDonor && (
                          <FrameCenterFireworks
                            tier={activeDonor.frameTier}
                            displayName={activeDonor.displayName || activeDonor.username}
                            centerTop="43%"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* CENTER GIANT NEON PURPLE VIP PORTAL FRAME */}
                <div
                  className={`relative shrink-0 ${
                    activeDonor &&
                    cyclePhase === 'celebrating' &&
                    activeDonor.frameTier === 'frame_mythic'
                      ? 'z-40'
                      : 'z-10'
                  }`}
                >
                  <div
                    className={`relative w-[132px] h-[178px] rounded-lg p-1.5 bg-gradient-to-b from-purple-950 via-[#1E0936] to-indigo-950 border-2 flex flex-col items-center justify-between overflow-hidden transition-all duration-300 ${
                      activeDonor &&
                      cyclePhase === 'celebrating' &&
                      activeDonor.frameTier === 'frame_mythic'
                        ? 'border-amber-300 ring-4 ring-fuchsia-400 shadow-[0_0_40px_rgba(232,121,249,1)] scale-105'
                        : 'border-fuchsia-400 shadow-[0_0_25px_rgba(192,38,211,0.8)]'
                    }`}
                  >
                    <div className="text-xs tracking-widest text-fuchsia-300 font-black flex items-center gap-1">
                      <span>👑</span>
                      <span className="text-[9px] uppercase">VIP MÍSTICO</span>
                      <span>👑</span>
                    </div>

                    <div className="relative flex items-center justify-center my-0.5">
                      <div
                        className="absolute -inset-2 rounded-full border border-dashed border-fuchsia-400/70 animate-spin"
                        style={{ animationDuration: '14s' }}
                      />
                      <div className="relative w-20 h-20 rounded-full border-2 border-fuchsia-300 shadow-[0_0_18px_rgba(232,121,249,0.95)] overflow-hidden bg-purple-900">
                        <img
                          src={displayedVipItem.avatarUrl}
                          alt={displayedVipItem.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="w-full bg-fuchsia-950/90 border border-fuchsia-400/80 rounded px-1.5 py-0.5 text-center shadow">
                      <div className="text-[10px] font-black text-white truncate">
                        {displayedVipItem.displayName}
                      </div>
                      <div className="text-[8px] font-bold text-fuchsia-300 truncate">
                        {displayedVipItem.actionText}
                      </div>
                    </div>
                  </div>

                  {/* Fireworks & Name emerging directly from the exact center (50%, 48%) of the VIP image */}
                  {activeDonor &&
                    cyclePhase === 'celebrating' &&
                    activeDonor.frameTier === 'frame_mythic' && (
                      <FrameCenterFireworks
                        tier="frame_mythic"
                        displayName={activeDonor.displayName || activeDonor.username}
                        centerTop="48%"
                      />
                    )}
                </div>

                {/* Right 2x2 Wall Frames (Slots 4..7: Rosa, Dorado, Esmeralda, Diamante) */}
                <div className="grid grid-cols-2 gap-1.5">
                  {rightWallItems.map((item, idx) => {
                    const slotIdx = idx + 4;
                    const isJustPlaced =
                      activeDonor &&
                      cyclePhase === 'celebrating' &&
                      activeDonor.frameTier !== 'frame_mythic' &&
                      targetSlotIndex === slotIdx;

                    return (
                      <div
                        key={`right_slot_${slotIdx}_${item.id}`}
                        className={`relative p-0.5 bg-neutral-900/90 rounded shadow-lg border transition-all duration-300 ${
                          isJustPlaced
                            ? 'border-amber-300 ring-4 ring-amber-400/90 shadow-[0_0_25px_rgba(251,191,36,1)] scale-105 z-40'
                            : 'border-amber-900/60'
                        }`}
                      >
                        <PrintedSheetCard item={item} size="wall" />
                        {/* Fireworks emerging directly from the exact center (50%, 43%) of the corresponding image */}
                        {isJustPlaced && activeDonor && (
                          <FrameCenterFireworks
                            tier={activeDonor.frameTier}
                            displayName={activeDonor.displayName || activeDonor.username}
                            centerTop="43%"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. STUDIO TABLE / CABINET ("sobre una mesa, mueble", NO lamp & NO plant) */}
          {!obsMode && (
            <div
              className="absolute inset-x-0 bottom-0 h-[285px]"
              style={{
                background: 'linear-gradient(180deg, #2D1C11 0%, #1F130B 100%)',
              }}
            >
              {/* 3D Tabletop Surface ("Mesa / Mueble") */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-0 w-[410px] h-[52px] rounded-t-2xl border-t-2 border-stone-200 shadow-lg"
                style={{
                  background: 'linear-gradient(180deg, #F5F5F4 0%, #E7E5E4 65%, #D6D3D1 100%)',
                }}
              />
              {/* Tabletop Front Bevel Edge */}
              <div className="absolute left-1/2 -translate-x-1/2 top-[48px] w-[416px] h-[14px] rounded-sm bg-stone-400 border-y border-stone-500 shadow-md" />

              {/* Furniture Cabinet Body ("Mueble") beneath the tabletop */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-[62px] w-[392px] bottom-0 border-x-4 border-stone-400 shadow-2xl flex flex-col justify-between p-4"
                style={{
                  background: 'linear-gradient(180deg, #E7E5E4 0%, #D6D3D1 50%, #A8A29E 100%)',
                }}
              >
                {/* Top Wide Drawer */}
                <div className="w-full h-14 rounded-md bg-stone-200/90 border-2 border-stone-400/80 shadow-inner flex items-center justify-center">
                  <div className="w-16 h-2 rounded-full bg-stone-500 shadow" />
                </div>

                {/* Bottom Two Cabinet Doors */}
                <div className="w-full flex-1 mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-stone-200/85 border-2 border-stone-400/80 shadow-inner flex items-center justify-end pr-3">
                    <div className="w-2 h-10 rounded-full bg-stone-500 shadow" />
                  </div>
                  <div className="rounded-md bg-stone-200/85 border-2 border-stone-400/80 shadow-inner flex items-center justify-start pl-3">
                    <div className="w-2 h-10 rounded-full bg-stone-500 shadow" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. THE "ASURE PRINT" 3D DESKTOP COLOR PRINTER RESTING ON THE TABLE/CABINET */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[210px] z-30 w-[290px] flex flex-col items-center">
            {/* Printer Top Slanted Cover with "ASURE PRINT" Branding */}
            <div
              className="relative w-[276px] h-[52px] rounded-t-xl border-t-2 border-x border-stone-300 shadow-md flex items-center justify-between px-4"
              style={{
                background: 'linear-gradient(180deg, #F5F2EB 0%, #DFD9CE 100%)',
                transform: 'perspective(500px) rotateX(18deg)',
              }}
            >
              {/* Left Status LEDs (Green & Red) */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full border border-emerald-900 ${
                    activeDonor && cyclePhase === 'printing'
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping'
                      : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                  }`}
                />
                <span className="w-2 h-2 rounded-full bg-rose-500/80 border border-rose-900" />
              </div>

              {/* Center "ASURE PRINT" Logo */}
              <div className="flex items-center gap-1.5 bg-stone-200/75 px-3 py-1 rounded border border-stone-300/80 shadow-inner">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <span className="absolute w-3 h-3 rotate-45 bg-blue-700 rounded-[2px]" />
                  <span className="relative w-1.5 h-1.5 rotate-45 bg-red-500" />
                </div>
                <span className="text-[13px] font-black tracking-wider text-slate-900">
                  ASURE PRINT
                </span>
              </div>

              {/* Right Physical Buttons (Blue & Yellow) */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-700 shadow-inner" />
                <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-900 shadow-inner" />
              </div>
            </div>

            {/* Printer Main Front Body + Blue LCD Panel (NO prompt message like "Sigue o dona Rosa") */}
            <div
              className="relative -mt-1 w-[290px] h-[108px] rounded-b-xl border-x-2 border-b-4 border-stone-400 shadow-2xl flex flex-col items-center justify-between pt-2 pb-2 px-3"
              style={{
                background: 'linear-gradient(180deg, #E6E1D6 0%, #CFC8B8 60%, #B8B09F 100%)',
              }}
            >
              {/* Dark Recessed Center Bay housing the Blue LCD Screen and Output Slot */}
              <div className="w-[238px] h-full rounded-lg bg-neutral-900 border-2 border-stone-500 shadow-inner flex flex-col items-center justify-between p-2">
                {/* Glowing Blue LCD Display - Clean, no idle promotional message */}
                <div
                  className="w-[185px] rounded border border-cyan-300/70 px-2.5 py-1.5 shadow-[0_0_15px_rgba(37,99,235,0.75)] text-white"
                  style={{
                    background: 'linear-gradient(180deg, #1D4ED8 0%, #1E3A8A 100%)',
                  }}
                >
                  <div className="flex items-center justify-between text-[9px] font-bold text-cyan-200 h-3.5">
                    <span className="truncate max-w-[130px] text-white font-black">
                      {activeDonor ? activeDonor.displayName || activeDonor.username : ''}
                    </span>
                    <span className="font-mono">
                      {activeDonor ? `${Math.round(printProgress * 100)}%` : ''}
                    </span>
                  </div>

                  {/* Progress Bar on LCD */}
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-blue-950 overflow-hidden">
                    <div
                      className="h-full bg-cyan-300 transition-all duration-75"
                      style={{
                        width: `${activeDonor ? Math.max(8, Math.round(printProgress * 100)) : 0}%`,
                      }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[8px] font-mono text-cyan-100/90">
                    <span>Impresas: {printedCount}</span>
                    <span>En cola: {queueCount}</span>
                  </div>
                </div>

                {/* Dark Paper Output Slot */}
                <div className="w-[205px] h-3 rounded-full bg-black border-t border-neutral-700 shadow-inner" />
              </div>
            </div>

            {/* 4. SINGLE PHOTO SHEET SLIDING COMPLETELY OUT OF THE PRINTER SLOT & FLYING TO ITS WALL POSITION */}
            <div
              className="relative -mt-3.5 z-40 flex flex-col items-center pointer-events-none"
              style={{
                perspective: '700px',
              }}
            >
              <AnimatePresence mode="wait">
                {activeDonor && (cyclePhase === 'printing' || cyclePhase === 'flying') && (
                  <motion.div
                    key={`${activeDonor.id}_sheet`}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={
                      cyclePhase === 'flying'
                        ? {
                            x: currentFlightTarget.x,
                            y: currentFlightTarget.y,
                            scale: activeDonor.frameTier === 'frame_mythic' ? 0.68 : 0.4,
                            rotateX: 0,
                            opacity: [1, 1, 0.92],
                          }
                        : {
                            x: 0,
                            y: 0,
                            scale: 1,
                            rotateX: 14,
                            opacity: 1,
                          }
                    }
                    transition={
                      cyclePhase === 'flying'
                        ? { duration: 0.54, ease: [0.22, 1, 0.36, 1] }
                        : { duration: 0.1 }
                    }
                    style={{
                      transformOrigin: 'top center',
                    }}
                  >
                    {/* Uncut full reveal container: reaches 212px height for the 196px card so the entire frame & bottom edge print 100% completely */}
                    <div
                      className="overflow-hidden flex justify-center p-1"
                      style={{
                        height: `${Math.round(16 + printProgress * 196)}px`,
                      }}
                    >
                      <div
                        style={{
                          transform: `translateY(-${Math.round((1 - printProgress) * 196)}px)`,
                        }}
                      >
                        <PrintedSheetCard item={activeDonor} size="printing" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 5. BOTTOM FLOATING DONOR PILL */}
        <AnimatePresence>
          {activeDonor && (
            <motion.div
              key={`badge_${activeDonor.id}`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-2xl bg-white/95 text-slate-900 px-3.5 py-1.5 shadow-[0_8px_25px_rgba(0,0,0,0.65)] border-2 border-pink-400 min-w-[180px] max-w-[270px]"
            >
              <img
                src={activeDonor.avatarUrl}
                alt={activeDonor.displayName}
                className="w-9 h-9 rounded-full object-cover border-2 border-rose-500 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-900 truncate">
                  {activeDonor.displayName || activeDonor.username}
                </div>
                <div className="text-[10px] font-bold text-rose-600 truncate">
                  {activeDonor.actionText}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
