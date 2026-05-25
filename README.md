# GaGa Chat

GaGa Chat is a modern messaging application built with React, Vite, and Tailwind CSS.

## Features

- Real-time messaging
- Group chats
- Timeline/Stories
- Voice and Video calls
- QR Code scanner for adding friends
- Dark mode support

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn UI
- **Backend**: Supabase (Auth & Database), Firebase (Analytics & Cloud Messaging)
- **State Management**: Zustand
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js & npm installed

### Installation

1. Clone the repository
2. Navigate to the `source` directory
3. Install dependencies:
   ```sh
   npm install
   ```
4. Create a `.env` file with your Supabase and Firebase credentials.

### Development

Run the development server:
```sh
npm run dev
```

### Build

Create a production build:
```sh
npm run build
```

## Firebase Deployment

This project is configured for Firebase Hosting with SPA rewrites using the `gaga-chats` Firebase project.

- Project name: GaGa Chat
- Project ID: `gaga-chats`
- Hosting site: `gaga-chats`
- Firebase App ID: `1:814397766265:web:4caa9203d6025b1348f2a8`
- Auth domain: `gaga-chats.firebaseapp.com`

1. Install dependencies:
```sh
npm install
```
2. Make sure `.env` is configured with your Supabase and Firebase values.
3. Build the app and deploy to Firebase Hosting:
```sh
npm run deploy
```

If you need to explicitly select the Firebase project:
```sh
firebase use gaga-chats
```

## Environment Variables

Create a `.env` file with the following values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_GEMINI_API_KEY=
```

The app includes Firebase Analytics initialization, Supabase realtime messaging, offline caching, and browser notification support.

### Offline experience

The app ships with a service worker and offline fallback page. When the user loses network access, cached assets are used and an offline page is shown for navigation requests.

### Firebase Cloud Messaging (optional)

If you want push notifications for live chat events, add `VITE_FIREBASE_VAPID_KEY` and configure FCM in your Firebase project.
