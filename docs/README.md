# Trade Journal — Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Features Overview](#features-overview)
5. [User Guide](#user-guide)
6. [Data Architecture](#data-architecture)
7. [Configuration](#configuration)
8. [Import/Export](#importexport)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)
11. [Development](#development)
12. [Building for Distribution](#building-for-distribution)

---

## Introduction

### Purpose

Trade Journal is a **local-first desktop trading companion** designed for traders who prioritize data ownership, privacy, and performance analysis. Unlike cloud-based alternatives, all data resides exclusively on the user's machine.

### Goals

- **Privacy First** — No data leaves your machine unless you explicitly export it
- **Performance Tracking** — Comprehensive logging and analytics for continuous improvement
- **Local Storage** — All data stored in IndexedDB, no cloud dependency
- **Cross-Platform** — Built on Electron for Linux (with potential for other platforms)

### Scope

Primarily designed for **NSE (National Stock Exchange of India)** instruments including:
- Equities (Cash segment)
- Futures & Options (F&O)
- Currency derivatives
- Commodity derivatives

**Currently supports trades imported from Zerodha (Kite).** Additional broker integrations are planned for future releases.

However, the application is instrument-agnostic and can be adapted for any market.

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Linux (x64) |
| RAM | 4 GB |
| Disk Space | 200 MB |
| Display | 1024x768 minimum |

### Recommended Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Linux (x64) |
| RAM | 8 GB |
| Disk Space | 500 MB |
| Display | 1920x1080 or higher |

---

## Installation

### From Source

```bash
# Clone repository
git clone https://github.com/yourusername/trade-journal.git
cd trade-journal

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### From Release Build

```bash
# For AppImage
chmod +x trade-journal-x.x.x.AppImage
./trade-journal-x.x.x.AppImage

# For DEB package
sudo dpkg -i trade-journal-x.x.x.deb
```

---

## Features Overview

### Dashboard

The dashboard provides a **bird's-eye view** of your trading performance.

**Components:**
- **Summary Cards** — Key metrics: total P&L, win rate, total trades
- **Calendar Heatmap** — Visual representation of trading activity by date
- **Recent Activity** — Latest trades and journal entries

**Usage:**
Navigate to Dashboard via sidebar or press `Ctrl+1`

### Trade Log

The Trade Log is the **core of the application**, allowing comprehensive trade entry and management.

**Fields for each trade:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Symbol | String | Yes | Trading symbol (e.g., RELIANCE, NIFTY FUT) |
| Entry Price | Number | Yes | Price at which position was entered |
| Exit Price | Number | No | Price at which position was exited |
| Quantity | Number | Yes | Number of units/shares/contracts |
| Side | Enum | Yes | BUY or SELL |
| Entry Date | Date | Yes | Date of entry |
| Exit Date | Date | No | Date of exit |
| Strategy | String | No | Associated trading strategy |
| Notes | String | No | Additional notes |
| Brokerage | Number | No | Total brokerage charged |

**Position Size Calculator:**
Accessible from the Trade Log, helps calculate appropriate position size based on:
- Account capital
- Risk percentage per trade
- Stop loss distance

**Actions:**
- Add new trade (`Ctrl+N`)
- Edit existing trade
- Delete trade
- Export selected trades to PDF/Excel
- Filter by date range, symbol, strategy, side

### Journal

The Journal feature allows traders to **document their reasoning** and track context.

**Entry types:**
- **Trade Journal Entry** — Attached to a specific trade
- **General Journal Entry** — Free-form thoughts, market observations

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| Title | String | Brief description |
| Content | Rich Text | Detailed notes |
| Tags | Array | Categorization tags |
| Linked Trade | Reference | Optional link to trade |
| Date | DateTime | Entry timestamp |

### Analytics

Comprehensive **performance analysis** tools.

**Available Charts:**
- **Equity Curve** — Cumulative P&L over time
- **Monthly Returns** — Bar chart of monthly performance
- **Win/Loss Distribution** — Histogram of trade outcomes
- **Strategy Comparison** — Performance breakdown by strategy
- **Drawdown Analysis** — Maximum drawdown visualization

**Metrics Calculated:**
- Total P&L (Gross/Net)
- Win Rate
- Profit Factor
- Sharpe Ratio (if applicable)
- Maximum Drawdown
- Average Win/Loss
- expectancy
- Total Trades
- Average Risk per Trade

### Strategies

Create and manage **trading strategies** for performance tracking.

**Strategy fields:**
| Field | Type | Description |
|-------|------|-------------|
| Name | String | Strategy identifier |
| Description | String | Detailed description |
| Rules | Array | Entry/exit rules |
| Active | Boolean | Whether strategy is active |

**Usage:**
- Create strategies before or after trading
- Assign strategies to trades
- Compare performance across strategies

### Import/Export

**Import:**
The importer is designed to work with **Zerodha (Kite)** export CSV files with the following expected columns:
```
Symbol, Side, Quantity, Entry Price, Exit Price, Entry Date, Exit Date, Brokerage
```

**Export:**
- **Excel (.xlsx)** — Full data export including all fields
- **PDF** — Formatted report with tables (using jsPDF AutoTable)

### Settings

**Available settings:**
| Setting | Options | Default |
|---------|---------|---------|
| Theme | Dark / Light | Dark |
| Currency | INR, USD, etc. | INR |
| Date Format | DD/MM/YYYY, MM/DD/YYYY | DD/MM/YYYY |
| Default Strategy | String | None |

---

## Data Architecture

### Storage

All data is stored in **IndexedDB** via the **Dexie** library.

**Database Schema:**

```typescript
interface Trade {
  id?: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryDate: Date;
  exitDate?: Date;
  strategy?: string;
  brokerage?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface JournalEntry {
  id?: number;
  title: string;
  content: string;
  tags: string[];
  tradeId?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Strategy {
  id?: number;
  name: string;
  description: string;
  rules: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Settings {
  id?: number;
  key: string;
  value: any;
}
```

### Data Flow

```
User Input → React Component → Dexie (IndexedDB) → Persisted locally
```

**No network requests** for core data operations. All CRUD operations happen locally.

---

## Configuration

### Application Configuration

Located in `electron-builder.json`:

```json
{
  "appId": "com.tradejournal.app",
  "productName": "Trade Journal",
  "directories": {
    "buildResources": "build",
    "output": "release"
  },
  "linux": {
    "category": "Finance",
    "target": ["flatpak", "deb"]
  }
}
```

### Build Configuration

`electron.vite.config.ts` handles the build configuration for main, preload, and renderer processes.

### Environment Variables

| Variable | Purpose |
|---------|---------|
| `ELECTRON_RUN_AS_NODE` | Run Electron as Node.js (dev) |
| `ELECTRON_DISABLE_SANDBOX` | Disable sandbox (dev) |

---

## Import/Export

### CSV Import Format

The importer accepts CSV files with the following expected columns:

| Column | Required | Example |
|--------|----------|---------|
| Symbol | Yes | RELIANCE |
| Side | Yes | BUY |
| Quantity | Yes | 100 |
| Entry Price | Yes | 2500.50 |
| Exit Price | No | 2550.00 |
| Entry Date | Yes | 2024-01-15 |
| Exit Date | No | 2024-01-16 |
| Brokerage | No | 100 |

**Note:** Date format should be `YYYY-MM-DD` or `DD/MM/YYYY`.

### Excel Export

Excel export includes all trades with the following columns:
- Trade ID
- Symbol
- Side
- Quantity
- Entry Price
- Exit Price
- Entry Date
- Exit Date
- P&L (calculated)
- Brokerage
- Strategy
- Notes

### PDF Export

PDF exports generate formatted reports with:
- Header with date range
- Trade table with all details
- Summary statistics at bottom
- Branded footer

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Navigate to Dashboard |
| `Ctrl+2` | Navigate to Trade Log |
| `Ctrl+3` | Navigate to Journal |
| `Ctrl+4` | Navigate to Analytics |
| `Ctrl+5` | Navigate to Strategies |
| `Ctrl+6` | Navigate to Import/Export |
| `Ctrl+7` | Navigate to Settings |
| `Ctrl+N` | Open Add Trade dialog |
| `Ctrl+E` | Export current view |
| `Escape` | Close dialog/modal |

---

## Troubleshooting

### Common Issues

**Application doesn't start:**
```bash
# Check if dependencies are installed
npm install

# Verify Electron can run
npm run dev
```

**Build fails:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Data not persisting:**
- IndexedDB requires persistent storage
- Check disk space
- Verify file permissions on Linux

**Import fails:**
- Ensure CSV has correct headers
- Verify date formats match expected
- Check for encoding issues (use UTF-8)

### Logging

The application uses Electron's logging system. Logs are typically located at:
```
~/.config/trade-journal/logs/
```

### Resetting Data

To reset all data (dangerous!):
1. Close the application
2. Clear IndexedDB data via browser devtools
3. Restart application

---

## Development

### Project Structure

```
trade-journal/
├── src/
│   ├── main/              # Electron main process
│   │   └── index.ts       # Main entry point
│   ├── preload/           # Preload scripts (IPC bridge)
│   │   └── index.ts      # Preload entry
│   ├── components/        # Shared components
│   │   └── layout/       # AppShell, Sidebar, etc.
│   ├── features/          # Feature modules (self-contained)
│   │   ├── analytics/
│   │   ├── dashboard/
│   │   ├── import-export/
│   │   ├── journal/
│   │   ├── settings/
│   │   ├── strategies/
│   │   └── trades/
│   ├── hooks/             # Custom React hooks
│   │   ├── useTrades.ts
│   │   ├── useTheme.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── App.tsx            # Root component
│   └── index.css          # Global styles
├── public/                # Static assets
├── docs/                 # Documentation
├── electron.vite.config.ts
├── electron-builder.json
├── package.json
└── vite.config.ts
```

### Adding a New Feature

1. Create feature module under `src/features/`
2. Add feature component(s) in `components/` subdirectory
3. Create custom hooks if needed in `src/hooks/`
4. Add database schema if needed via Dexie
5. Register feature in `App.tsx`

### Adding a New Database Table

```typescript
// In src/db.ts or similar
import Dexie from 'dexie';

class TradeJournalDB extends Dexie {
  trades!: Table<Trade>;
  // Add new table
  myNewTable!: Table<MyNewType>;

  constructor() {
    super('TradeJournalDB');
    this.version(1).stores({
      trades: '++id, symbol, side, entryDate, strategy',
      // Add new table
      myNewTable: '++id, name, createdAt'
    });
  }
}
```

---

## Building for Distribution

### Linux Build Targets

> **⚠️ Note:** Flatpak builds are tested only on **Ubuntu**. Other distributions may require additional configuration or may not work correctly.

```bash
# AppImage (portable)
npm run build:linux

# DEB package (Debian/Ubuntu)
npm run build:deb

# Flatpak — tested on Ubuntu only
npm run build:flatpak
```

### Build Output

Built artifacts are placed in:
```
release/
├── linux-unpacked/   # Unpacked application
├── Trade Journal-x.x.x.AppImage
├── trade-journal-x.x.x.deb
└── trade-journal-x.x.x.flatpak  # Tested on Ubuntu only
```

### Code Signing

For production distribution, configure code signing in `electron-builder.json`:

```json
{
  "linux": {
    "target": ["AppImage", "deb"],
    "signAndFlashtagExecutable": true
  }
}
```

---

## Security Considerations

- **Local Storage Only** — No network transmission of user data
- **No Telemetry** — No analytics or tracking
- **Sandbox Disabled** (dev only) — Production builds run sandboxed
- **Input Validation** — All inputs validated via Zod schemas

---

## Future Roadmap

Potential enhancements (not guaranteed):
- [ ] Additional market support (BSE, US markets)
- [ ] Backtesting module
- [ ] Portfolio management
- [ ] Multi-device sync via encrypted backup
- [ ] Mobile companion app
- [ ] Advanced charting with TradingView integration

---

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

## License

MIT License. See [LICENSE](LICENSE) for details.