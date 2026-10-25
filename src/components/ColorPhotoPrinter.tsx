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

// Exact flight offsets from the bottom printer output slot (center, y=594px) to each of the 8 enlarged wall slots
const WALL_SLOT_FLIGHT_OFFSETS: { x: number; y: number }[] = [
  { x: -172, y: -466 }, // Slot 0: Left Top-Left
  { x: -92, y: -466 },  // Slot 1: Left Top-Right
  { x: -172, y: -284 }, // Slot 2: Left Bottom-Left
  { x: -92, y: -284 },  // Slot 3: Left Bottom-Right
  { x: 92, y: -466 },   // Slot 4: Right Top-Left
  { x: 172, y: -466 },  // Slot 5: Right Top-Right
  { x: 92, y: -284 },   // Slot 6: Right Bottom-Left
  { x: 172, y: -284 },  // Slot 7: Right Bottom-Right
];

const VIP_CENTER_FLIGHT_OFFSET = { x: 0, y: -376 };

// Exact screen coordinates (left %, top px) of the center of each enlarged wall slot's image
const WALL_SLOT_SCREEN_COORDS: { left: string; top: string }[] = [
  { left: '10.5%', top: '128px' }, // Slot 0: Left Top-Left (B/W)
  { left: '27.5%', top: '128px' }, // Slot 1: Left Top-Right (B/W)
  { left: '10.5%', top: '310px' }, // Slot 2: Left Bottom-Left (B/W)
  { left: '27.5%', top: '310px' }, // Slot 3: Left Bottom-Right (B/W)
  { left: '72.5%', top: '128px' }, // Slot 4: Right Top-Left (Rosa)
  { left: '89.5%', top: '128px' }, // Slot 5: Right Top-Right (Dorado)
  { left: '72.5%', top: '310px' }, // Slot 6: Right Bottom-Left (Esmeralda)
  { left: '89.5%', top: '310px' }, // Slot 7: Right Bottom-Right (Diamante)
];

const VIP_CENTER_SCREEN_COORDS = { left: '50%', top: '218px' };

const FRAME_STYLES: Record<
  ColorFrameTier,
  {
    name: string;
    frameImageUrl?: string;
    frameScale?: string;
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
    frameImageUrl: '/assets/aistudio/marco_color_rosa_d6a42d82.jpg',
    frameScale: 'scale(1.26, 1.15)',
    sheetBg: 'linear-gradient(160deg, #FFF0F5 0%, #FFD1E3 55%, #FFB8D2 100%)',
    outerBorder: 'border-2 border-pink-400',
    innerBorder: 'border border-transparent',
    ringBorder: 'border-[3px] border-pink-500 shadow-[0_0_12px_rgba(244,63,94,0.55)]',
    bannerBg: 'bg-pink-950/90 border border-pink-300 text-pink-100 shadow-sm',
    bannerText: 'text-pink-100 font-extrabold',
    subText: 'text-rose-700 bg-white/85 px-1.5 rounded-full',
    badgeBg: 'bg-pink-600 text-white',
    isGrayscale: false,
    coinsLabel: '1',
  },
  frame_gold: {
    name: 'Marco Dorado',
    frameImageUrl: '/assets/aistudio/marco_dorado_cf263a83.jpg',
    frameScale: 'scale(1.48, 1.12)',
    sheetBg: 'linear-gradient(160deg, #FFFBEB 0%, #FDE68A 50%, #F59E0B 100%)',
    outerBorder: 'border-2 border-amber-400',
    innerBorder: 'border border-transparent',
    ringBorder: 'border-[3px] border-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.75)]',
    bannerBg: 'bg-amber-950/95 border border-amber-400 text-amber-200 shadow-sm',
    bannerText: 'text-amber-200 font-extrabold',
    subText: 'text-amber-900 bg-amber-100/90 px-1.5 rounded-full',
    badgeBg: 'bg-amber-500 text-slate-950',
    isGrayscale: false,
    coinsLabel: '5',
  },
  frame_emerald: {
    name: 'Marco Esmeralda',
    frameImageUrl: '/assets/aistudio/marco_esmeralda_001081da.jpg',
    frameScale: 'scale(1.28, 1.25)',
    sheetBg: 'linear-gradient(160deg, #ECFDF5 0%, #6EE7B7 45%, #059669 100%)',
    outerBorder: 'border-2 border-emerald-400',
    innerBorder: 'border border-transparent',
    ringBorder: 'border-[3px] border-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.75)]',
    bannerBg: 'bg-emerald-950/95 border border-emerald-400 text-emerald-200 shadow-sm',
    bannerText: 'text-emerald-100 font-extrabold',
    subText: 'text-emerald-900 bg-emerald-100/90 px-1.5 rounded-full',
    badgeBg: 'bg-emerald-500 text-slate-950',
    isGrayscale: false,
    coinsLabel: '10',
  },
  frame_azure: {
    name: 'Marco Diamante',
    frameImageUrl: '/assets/aistudio/marco_diamante_d318155d.jpg',
    frameScale: 'scale(1.34, 1.32)',
    sheetBg: 'linear-gradient(160deg, #EFF6FF 0%, #60A5FA 48%, #1D4ED8 100%)',
    outerBorder: 'border-2 border-cyan-300',
    innerBorder: 'border border-transparent',
    ringBorder: 'border-[3px] border-cyan-400 shadow-[0_0_16px_rgba(56,189,248,0.85)]',
    bannerBg: 'bg-slate-950/95 border border-cyan-400 text-cyan-200 shadow-sm',
    bannerText: 'text-cyan-100 font-black',
    subText: 'text-slate-900 bg-cyan-100/90 px-1.5 rounded-full',
    badgeBg: 'bg-cyan-500 text-slate-950',
    isGrayscale: false,
    coinsLabel: '30',
  },
  frame_mythic: {
    name: 'Marco Místico VIP',
    frameImageUrl: '/assets/aistudio/MARCO_MISTICO_3ba6377f.jpg',
    frameScale: 'scale(1.04, 1.04)',
    sheetBg: 'linear-gradient(160deg, #2E1065 0%, #7E22CE 50%, #C026D3 100%)',
    outerBorder: 'border-2 border-fuchsia-400',
    innerBorder: 'border border-transparent',
    ringBorder: 'border-[3px] border-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.95)]',
    bannerBg: 'bg-purple-950/95 border border-fuchsia-400 text-fuchsia-100 shadow-md',
    bannerText: 'text-fuchsia-100 font-black',
    subText: 'text-amber-300 bg-purple-950/85 px-1.5 rounded-full',
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
        isWall ? 'w-[76px] h-[170px] p-1.5' : 'w-[172px] h-[196px] p-3.5'
      }`}
      style={{ background: style.sheetBg }}
    >
      {/* Real Uploaded Frame Image Background Layer (Rosa, Dorado, Esmeralda, Diamante, Místico VIP) */}
      {style.frameImageUrl && (
        <img
          src={style.frameImageUrl}
          alt={style.name}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
          style={{
            transform: style.frameScale || 'scale(1.2, 1.2)',
            transformOrigin: 'center center',
          }}
        />
      )}

      {/* Inner decorative frame border & content */}
      <div
        className={`relative z-10 w-full h-full flex flex-col items-center justify-between rounded-[2px] ${style.innerBorder} ${
          isWall ? 'px-1 py-2' : 'p-2'
        }`}
      >
        {/* Corner flourishes for B/W vintage frame */}
        {item.frameTier === 'bw_follow' && (
          <>
            <span className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-stone-800" />
            <span className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-stone-800" />
            <span className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-stone-800" />
            <span className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-stone-800" />
          </>
        )}

        {/* Center Portrait Circle + Side Emblems inside the frame window */}
        <div className={`relative flex items-center justify-center ${isWall ? 'mt-3' : 'mt-1'}`}>
          <div
            className={`relative rounded-full overflow-hidden bg-stone-200 ${style.ringBorder} ${
              isWall ? 'w-[56px] h-[56px]' : 'w-[86px] h-[86px]'
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
              <div className="absolute -bottom-1 -left-2 w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-white flex items-center justify-center text-[10px] shadow-md">
                ❤️
              </div>
              <div className="absolute -bottom-1 -right-2 w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 border-2 border-white flex items-center justify-center text-[10px] shadow-md">
                💖
              </div>
            </>
          )}

          {!isWall && item.frameTier !== 'bw_follow' && item.frameTier !== 'color_rose' && (
            <>
              <div className="absolute -bottom-1 -left-2 w-5 h-5 rounded-full bg-slate-900/90 border-2 border-amber-300 flex items-center justify-center text-[10px] shadow-md">
                {item.giftIcon}
              </div>
              <div className="absolute -bottom-1 -right-2 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-950 shadow-md">
                {style.coinsLabel}
              </div>
            </>
          )}
        </div>

        {/* Bottom Ribbon Banner with Username & Gift caption */}
        <div className={`w-full flex flex-col items-center ${isWall ? 'mb-1' : 'mt-0.5'}`}>
          <div
            className={`w-full rounded px-1 text-center truncate ${style.bannerBg} ${
              isWall ? 'py-0.5 text-[8.5px]' : 'py-0.5 text-[11px]'
            }`}
          >
            <span className={`block truncate ${style.bannerText}`}>
              {item.displayName || item.username}
            </span>
          </div>

          <div
            className={`mt-0.5 flex items-center justify-center gap-0.5 font-bold truncate max-w-full ${
              isWall ? 'text-[7px]' : 'text-[9px]'
            } ${style.subText}`}
          >
            <span className="truncate">{item.actionText}</span>
          </div>
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
  const bwSlotCursorRef = useRef<number>(0);
  const donorSlotMapRef = useRef<Record<string, number>>({});

  // Wall slot mapping per tier:
  // - Left side (0..3): Blanco y Negro (bw_follow) cycles sequentially 0 -> 1 -> 2 -> 3 -> 0
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

    // For 'bw_follow' (Seguir), cycle through the 4 left frames (0 -> 1 -> 2 -> 3 -> 0).
    // Other tiers fly to their dedicated fixed slot.
    let assignedSlot: number;
    if (activeDonor.frameTier === 'bw_follow') {
      if (donorSlotMapRef.current[activeDonor.id] === undefined) {
        donorSlotMapRef.current[activeDonor.id] = bwSlotCursorRef.current;
        bwSlotCursorRef.current = (bwSlotCursorRef.current + 1) % 4;
      }
      assignedSlot = donorSlotMapRef.current[activeDonor.id];
    } else {
      assignedSlot = getFixedSlotForTier(activeDonor.frameTier);
    }
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

        {/* LEFT 3 TRANSPARENT LEGEND FRAMES (B/N, Rosa, Dorado) — Aligned alongside the printer at the bottom */}
        <div className="absolute left-2 bottom-[14px] z-30 flex flex-col gap-2.5 pointer-events-none">
          {rightLegendTiers.slice(0, 3).map((item) => {
            const tierStyle = FRAME_STYLES[item.tier];
            return (
              <div key={item.tier} className="relative flex flex-col items-center">
                <div
                  className={`relative w-12 h-14 rounded-[4px] bg-transparent overflow-hidden flex flex-col items-center justify-between p-1 ${item.frameClass}`}
                >
                  {tierStyle?.frameImageUrl && (
                    <img
                      src={tierStyle.frameImageUrl}
                      alt={item.label}
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                      style={{
                        transform: tierStyle.frameScale || 'scale(1.2, 1.2)',
                        clipPath:
                          'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 18% 16%, 18% 84%, 82% 84%, 82% 16%, 18% 16%)',
                      }}
                    />
                  )}

                  <span className="relative z-10 text-[7px] font-black uppercase tracking-tighter text-white/95 bg-black/55 px-1 rounded-[2px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-none">
                    {item.label}
                  </span>

                  <div
                    className={`relative z-10 w-7 h-7 rounded-full bg-black/45 flex items-center justify-center ${item.circleClass}`}
                  >
                    <span className="text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                      {item.icon}
                    </span>
                  </div>

                  <span
                    className={`relative z-10 w-full text-center rounded-[2px] py-0.2 text-[8px] font-black leading-tight ${
                      item.tier === 'bw_follow'
                        ? 'bg-red-600/90 text-white'
                        : 'bg-black/85 text-amber-300'
                    }`}
                  >
                    {item.badgeText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT 3 TRANSPARENT LEGEND FRAMES (Esmeralda, Diamante, VIP) — Aligned alongside the printer at the bottom */}
        <div className="absolute right-2 bottom-[14px] z-30 flex flex-col gap-2.5 pointer-events-none">
          {rightLegendTiers.slice(3, 6).map((item) => {
            const tierStyle = FRAME_STYLES[item.tier];
            return (
              <div key={item.tier} className="relative flex flex-col items-center">
                <div
                  className={`relative w-12 h-14 rounded-[4px] bg-transparent overflow-hidden flex flex-col items-center justify-between p-1 ${item.frameClass}`}
                >
                  {tierStyle?.frameImageUrl && (
                    <img
                      src={tierStyle.frameImageUrl}
                      alt={item.label}
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                      style={{
                        transform: tierStyle.frameScale || 'scale(1.2, 1.2)',
                        clipPath:
                          'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 18% 16%, 18% 84%, 82% 84%, 82% 16%, 18% 16%)',
                      }}
                    />
                  )}

                  <span className="relative z-10 text-[7px] font-black uppercase tracking-tighter text-white/95 bg-black/55 px-1 rounded-[2px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-none">
                    {item.label}
                  </span>

                  <div
                    className={`relative z-10 w-7 h-7 rounded-full bg-black/45 flex items-center justify-center ${item.circleClass}`}
                  >
                    <span className="text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                      {item.icon}
                    </span>
                  </div>

                  <span className="relative z-10 w-full text-center rounded-[2px] py-0.2 text-[8px] font-black leading-tight bg-black/85 text-amber-300">
                    {item.badgeText}
                  </span>
                </div>
              </div>
            );
          })}
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
            When printing, smoothly lifts the bottom printer up so the entire 196px printed sheet slides out 100% visible without cutting off */}
        <div
          className="relative w-full h-full transition-transform duration-500 ease-out"
          style={{
            transform: isZoomedIn
              ? 'translateY(-225px) scale(1.08)'
              : 'translateY(0px) scale(1)',
            transformOrigin: '50% 0%',
          }}
        >
          {/* 1. WOODEN STUDIO WALL & ENLARGED GALLERY FRAMES */}
          {!obsMode && (
            <div className="absolute inset-0 z-20">
              {/* Wood planks background layer */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{
                  background:
                    'repeating-linear-gradient(90deg, #4A2F1D 0px, #4A2F1D 18px, #3B2314 18px, #3B2314 22px, #563824 22px, #563824 38px)',
                }}
              >
                {/* Warm studio lighting vignette */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 42%, rgba(255,215,150,0.18) 0%, rgba(15,10,6,0.62) 100%)',
                  }}
                />
              </div>

              {/* WALL GALLERY: Enlarged Left 2x2 Grid, Enlarged Center Giant VIP Místico Frame, Enlarged Right 2x2 Grid */}
              <div className="relative z-10 mt-10 px-1.5 flex items-center justify-between gap-1">
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

                {/* CENTER ENLARGED GIANT NEON PURPLE VIP PORTAL FRAME (MARCO MÍSTICO) */}
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
                    className={`relative w-[138px] h-[352px] rounded-lg p-3 bg-purple-950 border-2 flex flex-col items-center justify-between overflow-hidden transition-all duration-300 ${
                      activeDonor &&
                      cyclePhase === 'celebrating' &&
                      activeDonor.frameTier === 'frame_mythic'
                        ? 'border-amber-300 ring-4 ring-fuchsia-400 shadow-[0_0_40px_rgba(232,121,249,1)] scale-105'
                        : 'border-fuchsia-400 shadow-[0_0_25px_rgba(192,38,211,0.8)]'
                    }`}
                  >
                    {/* Uploaded Marco Místico VIP Frame Image */}
                    <img
                      src="/assets/aistudio/MARCO_MISTICO_3ba6377f.jpg"
                      alt="Marco Místico VIP"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                      style={{ transform: 'scale(1.04, 1.04)' }}
                    />

                    <div className="relative z-10 mt-1 text-xs tracking-widest text-fuchsia-200 bg-purple-950/90 border border-fuchsia-400/70 px-2.5 py-1 rounded-full font-black flex items-center gap-1 shadow">
                      <span>👑</span>
                      <span className="text-[9px] uppercase">VIP MÍSTICO</span>
                      <span>👑</span>
                    </div>

                    <div className="relative z-10 flex items-center justify-center my-1">
                      <div
                        className="absolute -inset-2 rounded-full border-2 border-dashed border-fuchsia-300/80 animate-spin"
                        style={{ animationDuration: '14s' }}
                      />
                      <div className="relative w-24 h-24 rounded-full border-[3px] border-fuchsia-300 shadow-[0_0_22px_rgba(232,121,249,0.95)] overflow-hidden bg-purple-900">
                        <img
                          src={displayedVipItem.avatarUrl}
                          alt={displayedVipItem.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="relative z-10 mb-1 w-full bg-purple-950/90 border border-fuchsia-400/80 rounded-md px-2 py-1.5 text-center shadow">
                      <div className="text-xs font-black text-white truncate">
                        {displayedVipItem.displayName}
                      </div>
                      <div className="text-[9px] font-bold text-amber-300 truncate mt-0.5">
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

          {/* 2. COMPACT HIGH-REALISM 3D "PHOTO PRINTER" AT THE BOTTOM (MATCHING USER REFERENCE SCREENSHOT, NO LOWER TRAYS) */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[426px] z-30 w-[304px] flex flex-col items-center">
            {/* Realistic Rear Top Paper Feeder Tray & Glossy Photo Paper Stack */}
            <div className="relative w-[198px] h-[18px] -mb-1.5 shrink-0 rounded-t-lg bg-gradient-to-b from-neutral-800 to-neutral-950 border-t border-x border-neutral-600 shadow-inner flex items-end justify-center overflow-hidden">
              {/* Left & Right Cyan Paper Guides */}
              <span className="absolute left-3 bottom-0 w-2 h-3.5 bg-slate-600 rounded-t-xs border-t border-slate-400" />
              <span className="absolute right-3 bottom-0 w-2 h-3.5 bg-slate-600 rounded-t-xs border-t border-slate-400" />
              {/* Glossy Photo Paper Stack Loaded in Rear Tray */}
              <div
                className="w-[162px] h-[13px] rounded-t-[2px] border-t border-x border-stone-200 shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 65%, #CBD5E1 100%)',
                }}
              />
            </div>

            {/* Printer Top Slanted Scanner/Feeder Cover with Metallic Bevel & "PHOTO PRINTER" Emblem */}
            <div
              className="relative w-[288px] h-[54px] shrink-0 rounded-t-2xl border-t-2 border-x border-stone-200 shadow-[0_6px_16px_rgba(0,0,0,0.35)] flex items-center justify-between px-3.5 overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, #FAF8F5 0%, #EAE4DC 48%, #D6CFC2 88%, #B8B0A2 100%)',
                transform: 'perspective(520px) rotateX(16deg)',
              }}
            >
              {/* Top Specular Highlight Strip */}
              <div className="absolute inset-x-3 top-0.5 h-[2px] rounded-full bg-white/90 pointer-events-none" />

              {/* Left Recessed Power & Status Cluster */}
              <div className="flex items-center gap-2 bg-stone-800/90 px-2.5 py-1 rounded-full border border-stone-400/60 shadow-inner shrink-0">
                {/* Illuminated Power Button */}
                <span
                  className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                    activeDonor && cyclePhase === 'printing'
                      ? 'bg-emerald-400 border-emerald-200 shadow-[0_0_10px_#34d399] animate-pulse'
                      : 'bg-emerald-500 border-emerald-200 shadow-[0_0_6px_#10b981]'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-white" />
                </span>
                {/* Wi-Fi LED */}
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" />
                {/* Ready/Busy Amber LED */}
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeDonor && cyclePhase === 'printing'
                      ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-ping'
                      : 'bg-rose-500/80'
                  }`}
                />
              </div>

              {/* Center Brushed Metallic "PHOTO PRINTER" Badge Plate */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-stone-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.2)]"
                style={{
                  background:
                    'linear-gradient(135deg, #E7E5E4 0%, #FFFFFF 45%, #D6D3D1 70%, #F5F5F4 100%)',
                }}
              >
                <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  <span className="absolute w-3 h-3 rotate-45 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[2px] shadow-xs" />
                  <span className="relative w-1.5 h-1.5 rotate-45 bg-gradient-to-br from-rose-400 to-red-600" />
                </div>
                <span className="text-[10.5px] font-black tracking-wide text-slate-900 uppercase whitespace-nowrap drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                  PHOTO PRINTER
                </span>
              </div>

              {/* Right 3D Tactile Control Buttons */}
              <div className="flex items-center gap-1.5 bg-stone-300/80 px-2 py-1 rounded-full border border-stone-400/70 shadow-inner shrink-0">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-amber-700 shadow"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, #FDE047 0%, #D97706 100%)',
                  }}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-blue-900 shadow"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, #60A5FA 0%, #1D4ED8 100%)',
                  }}
                />
              </div>
            </div>

            {/* Metallic Chrome Seam Strip between Scanner Lid and Main Body */}
            <div
              className="relative z-10 -mt-1 w-[296px] h-[5px] shrink-0 rounded-xs border-y border-stone-500/80 shadow-sm"
              style={{
                background:
                  'linear-gradient(90deg, #78716C 0%, #E7E5E4 25%, #FFFFFF 50%, #E7E5E4 75%, #78716C 100%)',
              }}
            />

            {/* Printer Upper Engine Body + CMYK Ink Tanks + Glass LCD Panel */}
            <div
              className="relative z-20 w-[304px] h-[112px] shrink-0 border-x-2 border-b-2 border-stone-500 shadow-[0_8px_18px_rgba(0,0,0,0.45)] flex items-center justify-between pt-2 pb-2.5 px-2.5"
              style={{
                background:
                  'linear-gradient(180deg, #EAE5DB 0%, #D6CFC2 52%, #BDB4A4 85%, #9E9585 100%)',
              }}
            >
              {/* Left Molded Side Grip & Ventilation Louvers */}
              <div className="w-[26px] h-full flex flex-col items-center justify-between py-1.5">
                <div className="w-full flex flex-col gap-1 px-0.5">
                  <span className="w-full h-[3px] rounded-full bg-stone-600/70 shadow-inner" />
                  <span className="w-full h-[3px] rounded-full bg-stone-600/70 shadow-inner" />
                  <span className="w-full h-[3px] rounded-full bg-stone-600/70 shadow-inner" />
                  <span className="w-full h-[3px] rounded-full bg-stone-600/70 shadow-inner" />
                </div>
                <div className="rounded bg-stone-800 px-1 py-0.5 border border-stone-400/60 shadow-inner">
                  <span className="block text-[5px] font-black tracking-tighter text-amber-300 leading-none">
                    HD-INK
                  </span>
                </div>
              </div>

              {/* Dark Carbon Recessed Center Bay housing the Glass Blue LCD Screen and Roller Output Slot */}
              <div
                className="w-[210px] h-full rounded-xl border-2 border-stone-600 shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between p-2"
                style={{
                  background: 'linear-gradient(180deg, #171717 0%, #0A0A0A 100%)',
                }}
              >
                {/* Glowing Blue LCD Display with Glass Reflection Overlay (No idle promotional text) */}
                <div
                  className="relative w-[184px] rounded-md border border-cyan-300/80 px-2.5 py-1.5 shadow-[0_0_16px_rgba(37,99,235,0.8),inset_0_1px_4px_rgba(255,255,255,0.35)] text-white overflow-hidden"
                  style={{
                    background: 'linear-gradient(180deg, #1D4ED8 0%, #1E3A8A 65%, #172554 100%)',
                  }}
                >
                  {/* Realistic Diagonal Glass Screen Glare */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(125deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 38%, transparent 42%)',
                    }}
                  />

                  <div className="relative flex items-center justify-between text-[9px] font-bold text-cyan-200 h-3.5">
                    <span className="truncate max-w-[128px] text-white font-black drop-shadow">
                      {activeDonor ? activeDonor.displayName || activeDonor.username : ''}
                    </span>
                    <span className="font-mono text-cyan-200">
                      {activeDonor ? `${Math.round(printProgress * 100)}%` : ''}
                    </span>
                  </div>

                  {/* Progress Bar on LCD */}
                  <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-slate-950/90 border border-cyan-500/30 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-300 via-sky-200 to-white transition-all duration-75"
                      style={{
                        width: `${activeDonor ? Math.max(8, Math.round(printProgress * 100)) : 0}%`,
                      }}
                    />
                  </div>

                  <div className="relative mt-1.5 flex items-center justify-between text-[8px] font-mono text-cyan-100/90">
                    <span>Impresas: {printedCount}</span>
                    <span>En cola: {queueCount}</span>
                  </div>
                </div>

                {/* Realistic Paper Output Bay with Metallic Feed Rollers */}
                <div className="relative w-[196px] h-3.5 rounded-full bg-black border-t border-neutral-600 shadow-inner flex items-center justify-evenly px-3 overflow-hidden">
                  <span className="w-5 h-1.5 rounded-xs bg-gradient-to-b from-stone-300 to-stone-600 opacity-75" />
                  <span className="w-5 h-1.5 rounded-xs bg-gradient-to-b from-stone-300 to-stone-600 opacity-75" />
                  <span className="w-5 h-1.5 rounded-xs bg-gradient-to-b from-stone-300 to-stone-600 opacity-75" />
                  <span className="w-5 h-1.5 rounded-xs bg-gradient-to-b from-stone-300 to-stone-600 opacity-75" />
                </div>
              </div>

              {/* Right Recessed CMYK Ink Tank Level Windows (Realistic EcoTank Photo Printer Window) */}
              <div className="w-[34px] h-full rounded-lg bg-neutral-900/95 border border-stone-600 p-1 flex flex-col justify-between shadow-inner">
                <span className="text-[5px] font-black text-center text-stone-300 tracking-wider uppercase">
                  CMYK
                </span>
                <div className="flex-1 my-0.5 grid grid-cols-4 gap-0.5 items-end bg-neutral-950 p-0.5 rounded border border-neutral-800">
                  {/* Cyan Tank */}
                  <div className="w-full h-full bg-neutral-800 rounded-xs overflow-hidden flex items-end">
                    <div className="w-full h-[85%] bg-gradient-to-t from-cyan-600 to-cyan-300" />
                  </div>
                  {/* Magenta Tank */}
                  <div className="w-full h-full bg-neutral-800 rounded-xs overflow-hidden flex items-end">
                    <div className="w-full h-[78%] bg-gradient-to-t from-pink-600 to-rose-400" />
                  </div>
                  {/* Yellow Tank */}
                  <div className="w-full h-full bg-neutral-800 rounded-xs overflow-hidden flex items-end">
                    <div className="w-full h-[90%] bg-gradient-to-t from-amber-500 to-yellow-300" />
                  </div>
                  {/* Black Tank */}
                  <div className="w-full h-full bg-neutral-800 rounded-xs overflow-hidden flex items-end">
                    <div className="w-full h-[92%] bg-gradient-to-t from-slate-900 to-slate-500" />
                  </div>
                </div>
                <span className="text-[4.5px] font-mono text-center text-emerald-400 leading-none">
                  READY
                </span>
              </div>
            </div>

            {/* Compact Output Tray Base Lip (Only the top output bar shown in the user's photo, no lower trays) */}
            <div
              className="relative z-10 w-[298px] h-[28px] rounded-b-xl border-x-2 border-b-2 border-stone-600 shadow-[0_12px_24px_rgba(0,0,0,0.85)] flex items-center justify-center px-2"
              style={{
                background: 'linear-gradient(180deg, #D6CFC2 0%, #ACA395 100%)',
              }}
            >
              <div className="w-full h-[20px] rounded-md bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900 border border-stone-600 shadow-inner flex items-center justify-between px-4">
                <span className="text-[6px] font-mono font-bold text-stone-400 tracking-widest uppercase">
                  OUTPUT TRAY
                </span>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-1 rounded-full bg-stone-600" />
                  <span className="w-6 h-1 rounded-full bg-stone-600" />
                  <span className="w-6 h-1 rounded-full bg-stone-600" />
                </div>
                <span className="text-[6px] font-mono font-bold text-cyan-400">AUTO-FEED</span>
              </div>
            </div>

            {/* 3. SINGLE PHOTO SHEET SLIDING COMPLETELY OUT OF THE PRINTER SLOT & FLYING TO ITS ENLARGED WALL POSITION */}
            <div
              className="absolute top-[168px] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none"
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
                            scale: activeDonor.frameTier === 'frame_mythic' ? 0.78 : 0.48,
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
