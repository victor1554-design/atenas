import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// @ts-ignore - tiktok-live-connector does not have official ts types
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface TikTokLiveState {
  isConnected: boolean;
  username: string;
  roomInfo: any;
  lastError: string | null;
}

let liveState: TikTokLiveState = {
  isConnected: false,
  username: '',
  roomInfo: null,
  lastError: null,
};

let tiktokConnection: any = null;

// Settings chosen in the panel that the OBS overlay must also use (print triggers, plotter sound)
// Persisted to disk so a server restart does not fall back to the default triggers
const SHARED_SETTINGS_FILE = path.join(__dirname, 'shared-settings.json');
let sharedSettings: Record<string, any> = {};
try {
  if (fs.existsSync(SHARED_SETTINGS_FILE)) {
    sharedSettings = JSON.parse(fs.readFileSync(SHARED_SETTINGS_FILE, 'utf-8'));
  }
} catch {
  sharedSettings = {};
}
const sseClients: Response[] = [];

// Broadcast an event to all connected SSE browser clients (console + OBS overlays)
// Profile photo URL across legacy (profilePictureUrl) and v2 proto (avatarThumb.urlList) user shapes
function getAvatarUrl(u: any, data: any): string {
  return (
    u?.profilePictureUrl ||
    u?.profilePicture?.url?.[0] ||
    u?.avatarLarge?.urlList?.[0] ||
    u?.avatarMedium?.urlList?.[0] ||
    u?.avatarThumb?.urlList?.[0] ||
    u?.profilePictureUrls?.[0] ||
    data?.profilePictureUrl ||
    data?.userDetails?.profilePictureUrls?.[0] ||
    ''
  );
}

function broadcastSSE(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// Map TikTok gift to app GiftTier
function mapGiftToTier(giftName: string, diamondCount: number): 'heart' | 'flower' | 'donut' | 'big_gift' {
  const name = (giftName || '').toLowerCase();

  // Tier 4: Rosquilla / VIP / Big Gift (30+ coins, Rosquilla, VIP, Lion, etc.)
  if (
    diamondCount >= 30 ||
    name.includes('rosquilla') ||
    name.includes('vip') ||
    name.includes('donut') ||
    name.includes('dona') ||
    name.includes('doughnut') ||
    name.includes('lion') ||
    name.includes('león') ||
    name.includes('leon') ||
    name.includes('universe') ||
    name.includes('universo')
  ) {
    return 'big_gift';
  }

  // Tier 3: Corazoncito Coreano (5+ coins, Corazoncito, Coreano, Finger Heart)
  if (
    diamondCount >= 5 ||
    name.includes('corazoncito') ||
    name.includes('coreano') ||
    name.includes('finger') ||
    name.includes('korean')
  ) {
    return 'donut';
  }

  // Tier 2: Flor (1+ coin, Rose, Flower, Flor)
  if (
    diamondCount >= 1 ||
    name.includes('rose') ||
    name.includes('rosa') ||
    name.includes('flower') ||
    name.includes('flor')
  ) {
    return 'flower';
  }

  return 'heart';
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. CORS-free image proxy for TikTok avatar CDN URLs
  // This allows the HTML5 canvas to draw avatars and export dataUrl without CORS taint!
  app.get('/api/proxy-image', async (req: Request, res: Response) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Missing url param');
    }

    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).send(`Proxy error: ${err.message}`);
    }
  });

  // 2. Server-Sent Events (SSE) stream for real-time live events to frontend & OBS
  app.get('/api/tiktok/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    sseClients.push(res);

    // Send immediate initial status
    res.write(
      `data: ${JSON.stringify({
        type: 'status',
        data: liveState,
      })}\n\n`
    );

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // 3. Status endpoint
  app.get('/api/tiktok/status', (_req: Request, res: Response) => {
    res.json(liveState);
  });

  // Shared settings (print triggers, plotter sound), synced between panel and overlay
  app.get('/api/shared-settings', (_req: Request, res: Response) => {
    res.json(sharedSettings);
  });

  app.post('/api/shared-settings', (req: Request, res: Response) => {
    sharedSettings = { ...sharedSettings, ...(req.body || {}) };
    try {
      fs.writeFileSync(SHARED_SETTINGS_FILE, JSON.stringify(sharedSettings, null, 2));
    } catch (err) {
      console.error('No se pudo guardar shared-settings.json', err);
    }
    broadcastSSE('shared-settings', sharedSettings);
    res.json({ success: true });
  });

  // 4. Connect to TikTok Live
  app.post('/api/tiktok/connect', async (req: Request, res: Response) => {
    let { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    username = username.replace(/^@/, '').trim();

    try {
      // Disconnect existing connection if any
      if (tiktokConnection) {
        try {
          tiktokConnection.disconnect();
        } catch {}
        tiktokConnection = null;
      }

      liveState = {
        isConnected: false,
        username,
        roomInfo: null,
        lastError: null,
      };
      broadcastSSE('status', liveState);

      const conn: any = new TikTokLiveConnection(username, {
        processInitialData: false,
        // enableExtendedGiftInfo fetches gift/list/ through a signed EulerStream request,
        // which requires a paid Business plan. Gift events still include name/diamonds.
        enableExtendedGiftInfo: false,
        ...(process.env.SIGN_API_KEY ? { signApiKey: process.env.SIGN_API_KEY } : {}),
      });

      conn.on('connected', (state: any) => {
        liveState = {
          isConnected: true,
          username,
          roomInfo: state?.roomInfo || { title: `Live de @${username}` },
          lastError: null,
        };
        broadcastSSE('connected', liveState);
      });

      conn.on('disconnected', () => {
        liveState = {
          isConnected: false,
          username,
          roomInfo: null,
          lastError: null,
        };
        broadcastSSE('disconnected', liveState);
      });

      conn.on('streamEnd', () => {
        liveState = {
          isConnected: false,
          username,
          roomInfo: null,
          lastError: 'La transmisión en vivo de TikTok ha finalizado.',
        };
        broadcastSSE('disconnected', liveState);
      });

      conn.on('error', (err: any) => {
        liveState.lastError = err?.message || 'Error en la conexión con TikTok Live';
        broadcastSSE('error', { error: liveState.lastError });
      });

      // Capture live chat messages for team voting, user affiliation & "yo" detection
      conn.on(WebcastEvent.CHAT || 'chat', (data: any) => {
        const u = data.user || data;
        const rawAvatar = getAvatarUrl(u, data);

        const safeAvatar = rawAvatar
          ? `/api/proxy-image?url=${encodeURIComponent(rawAvatar)}`
          : '';

        const comment = (data.comment || data.content || '').trim();
        const commentLower = comment.toLowerCase();
        const isYo = commentLower === 'yo' || commentLower === 'y' || commentLower.startsWith('yo ');

        const chatEvent = {
          id: `chat_${data.msgId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          uniqueId: (u.uniqueId || u.nickname || data.uniqueId || 'espectador').toLowerCase().trim(),
          displayName: u.nickname || u.uniqueId || data.nickname || 'Espectador',
          comment,
          avatarUrl: safeAvatar,
          timestamp: Date.now(),
          isYo,
        };

        broadcastSSE('chat', chatEvent);
      });

      // Capture viewers joining the live (used to print their profile photo)
      conn.on(WebcastEvent.MEMBER || 'member', (data: any) => {
        const u = data.user || data;
        const rawAvatar = getAvatarUrl(u, data);

        const safeAvatar = rawAvatar
          ? `/api/proxy-image?url=${encodeURIComponent(rawAvatar)}`
          : '';

        const memberEvent = {
          id: `member_${data.msgId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          username: (u.uniqueId || u.nickname || data.uniqueId || 'espectador').toLowerCase().trim(),
          nickname: u.nickname || u.uniqueId || data.nickname || 'Espectador',
          avatarUrl: safeAvatar,
          timestamp: Date.now(),
        };

        broadcastSSE('member', memberEvent);
      });

      // Capture real TikTok Live likes (screen tap hearts ❤️)
      conn.on(WebcastEvent.LIKE || 'like', (data: any) => {
        const u = data.user || data;
        const rawAvatar = getAvatarUrl(u, data);

        const safeAvatar = rawAvatar
          ? `/api/proxy-image?url=${encodeURIComponent(rawAvatar)}`
          : '';

        const likeEvent = {
          id: `like_${data.msgId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          username: (u.uniqueId || u.nickname || data.uniqueId || 'espectador').toLowerCase().trim(),
          nickname: u.nickname || u.uniqueId || data.nickname || 'Espectador',
          avatarUrl: safeAvatar,
          likeCount: Math.max(1, Number(data.likeCount || data.count) || 1),
          totalLikes: Number(data.totalLikes) || 0,
          timestamp: Date.now(),
        };

        broadcastSSE('like', likeEvent);
      });

      // Map to buffer and resolve gift streaks so single gifts and combos never get lost
      const activeStreaks = new Map<string, { timer: NodeJS.Timeout; event: any }>();

      const dispatchGift = (giftEvent: any) => {
        console.log(`[TikTok Live GIFT] De @${giftEvent.username}: ${giftEvent.giftName} (x${giftEvent.repeatCount}) [${giftEvent.giftTier}]`);
        broadcastSSE('gift', giftEvent);
      };

      // Capture real TikTok Live gifts!
      conn.on(WebcastEvent.GIFT || 'gift', (data: any) => {
        const u = data.user || data;
        const g = data.gift || data;

        const rawAvatar = getAvatarUrl(u, data);

        // Route through our CORS-safe image proxy
        const safeAvatar = rawAvatar
          ? `/api/proxy-image?url=${encodeURIComponent(rawAvatar)}`
          : '';

        const giftName = g.giftName || data.giftName || g.name || 'Regalo';
        const diamondCount = Number(g.diamondCount || data.diamondCount || g.coins || 1);
        const tier = mapGiftToTier(giftName, diamondCount);

        const giftEvent = {
          id: `tt_${data.msgId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          username: u.uniqueId || u.nickname || data.uniqueId || 'espectador',
          uniqueId: (u.uniqueId || u.nickname || data.uniqueId || 'espectador').toLowerCase().trim(),
          nickname: u.nickname || u.uniqueId || data.nickname || 'Espectador',
          avatarUrl: safeAvatar,
          giftTier: tier,
          giftName: giftName,
          coins: diamondCount,
          giftIcon: tier === 'big_gift' ? '🍩' : tier === 'donut' ? '🫰' : tier === 'flower' ? '🌸' : '💬',
          repeatCount: Number(data.repeatCount || g.repeatCount || 1),
          timestamp: Date.now(),
        };

        // For streak gifts (giftType === 1, e.g. Rose, Heart)
        if (data.giftType === 1) {
          const streakKey = `${giftEvent.uniqueId}_${data.giftId || data.giftName}`;
          const existing = activeStreaks.get(streakKey);
          if (existing) {
            clearTimeout(existing.timer);
          }

          if (data.repeatEnd) {
            activeStreaks.delete(streakKey);
            dispatchGift(giftEvent);
          } else {
            // Buffer for 1.2s: if no further tap arrives, dispatch with current repeatCount
            const timer = setTimeout(() => {
              activeStreaks.delete(streakKey);
              dispatchGift(giftEvent);
            }, 1200);
            activeStreaks.set(streakKey, { timer, event: giftEvent });
          }
        } else {
          // Non-streak gift (e.g. Donut, Lion, Whale)
          dispatchGift(giftEvent);
        }
      });

      tiktokConnection = conn;
      const state = await conn.connect();

      liveState = {
        isConnected: true,
        username,
        roomInfo: state?.roomInfo || { title: `Live de @${username}` },
        lastError: null,
      };
      broadcastSSE('status', liveState);

      return res.json({ success: true, liveState });
    } catch (err: any) {
      liveState = {
        isConnected: false,
        username,
        roomInfo: null,
        lastError: err?.message || 'No se pudo conectar a TikTok Live. Verifica que el usuario esté transmitiendo en vivo.',
      };
      broadcastSSE('status', liveState);

      return res.status(500).json({
        success: false,
        error: liveState.lastError,
      });
    }
  });



  // 5. Disconnect from TikTok Live
  app.post('/api/tiktok/disconnect', (_req: Request, res: Response) => {
    if (tiktokConnection) {
      try {
        tiktokConnection.disconnect();
      } catch {}
      tiktokConnection = null;
    }

    liveState = {
      isConnected: false,
      username: '',
      roomInfo: null,
      lastError: null,
    };
    broadcastSSE('disconnected', liveState);

    return res.json({ success: true });
  });

  // 6. Vite middleware for frontend SPA in development mode
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TikTok Live Plotter] Servidor activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
