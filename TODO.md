# TODO (GaGa Chat) — Real-time Live Usability Pass

## Step 1 — Deep-check all pages
- [x] Reviewed routing + app lifecycle (`src/App.tsx`)
- [x] Reviewed tab orchestration + call overlay (`src/pages/Index.tsx`)
- [x] Reviewed chat list + group/AI flows (`src/pages/ChatsPage.tsx`)
- [x] Reviewed chat room realtime message/typing/reactions/upload/AI (`src/pages/ChatRoomPage.tsx`)
- [x] Reviewed contacts realtime profile updates + friend add flow (`src/pages/ContactsPage.tsx`)
- [x] Reviewed QR scanner (currently simulated) (`src/pages/QRScannerPage.tsx`)
- [x] Reviewed timeline realtime posts/likes/comments throttling (`src/pages/TimelinePage.tsx`)
- [x] Reviewed calls realtime list (`src/pages/CallsPage.tsx`)
- [x] Reviewed more/settings flows (`src/pages/MorePage.tsx`)
- [x] Reviewed shared realtime/store layer (`src/hooks/useChatStore.ts`)

## Step 2 — Implement fixes for realtime/live usability
- [ ] Replace QR scanner simulation with real QR decoding (or integrate camera-based scanning)
- [x] Fix message unread/count logic updates that may be inconsistent (`useChatStore.ts`)
- [ ] Ensure typing presence cleanup correctness (no stale typing users)
- [ ] Ensure all Supabase channels are created/removed safely (avoid duplicates)
- [ ] Validate reactions update in realtime (store + subscription coherence)

## Step 3 — Run checks
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `npm run lint`
- [ ] `npm run preview` smoke tests for realtime + routing (hosted-like)
- [ ] Final manual runtime QA: typing, message propagation, reactions, disconnect/reconnect

## Step 4 — Deploy
- [x] `npm run deploy` to Firebase Hosting
- [ ] Post-deploy verification: offline banner, SW load, realtime channels stability

