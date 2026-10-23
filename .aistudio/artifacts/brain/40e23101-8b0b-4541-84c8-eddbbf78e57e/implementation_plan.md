# Implementation Plan - TikTok Live Connection & Like Capture Fix

Resolving connection issues with TikTok Live streams and ensuring seamless capture of screen likes (corazones) and gifts for both applications (Photo Printer and Soccer Battle).

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Confirmed Decision**: We will provide robust connection error handling, automatic retry/fallback feedback, and clear troubleshooting steps if a TikTok username is not currently broadcasting live.
> - **Confirmed Decision**: Screen taps (likes) and gifts will be reliably captured and counted in real-time.

---

### 1. Overview & Core Concept

- **What It Does**: Fixes the connection routine between the Node.js backend (`tiktok-live-connector`) and active TikTok Live streams, and ensures that viewers tapping the screen (giving likes) and sending gifts are correctly captured and processed.
- **Target Audience**: TikTok Live streamers using the Photo Printer or Soccer Battle apps.
- **Key Value**: Flawless live streaming integration without network connection errors.

### 2. User Experience & Visual Design

- **Connection Status Feedback**: Clear, descriptive error messages in the UI explaining why a connection failed (e.g. username not live, network timeout) with instant retry affordance.
- **Live Telemetry**: Real-time ticker for likes and gifts with animated counters.

### 3. Key Product Decisions & Trade-Offs

- **Resilient Connection Handling**: Catch connection exceptions cleanly on the server so the Express backend never crashes on invalid usernames or offline streams.
- **Event Buffering**: Buffer and batch rapid like events to ensure smooth real-time performance in both apps.

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────┐       SSE Stream       ┌──────────────────────────┐
│  TikTok Live Broadcast  │ ──────────────────────>│ Express Backend (/server)│
└─────────────────────────┘                        └─────────────┬────────────┘
                                                                 │
                                                       Events (gift, like, chat)
                                                                 │
                                                                 ▼
                                                   ┌──────────────────────────┐
                                                   │   React Frontend (App)   │
                                                   │  - Photo Printer Queue   │
                                                   │  - Soccer Battle Points  │
                                                   └──────────────────────────┘
```
