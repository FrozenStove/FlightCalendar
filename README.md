# Flight Calendar

A secure Electron application that allows you to search for flights and add them to your calendar. Built with Electron, React, TypeScript, and Material-UI.

## Features

- 🔒 Secure API key storage using Electron's safeStorage
- ✈️ Search flights by flight number and date
- 📅 Generate and save .ics calendar files
- 🎨 Modern UI built with Material-UI
- 🔐 Follows Electron security best practices (contextIsolation, sandbox, no nodeIntegration)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A RapidAPI account with access to the Aerodatabox API

## Installation

1. Install dependencies:

```bash
npm install
```

## Configuration

1. Get your RapidAPI key from [RapidAPI](https://rapidapi.com/)
2. Subscribe to the [Aerodatabox API](https://rapidapi.com/aerodatabox/api/aerodatabox)
3. Launch the application and enter your API key in the Settings section

## Running the Application

### Development Mode

```bash
npm start
```

### Building for Production

```bash
npm run package
```

### Creating Distributables

```bash
npm run make
```

## Usage

1. **Set API Key**: Expand the "API Key Settings" accordion and enter your RapidAPI key, then click "Save"

2. **Search Flights**:
   - Enter a flight number (e.g., "AA123")
   - Select a departure date
   - Click "Search"

3. **Add to Calendar**:
   - Review the flight results
   - Click the "+" icon next to any flight to generate and save a calendar file

## Security

This application follows Electron security best practices:

- `contextIsolation: true` - Isolates the main world from the isolated world
- `sandbox: true` - Enables the Chromium sandbox
- `nodeIntegration: false` - Prevents Node.js access in renderer
- Secure preload script using `contextBridge`
- API keys encrypted using Electron's `safeStorage`

## Project Structure

```
FlightCalendar/
├── src/
│   ├── main.ts          # Main Electron process entry point
│   ├── main/            # Main process modules
│   │   ├── window.ts    # Window creation and lifecycle management
│   │   ├── apiKey.ts    # API key encryption/decryption handlers
│   │   ├── flightApi.ts # Flight data fetching and caching
│   │   ├── calendar.ts  # Google Calendar event generation
│   │   ├── cache.ts     # Cache utilities for flight data
│   │   ├── quota.ts     # API quota information extraction
│   │   └── store.ts     # Electron-store initialization
│   ├── renderer/        # Renderer process (React frontend)
│   │   ├── index.tsx    # React entry point
│   │   ├── App.tsx      # Main React component
│   │   ├── components/  # React components
│   │   │   ├── ApiKeySettings.tsx
│   │   │   ├── FlightSearchForm.tsx
│   │   │   ├── FlightResults.tsx
│   │   │   └── QuotaInfo.tsx
│   │   ├── hooks/       # Custom React hooks
│   │   │   ├── useApiKey.ts
│   │   │   └── useFlightSearch.ts
│   │   ├── types.ts     # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   │       └── flightUtils.ts
│   ├── preload.ts       # Secure preload script
│   ├── index.html       # HTML template
│   └── electron.d.ts    # TypeScript declarations
├── assets/              # Application assets (icons, etc.)
├── package.json
├── tsconfig.json
├── forge.config.ts      # Electron Forge configuration
├── vite.config.ts       # Vite configuration
├── vite.main.config.ts  # Vite main process config
├── vite.preload.config.ts  # Vite preload config
└── vite.renderer.config.ts  # Vite renderer config
```

### Code Organization

The codebase is organized into two main sections:

#### Main Process (`src/main/`)

- **`main.ts`**: Entry point that initializes all handlers
- **`main/window.ts`**: Handles window creation, lifecycle events, and icon loading
- **`main/apiKey.ts`**: Manages API key encryption/decryption using Electron's safeStorage
- **`main/flightApi.ts`**: Handles flight data fetching from Aerodatabox API, caching, and quota tracking
- **`main/calendar.ts`**: Generates Google Calendar URLs with rich flight information
- **`main/cache.ts`**: Provides caching utilities with 24-hour TTL
- **`main/quota.ts`**: Extracts and parses API quota information from response headers
- **`main/store.ts`**: Initializes electron-store for data persistence

#### Renderer Process (`src/renderer/`)

- **`renderer/index.tsx`**: React application entry point
- **`renderer/App.tsx`**: Main application component that orchestrates all UI components
- **`renderer/components/`**: Reusable React components
  - `ApiKeySettings.tsx`: API key configuration accordion
  - `FlightSearchForm.tsx`: Flight search form with date picker
  - `FlightResults.tsx`: List of flight search results
  - `QuotaInfo.tsx`: API quota information display
- **`renderer/hooks/`**: Custom React hooks for state management
  - `useApiKey.ts`: Manages API key loading and saving
  - `useFlightSearch.ts`: Handles flight search logic and state
- **`renderer/types.ts`**: TypeScript type definitions for the renderer
- **`renderer/utils/`**: Utility functions for data processing
  - `flightUtils.ts`: Flight data parsing and formatting utilities

## Technologies

- **Electron** - Desktop application framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Material-UI** - React component library
- **Electron Forge** - Build tooling
- **Vite** - Fast build tool and dev server
- **electron-store** - Data persistence
- **axios** - HTTP client
- **ics** - iCalendar file generation

## License

MIT
