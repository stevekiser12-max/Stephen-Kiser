# Dog Friendly Finder 🐾

A mobile-first Progressive Web App (PWA) that finds every dog-friendly restaurant, bar, park, pet shop, hotel, and activity near your current location — with one tap.

## Features

- **One-tap search** — hit the button and get a full list instantly
- **All categories** — restaurants, bars/breweries, parks, pet shops, dog-friendly hotels, and things to do
- **Live location** — uses your phone's GPS to search nearby
- **Adjustable radius** — 1km to 20km search range
- **Open/Closed status** — see what's open right now
- **Ratings & reviews** — sorted by open status then star rating
- **Directions** — tap any result to get directions in Google Maps
- **Install to home screen** — works like a native app (PWA)
- **Offline shell** — app shell loads even without internet

## Getting Started

### 1. Get a Google Places API Key (free tier is plenty)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Places API** and **Maps JavaScript API**
4. Go to **Credentials** → **Create credentials** → **API key**
5. (Optional but recommended) Restrict the key to **Places API** and your domain

The free tier gives you **$200/month** in credits, enough for thousands of searches.

### 2. Run the App Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` on your phone (same WiFi network) or desktop.

### 3. Build & Deploy

```bash
npm run build
```

Deploy the `dist/` folder to any static host:

| Host | Command |
|------|---------|
| **Netlify** | Drag & drop `dist/` at netlify.com/drop |
| **Vercel** | `npx vercel --prod` |
| **GitHub Pages** | Push `dist/` to `gh-pages` branch |
| **Cloudflare Pages** | Connect repo, build command: `npm run build`, output: `dist` |

### 4. Install on Your Phone

Once deployed (or running locally via HTTPS/ngrok):

- **iPhone**: Open in Safari → Share button → "Add to Home Screen"
- **Android**: Open in Chrome → three-dot menu → "Add to Home Screen" / "Install app"

## Using the App

1. Open the app and enter your Google Places API key (saved to your device, never sent anywhere else)
2. Choose your search radius (default 5km)
3. Select which categories you want (all enabled by default)
4. Tap **"Find Dog-Friendly Places"**
5. Allow location access when prompted
6. Browse your results — tap any card for directions and details

## Tech Stack

- **React + Vite** — fast development and optimized builds
- **Google Places API** — Text Search + Nearby Search
- **Browser Geolocation API** — live GPS positioning
- **Service Worker** — PWA offline support
- **Web App Manifest** — install to home screen

## Project Structure

```
src/
  components/
    Header.jsx          # App title bar
    ApiKeySetup.jsx     # API key input (stored in localStorage)
    CategoryFilter.jsx  # Toggle which categories to search
    SearchButton.jsx    # Animated search trigger
    PlacesList.jsx      # Scrollable results list
    PlaceCard.jsx       # Individual place card
    PlaceDetail.jsx     # Bottom sheet with details + directions
  services/
    placesService.js    # Google Places API calls + utilities
  hooks/
    useLocalStorage.js  # Persistent state hook
  App.jsx               # Main app logic + state
public/
  manifest.json         # PWA manifest
  sw.js                 # Service worker
```

## Privacy

- Your API key is stored **only in your browser's localStorage** — it is never sent to any third-party server
- Location data is sent directly to Google Places API from your device
- No analytics, no tracking, no backend
