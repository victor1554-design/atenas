import { GiftTier } from '../types/tiktok';

export interface BrushTipPosition {
  x: number;
  y: number;
  angle: number;
  isDrawing: boolean;
}

export interface PreparedDrawingData {
  sourceCanvas: HTMLCanvasElement;
  width: number;
  height: number;
  tier: GiftTier;
  // Dense feature points
  featureCurves: { x: number; y: number }[][];
}

/**
 * Prepares the donor avatar onto an offscreen canvas and preprocesses
 * it for smooth, organic brush painting.
 */
export async function prepareImageForDrawing(
  imageSrc: string,
  targetWidth: number,
  targetHeight: number,
  tier: GiftTier
): Promise<PreparedDrawingData> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = targetWidth;
      offscreen.height = targetHeight;
      const ctx = offscreen.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        resolve({
          sourceCanvas: offscreen,
          width: targetWidth,
          height: targetHeight,
          tier,
          featureCurves: generateHarmonicBrushPaths(targetWidth, targetHeight),
        });
        return;
      }

      // Draw portrait inside circle (center-cropped square so rectangular avatars never stretch)
      ctx.save();
      ctx.beginPath();
      ctx.arc(targetWidth / 2, targetHeight / 2, Math.min(targetWidth, targetHeight) / 2 - 3, 0, Math.PI * 2);
      ctx.clip();
      const natW = img.naturalWidth || img.width || targetWidth;
      const natH = img.naturalHeight || img.height || targetHeight;
      const minSide = Math.min(natW, natH);
      const sx = (natW - minSide) / 2;
      const sy = (natH - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetWidth, targetHeight);
      ctx.restore();

      const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imgData.data;

      // Heart tier: Convert to artistic black & white sumi-e / ink wash
      if (tier === 'heart') {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          // Soft ink gradient curves
          const ink = lum < 60 ? 25 : lum < 120 ? 75 : lum < 180 ? 150 : 245;
          data[i] = ink;
          data[i + 1] = ink;
          data[i + 2] = ink;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      resolve({
        sourceCanvas: offscreen,
        width: targetWidth,
        height: targetHeight,
        tier,
        featureCurves: generateHarmonicBrushPaths(targetWidth, targetHeight),
      });
    };

    img.onerror = () => {
      const fallback = document.createElement('canvas');
      fallback.width = targetWidth;
      fallback.height = targetHeight;
      resolve({
        sourceCanvas: fallback,
        width: targetWidth,
        height: targetHeight,
        tier,
        featureCurves: generateHarmonicBrushPaths(targetWidth, targetHeight),
      });
    };

    img.src = imageSrc;
  });
}

/**
 * Creates smooth, organic brush sweep trajectories (waves and arcs)
 * that simulate natural artistic brush strokes across the portrait.
 */
function generateHarmonicBrushPaths(w: number, h: number): { x: number; y: number }[][] {
  const curves: { x: number; y: number }[][] = [];
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.44;

  // 1. Smooth Circular Rim Path
  const rim: { x: number; y: number }[] = [];
  const rimSteps = 40;
  for (let i = 0; i <= rimSteps; i++) {
    const angle = (i / rimSteps) * Math.PI * 2 - Math.PI / 2;
    rim.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }
  curves.push(rim);

  // 2. Gentle sweeping brush arcs from top to bottom
  const verticalPasses = 7;
  for (let p = 0; p < verticalPasses; p++) {
    const passCurve: { x: number; y: number }[] = [];
    const yCenter = cy - r * 0.75 + (p / (verticalPasses - 1)) * (r * 1.5);
    const halfWidth = Math.sqrt(Math.max(0, r * r - (yCenter - cy) * (yCenter - cy))) * 0.85;

    const steps = 18;
    const direction = p % 2 === 0 ? 1 : -1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = direction === 1 ? cx - halfWidth + t * 2 * halfWidth : cx + halfWidth - t * 2 * halfWidth;
      const wave = Math.sin(t * Math.PI) * (p % 2 === 0 ? 4 : -4);
      passCurve.push({ x, y: yCenter + wave });
    }
    curves.push(passCurve);
  }

  return curves;
}

/**
 * Smoothly renders the artistic painting frame at progress (0.0 to 1.0).
 * Total duration: strictly 2.0 seconds.
 * Produces organic, fluid brush painting without forced jitter!
 */
export function renderSketchFrame(
  targetCtx: CanvasRenderingContext2D,
  prepared: PreparedDrawingData,
  progress: number,
  tier: GiftTier
): BrushTipPosition {
  const { width, height, sourceCanvas } = prepared;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 3;

  targetCtx.clearRect(0, 0, width, height);

  // 1. Base Paper Texture & Canvas Disc
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, radius, 0, Math.PI * 2);
  targetCtx.fillStyle = tier === 'heart' ? '#fafafa' : '#ffffff';
  targetCtx.fill();
  targetCtx.clip();

  // 2. Progressive Painting Stages
  // STAGE A: Fluid outer circular frame stroke (0.0 -> 0.28)
  if (progress > 0) {
    const rimProgress = Math.min(1, progress / 0.28);
    const endAngle = rimProgress * Math.PI * 2 - Math.PI / 2;

    targetCtx.beginPath();
    targetCtx.arc(cx, cy, radius - 1.5, -Math.PI / 2, endAngle);
    targetCtx.lineWidth = tier === 'big_gift' ? 3.5 : 2.5;
    targetCtx.lineCap = 'round';
    targetCtx.strokeStyle =
      tier === 'heart'
        ? '#18181b'
        : tier === 'flower'
        ? '#ec4899'
        : tier === 'donut'
        ? '#f59e0b'
        : '#eab308';
    targetCtx.stroke();
  }

  // STAGE B: Wet ink / watercolor wash revelation (0.15 -> 1.0)
  // Instead of forced line jumping, this reveals the painting through organic brush strokes
  if (progress > 0.15) {
    const washProgress = (progress - 0.15) / 0.85; // 0 to 1

    targetCtx.save();

    // Use multiple circular/oval brush masks expanding across the portrait
    // to simulate wet paint spreading smoothly
    targetCtx.beginPath();

    // Expanding brush sweep path
    const sweepCount = Math.floor(washProgress * 8) + 1;
    for (let i = 0; i < sweepCount; i++) {
      const sweepFrac = i / 8;
      const sweepY = cy - radius * 0.8 + sweepFrac * (radius * 1.6);
      const sweepWidth = Math.sqrt(Math.max(0, radius * radius - (sweepY - cy) * (sweepY - cy))) * 1.05;
      targetCtx.ellipse(
        cx,
        sweepY,
        Math.max(2, sweepWidth),
        radius * 0.25,
        0,
        0,
        Math.PI * 2
      );
    }
    targetCtx.clip();

    // Render underlying portrait with progressive opacity
    targetCtx.globalAlpha = Math.min(1, washProgress * 1.25);
    targetCtx.drawImage(sourceCanvas, 0, 0, width, height);

    // If Heart: add subtle Japanese sumi-e ink texture
    if (tier === 'heart') {
      targetCtx.fillStyle = 'rgba(24, 24, 27, 0.05)';
      targetCtx.fillRect(0, 0, width, height);
    }

    // If Big Gift: add soft golden radiant sheen
    if (tier === 'big_gift') {
      const grad = targetCtx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 0.85);
      grad.addColorStop(0, 'rgba(250, 204, 21, 0.28)');
      grad.addColorStop(1, 'rgba(234, 179, 8, 0.02)');
      targetCtx.fillStyle = grad;
      targetCtx.fillRect(0, 0, width, height);
    }

    targetCtx.restore();
  }

  // STAGE C: Paintbrush visible stroke ripples
  if (progress > 0.2 && progress < 0.95) {
    const activeY = cy - radius * 0.8 + ((progress - 0.2) / 0.75) * (radius * 1.6);
    targetCtx.beginPath();
    targetCtx.ellipse(cx, activeY, radius * 0.75, 4, 0, 0, Math.PI * 2);
    targetCtx.fillStyle =
      tier === 'heart'
        ? 'rgba(24, 24, 27, 0.12)'
        : tier === 'flower'
        ? 'rgba(236, 72, 153, 0.15)'
        : tier === 'donut'
        ? 'rgba(245, 158, 11, 0.15)'
        : 'rgba(234, 179, 8, 0.25)';
    targetCtx.fill();
  }

  targetCtx.restore();

  // 3. Compute the Smooth Brush Tip Coordinates
  let brushX = cx;
  let brushY = cy;
  let brushAngle = -35;

  if (progress < 0.28) {
    // Following circular rim smoothly
    const rimAngle = (progress / 0.28) * Math.PI * 2 - Math.PI / 2;
    brushX = cx + Math.cos(rimAngle) * radius;
    brushY = cy + Math.sin(rimAngle) * radius;
    brushAngle = -30 + Math.sin(progress * 15) * 8;
  } else {
    // Smooth horizontal serpentine painting sweep (like a real artist or plotter brush)
    const sweepProgress = (progress - 0.28) / 0.72; // 0 to 1
    const sweepY = cy - radius * 0.75 + sweepProgress * (radius * 1.5);
    const wave = Math.sin(sweepProgress * Math.PI * 6);
    const span = Math.sqrt(Math.max(0, radius * radius - (sweepY - cy) * (sweepY - cy))) * 0.8;

    brushX = cx + wave * span;
    brushY = sweepY;
    // Natural dynamic angle tilt of the brush following stroke direction
    brushAngle = -35 + Math.cos(sweepProgress * Math.PI * 6) * 18;
  }

  return {
    x: brushX,
    y: brushY,
    angle: brushAngle,
    isDrawing: progress > 0 && progress < 1,
  };
}
