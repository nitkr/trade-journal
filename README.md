# Trade Journal

<div align="center">

![Trade Journal](public/icon.svg)

**Your personal, powerful, local-first trading companion for Zerodha & NSE**

> **Currently supports trades imported from Zerodha (Kite).** Additional broker integrations are planned for future releases.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform: Linux](https://img.shields.io/badge/Platform-Linux-blue.svg)](https://github.com/tradejournal/trade-journal)
[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848F.svg)](https://www.electronjs.org/)

</div>

---

## Overview

Trade Journal is a desktop application designed for traders who want complete control over their trading data. All your trade data stays locally on your machine — no cloud dependency, no account required, no data collection.

Whether you're trading equities, derivatives, or any other instruments on the NSE (National Stock Exchange of India) or other markets, Trade Journal provides a comprehensive toolkit to log trades, analyze performance, and refine your strategies.

---

## Features

### 📊 **Dashboard**
- Real-time overview of your trading performance
- Calendar heatmap visualization of trading activity
- Key metrics at a glance

### 📝 **Trade Log**
- Comprehensive trade entry with full details
- Position size calculator for risk management
- Advanced filtering and search
- Export capabilities to PDF/Excel

### 📓 **Journal**
- Document your trading decisions and reasoning
- Attach notes to specific trades or sessions
- Track emotional states and market context

### 📈 **Analytics**
- In-depth performance analysis with interactive charts
- Win/loss ratios and expectancy calculations
- Monthly/weekly/daily performance breakdowns
- Strategy performance comparison

### 🎯 **Strategies**
- Create and manage trading strategies
- Track performance per strategy
- Backtest concepts with historical data

### 🔄 **Import/Export**
- Import trades from CSV files
- Export data to Excel (.xlsx) or PDF
- Seamless migration from other platforms

### ⚙️ **Settings**
- Customizable preferences
- Theme support (dark/light)
- Data management tools

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron** | Cross-platform desktop runtime |
| **Vite** | Fast frontend build tooling |
| **React 19** | UI framework |
| **TypeScript** | Type-safe development |
| **Dexie** | Local IndexedDB wrapper |
| **Tailwind CSS** | Utility-first styling |
| **Radix UI** | Accessible UI primitives |
| **Recharts** | Charts and data visualization |
| **Zod** | Runtime type validation |
| **React Hook Form** | Form management |
| **jsPDF + AutoTable** | PDF export |
| **xlsx** | Excel export/import |
| **PapaParse** | CSV parsing |

---

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+ or pnpm 8+
- Linux (primary development platform)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/trade-journal.git
cd trade-journal

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building

> **Note:** Only Flatpak builds are tested on **Ubuntu**. Other distributions/builds may require additional configuration.

```bash
# Build for Linux (AppImage)
npm run build:linux

# Build for Linux (DEB package)
npm run build:deb

# Build for Linux (Flatpak) — tested on Ubuntu only
npm run build:flatpak
```

### Project Structure

```
trade-journal/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Preload scripts
│   ├── components/      # Shared UI components
│   │   └── layout/      # App shell and navigation
│   ├── features/        # Feature modules
│   │   ├── analytics/   # Analytics dashboard
│   │   ├── dashboard/   # Main dashboard
│   │   ├── import-export/ # Data import/export
│   │   ├── journal/     # Trading journal
│   │   ├── settings/    # App settings
│   │   ├── strategies/   # Strategy management
│   │   └── trades/      # Trade logging
│   ├── hooks/           # Custom React hooks
│   └── App.tsx          # Root component
├── public/              # Static assets
├── electron.vite.config.ts
├── electron-builder.json
└── package.json
```

---

## Data Storage

All trade data is stored locally using **IndexedDB** through the Dexie library. Your data never leaves your machine unless you explicitly export it.

| Data Type | Storage |
|-----------|---------|
| Trades | IndexedDB (local) |
| Journal Entries | IndexedDB (local) |
| Strategies | IndexedDB (local) |
| Settings | IndexedDB (local) |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Go to Dashboard |
| `Ctrl+2` | Go to Trade Log |
| `Ctrl+3` | Go to Journal |
| `Ctrl+4` | Go to Analytics |
| `Ctrl+5` | Go to Strategies |
| `Ctrl+6` | Go to Import/Export |
| `Ctrl+7` | Go to Settings |
| `Ctrl+N` | Open Add Trade dialog |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Credits

Special thanks to **Raju Ramdas** for his invaluable contributions and support for this project.

---

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI components from [Radix UI](https://radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)
