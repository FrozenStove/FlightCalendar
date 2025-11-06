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
│   ├── main.ts          # Main Electron process
│   ├── preload.ts       # Secure preload script
│   ├── renderer.tsx     # React entry point
│   ├── App.tsx          # Main React component
│   ├── index.html       # HTML template
│   └── electron.d.ts    # TypeScript declarations
├── package.json
├── tsconfig.json
├── forge.config.ts      # Electron Forge configuration
├── vite.config.ts       # Vite configuration
├── vite.main.config.ts  # Vite main process config
├── vite.preload.config.ts  # Vite preload config
└── vite.renderer.config.ts  # Vite renderer config
```

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
