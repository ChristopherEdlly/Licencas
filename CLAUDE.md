# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a client-side web dashboard for visualizing and tracking Brazilian public servants' leave schedules ("licenças prêmio"). The system processes Excel/CSV files containing employee data and calculates retirement proximity and leave urgency levels.

**Key characteristics:**
- Pure client-side processing (no backend) - all data processing happens in the browser
- **Hybrid architecture**: Vanilla JS dashboard + React Report Builder
- Hosted on GitHub Pages
- Brazilian Portuguese interface and date formats
- No data persistence (by design for security/privacy)
- Target: 300-2000 employee records

## Running Locally

**Dashboard (Vanilla JS - no build required):**
```bash
python -m http.server 3000
# OR
npx serve .
```
Then open `http://localhost:3000` in your browser.

**React Builder (requires build):**
```bash
npm install           # First time only
npm run dev          # Development server on port 5173
                     # Must be run from project root, NOT react-builder/
```

**Full production build:**
```bash
npm run build:gh-pages   # Builds React builder + copies static files to dist/
# OR use the shell script (recommended - handles proper order):
./build-local.sh         # Copies static files FIRST, then builds React
                        # This prevents Vite from clearing the dist/ folder
```

## Core Architecture

### Hybrid Architecture
This project uses a **two-part architecture**:

1. **Dashboard (Vanilla JS)** - Main application, no build step required
   - Pure ES6+ JavaScript, no frameworks
   - Works standalone, served directly as static files

2. **Report Builder (React)** - Advanced report builder, requires build step
   - React 18 + Vite build tool
   - Zustand for state management
   - react-grid-layout for drag & drop
   - Lives in `react-builder/` directory, builds to `dist/builder/`
   - Integrated via `builderBridge.js` (cross-window communication)

### Technology Stack

**Dashboard:**
- SheetJS (xlsx.full.min.js) - Excel/CSV parsing
- Chart.js - Data visualization
- jsPDF + html2canvas - PDF export
- Bootstrap Icons - Icon font
- localStorage for settings, IndexedDB for file caching

**React Builder:**
- React 18 + React DOM
- Vite (build tool)
- Zustand (state management)
- react-grid-layout (drag & drop)
- Chart.js (gráficos dinâmicos)

**Deployment:** Static files served via GitHub Pages with GitHub Actions workflow

### File Structure

```
/
├── index.html                    # Main dashboard entry point
├── package.json                  # NPM dependencies for React builder
├── vite.config.js               # Vite build configuration
├── build-local.sh               # Local build script
│
├── js/                          # Dashboard JavaScript (vanilla)
│   ├── dashboard.js             # Main orchestrator (DashboardMultiPage class)
│   ├── cronogramaParser.js      # Leave schedule parser (handles Brazilian date formats)
│   ├── builderBridge.js         # ⭐ Bridge between vanilla JS and React builder
│   ├── builderIntegration.js    # Builder initialization
│   ├── themeManager.js          # Dark/light theme (global singleton)
│   ├── settingsManager.js       # User settings (localStorage)
│   ├── utils/                   # Utility functions
│   ├── modules/                 # Feature modules (~20 managers)
│   └── core/                    # Business logic (pure functions, no DOM)
│
├── css/                         # Stylesheets
│   ├── new-styles.css           # Main stylesheet
│   ├── builder.css              # Builder integration styles
│   └── components/              # Component-specific styles
│
├── react-builder/               # ⭐ React Report Builder (separate app)
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── store/
│   │   │   └── builderStore.js  # Zustand state management
│   │   └── components/
│   │       ├── BuilderCanvas.jsx
│   │       ├── WidgetLibrary.jsx
│   │       ├── PropertiesPanel.jsx
│   │       ├── Toolbar.jsx
│   │       ├── Widget.jsx
│   │       └── widgets/         # ⭐ Widgets funcionais com dados reais
│   │           ├── ChartWidget.jsx    # Chart.js com 4 visualizações
│   │           ├── TableWidget.jsx    # Tabela com paginação/ordenação
│   │           ├── StatWidget.jsx     # Cards de estatísticas
│   │           └── TextWidget.jsx     # Blocos de texto editáveis
│
├── dist/                        # Build output (generated, not in git)
│   ├── index.html               # Dashboard (copied)
│   ├── css/                     # Styles (copied)
│   ├── js/                      # Scripts (copied)
│   └── builder/                 # React builder (built by Vite)
│       ├── index.html
│       └── assets/
│
└── .github/workflows/
    └── deploy.yml               # GitHub Actions deployment
```

**Key modules in js/modules/:**
- FileManager, FilterManager, AdvancedFilterManager, FilterChipsUI
- SmartSearchManager, ChartManager, CalendarManager
- ExportManager, ValidationManager, ErrorReporter
- KeyboardShortcutsManager, HighContrastManager
- NotificationManager, OperationalImpactAnalyzer
- TableSortManager, CacheManager, LoadingSkeletons

### Data Flow

**Dashboard (Main App):**
1. **File Upload** → FileManager converts Excel/CSV to CSV string
2. **Parsing** → CronogramaParser extracts employee records with leave periods
3. **Calculation** → Analyzers compute retirement dates and urgency levels
4. **Rendering** → Dashboard updates UI (tables, charts, calendars)
5. **Filtering** → FilterManager applies user filters to displayed data

**Builder Integration:**
1. User clicks "Report Builder" button → `builderBridge.openBuilder()` called
2. Bridge opens builder in iframe modal or new tab
3. Dashboard sends data to builder via `postMessage` API
4. Builder manipulates data, creates custom reports
5. Builder sends report back to dashboard via `postMessage`
6. Dashboard receives and displays/saves the report

### Key Classes

**CronogramaParser** (`js/cronogramaParser.js`)
- Interprets various Brazilian date formats (`jan/2025`, `Jan-25`, `06/2025`, `15/01/2025`, etc.)
- Handles both column-based formats (INICIO/FINAL) and text-based formats (CRONOGRAMA field)
- Returns array of `servidor` objects with parsed `licencas` array
- Flexible header matching (case-insensitive, accent-insensitive)

**DashboardMultiPage** (`js/dashboard.js`)
- Main application controller and singleton instance
- Manages page navigation (Home, Calendar, Timeline, Reports, Settings, Tips)
- Orchestrates all managers and modules via lazy initialization pattern
- Handles file uploads and data updates
- Key properties:
  - `allServidores` - Full dataset after parsing
  - `filteredServidores` - Currently filtered/displayed employees
  - `currentFilters` - Active filter state object
  - `charts` - Chart.js instances (urgency pie, timeline bar)
  - `notificacoes` / `filteredNotificacoes` - Notification tracking
  - `loadingProblems` - Parsing errors/warnings
  - Managers: `cacheManager`, `exportManager`, `validationManager`, `errorReporter`, `smartSearchManager`, `advancedFilterManager`, `filterChipsUI`, `keyboardShortcutsManager`, etc.

**Manager Initialization Pattern:**
All managers are initialized in `dashboard.init()` and stored as properties. Each manager receives `this` (dashboard reference) to enable cross-communication. Managers are conditionally initialized only if their classes are loaded (graceful degradation).

**BuilderBridge** (`js/builderBridge.js`)
- Singleton class that manages communication between vanilla JS dashboard and React builder
- Handles opening builder in iframe modal (default) or new tab
- Uses `postMessage` API for cross-window communication
- Key methods:
  - `openBuilder(options)` - Opens builder with optional data
  - `sendDataToBuilder(data)` - Sends dashboard data to builder
  - `onReportReceived(callback)` - Registers callback for when builder sends report back
  - `prepareDataForBuilder()` - Extracts current dashboard data for sending
- Global instance: `window.builderBridge`

## Date Format Handling

The parser must handle diverse Brazilian date formats:
- `jan/2025`, `fev/2026` (month/year - assumes day 1)
- `Jan-25`, `Feb-25` (month-year abbreviation)
- `06/2025` (numeric month/year)
- `15/01/2025` (full date)
- `15/01/2025 - 14/02/2025` (explicit period range)
- Empty cells (no leave scheduled)

**Critical:** Each "mês de licença" = exactly 30 days, not calendar month. 3 meses = 90 days.

## Retirement Calculation Logic

Brazilian public servant retirement rules (configurable in Settings):
- **By age:** Women 62+ (15y service), Men 65+ (15y service)
- **By points (2025):** Women 92, Men 102 (age + years of service)
- **Compulsory age:** 75 years (default, configurable)

**Urgency levels** based on time until retirement vs available leave:
- **Critical:** Leave ends ≤ 2 years before retirement
- **High:** Leave ends 2-5 years before retirement
- **Moderate:** Leave ends 5-7 years before retirement
- **Low:** Leave ends > 7 years before retirement

Thresholds are configurable in Settings page.

## Required Data Columns

**Mandatory:** `SERVIDOR` (employee name)

**Optional but used when present:**
- `CPF`, `DN` (birthdate), `SEXO`, `IDADE` (age)
- `ADMISSÃO` (admission date - for calculating service time)
- `MESES` (months of leave in this period)
- `Licença premio ja concedida` (months already granted)
- `Licença premio a conceder` (months to be granted)
- `LOTAÇÃO`, `SUPERINTENDENCIA`, `SUBSECRETARIA`, `CARGO`
- `Início Da licença` / `CRONOGRAMA` / `INICIO` (leave start)

The parser uses flexible header matching - column names are case-insensitive and accent-insensitive.

## Common Development Tasks

### Working with the Dashboard (Vanilla JS)

**Testing the Parser:**
```javascript
dashboard.parser.setDebug(true);
// Upload file and check console for detailed parsing logs
```

**Adding a New Manager/Module:**
1. Create the new manager class in `js/modules/YourManager.js`
2. Add `<script>` tag in `index.html` (order matters - add before `dashboard.js`)
3. Initialize in `dashboard.init()`:
   ```javascript
   if (typeof YourManager !== 'undefined') {
       this.yourManager = new YourManager(this);
       console.log('✅ YourManager inicializado');
   }
   ```
4. Add corresponding CSS if needed in `css/components/your-component.css`

**Debugging Charts:**
```javascript
window.dashboardChart       // Main urgency pie chart
dashboard.charts.timeline   // Timeline bar chart
```

### Working with the React Builder

**Development:**
```bash
npm run dev  # Run from PROJECT ROOT, not react-builder/
             # Vite dev server on http://localhost:5173
             # vite.config.js sets root: 'react-builder'
```

**Adding a New Component:**
1. Create component in `react-builder/src/components/YourComponent.jsx`
2. Import and use in `App.jsx` or other components
3. For global state, use Zustand store in `react-builder/src/store/builderStore.js`

**Testing Integration:**
```javascript
// In dashboard console (with dashboard loaded)
window.builderBridge.openBuilder({
    mode: 'iframe',
    data: window.dashboard.allServidores
});
```

### Building for Production

**Local build:**
```bash
./build-local.sh  # Builds everything to dist/
```

**Manual build steps:**
```bash
npm run build              # Builds React builder to dist/builder/
npm run copy-static        # Copies dashboard files to dist/
# OR
npm run build:gh-pages     # Does both in correct order

# IMPORTANT: Order matters!
# 1. copy-static creates dist/ and copies dashboard files
# 2. build compiles React to dist/builder/ (emptyOutDir: false prevents clearing)
```

**Deployment:**
- Push to `main` branch
- GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:
  1. Runs `npm ci` to install dependencies
  2. Runs `npm run build` (builds React to dist/builder/)
  3. Copies static files (dashboard) to dist/
  4. Deploys dist/ folder to GitHub Pages

## Page Structure

The application is a single-page app (SPA) with client-side routing via CSS classes:

**Pages (`.page-content` divs):**
1. **Home** (`#homePage`) - Overview with stats cards, urgency pie chart, server table
   - Has two views: `#cronogramaView` (default) and `#notificacoesView`
2. **Calendar** (`#calendarPage`) - Year-based heatmap showing leave intensity by day
3. **Timeline** (`#timelinePage`) - Bar chart with daily/monthly/yearly views
4. **Reports** (`#reportsPage`) - Report templates and custom report builder
5. **Settings** (`#settingsPage`) - Retirement rules, urgency thresholds, UI preferences
6. **Tips** (`#tipsPage`) - Keyboard shortcuts and usage tips

**Navigation:** Sidebar `.nav-link` elements toggle `.active` class on pages. Only one page visible at a time.

## Accessibility Features

The dashboard includes multiple accessibility enhancements:

1. **High Contrast Mode** - Increased color contrast ratios (WCAG AAA compliant)
   - Toggle via Settings or `Ctrl+Alt+H`
   - Persisted to localStorage

2. **Keyboard Shortcuts** - Full keyboard navigation via `KeyboardShortcutsManager`
   - `Ctrl+K` - Focus search
   - `Ctrl+D` - Toggle dark mode
   - `Ctrl+F` - Open filters
   - `Ctrl+1-5` - Navigate pages
   - `Escape` - Close modals

3. **ARIA attributes** - Proper roles, labels, and live regions
4. **Skip links** - "Pular para o conteúdo" at top
5. **Focus management** - Trapped focus in modals, restored focus on close
6. **Tooltips** - Can be disabled in Settings for screen reader users

## Important Constraints

1. **No server-side storage** - Processing is 100% client-side for data privacy
2. **Hybrid architecture** - Dashboard is vanilla JS (no frameworks), Builder is React (requires build)
3. **Brazilian Portuguese** - All UI text, date formats, error messages
4. **30-day months** - Leave calculations use 30-day periods, not calendar months
5. **Flexible input** - Must handle messy real-world Excel data with missing fields
6. **Script load order matters** - In dashboard: Utilities → Core → Modules → Dashboard (see `index.html` script tags)
7. **Builder is optional** - Dashboard works fully without React builder; builder provides advanced report creation only
8. **Cross-window communication** - Dashboard and builder communicate via `postMessage` API through `builderBridge.js`
9. **Build order is critical** - When building for production, static files must be copied to dist/ BEFORE running Vite build, otherwise Vite will clear dist/ even with `emptyOutDir: false` (see `build-local.sh` for correct order)
10. **Vite root configuration** - Vite's `root: 'react-builder'` means all npm scripts run from project root, not the react-builder subdirectory

## Browser Console Utilities

When dashboard is loaded, these globals are available for debugging:

```javascript
// Main instance
dashboard                    // Main DashboardMultiPage instance

// Data access
dashboard.allServidores      // Full employee dataset (array of servidor objects)
dashboard.filteredServidores // Currently filtered employees
dashboard.notificacoes       // Notification records
dashboard.loadingProblems    // Parsing errors/warnings

// Managers (check for undefined before using)
dashboard.parser             // CronogramaParser instance
dashboard.cacheManager       // IndexedDB cache manager
dashboard.exportManager      // Export functionality
dashboard.validationManager  // Data validation
dashboard.errorReporter      // Error tracking
dashboard.smartSearchManager // Smart search
dashboard.advancedFilterManager  // Advanced filters
dashboard.keyboardShortcutsManager  // Keyboard shortcuts

// Charts
dashboard.charts             // Object containing Chart.js instances
dashboard.charts.timeline    // Timeline bar chart
window.dashboardChart        // Main urgency pie chart (global)

// Settings
window.settingsManager       // Global settings manager
window.themeManager          // Global theme manager

// Builder Bridge
window.builderBridge         // Bridge to React builder
window.builderBridge.openBuilder({ data: dashboard.allServidores })  // Open builder
window.builderBridge.onReportReceived(data => console.log(data))     // Listen for reports

// Debug mode
dashboard.parser.setDebug(true)  // Enable verbose parsing logs
```

**LocalStorage Keys:**
- `dashboardSettings` - User settings (retirement rules, urgency thresholds)
- `theme` - Current theme (light/dark)
- `highContrastMode` - High contrast accessibility mode
- `tooltipsEnabled` - Tooltip display preference
- `animationsEnabled` - Animation preference
- `builderReports` - Saved reports from React builder (last 10)

**IndexedDB:**
- Database: `DashboardCache`
- Store: `files`
- Used for caching uploaded files with metadata (name, size, lastUsed)

## Data Structures

**Servidor Object (employee record):**
```javascript
{
  servidor: "Maria Silva",           // Name (mandatory)
  cpf: "123.456.789-00",            // CPF (optional)
  idade: 45,                         // Age (calculated or from IDADE column)
  dataNascimento: Date,              // Birth date (from DN column)
  sexo: "F",                         // Gender (from SEXO column)
  dataAdmissao: Date,                // Admission date (from ADMISSÃO)
  cargo: "Auditor Fiscal",           // Job title
  lotacao: "SUTRI",                  // Department
  superintendencia: "SUPER-X",       // Superintendency
  subsecretaria: "SUBSEC-Y",         // Subsecretariat

  // Leave information
  licencas: [                        // Array of leave periods
    {
      inicio: Date,                  // Start date
      fim: Date,                     // End date
      tipo: "prevista",              // Type: prevista, concedida, etc.
      descricao: "jan/2025 - mar/2025",  // Original text
      meses: 3                       // Duration in months (30-day periods)
    }
  ],

  // Calculated fields
  proximaLicenca: Date,              // Next leave start date
  aposentadoria: {
    dataCompulsoria: Date,
    dataIdade: Date,
    dataPontos: Date,
    maiorData: Date,                 // Earliest retirement date
    mensagem: "Aposentadoria por pontos em 01/2030"
  },
  urgencia: "critica" | "alta" | "moderada" | "baixa" | null,
  urgenciaInfo: {
    nivel: "critica",
    mesesDisponiveis: 18,
    mesesAteAposentadoria: 60
  },

  // Original row data (for debugging)
  originalData: { ... }
}
```

**Notification Object:**
```javascript
{
  servidor: "João Santos",
  processo: "SEI 12345/2024",
  primeiraNotificacao: "15/01/2025",
  segundaNotificacao: "20/02/2025",
  periodoEscolhido: "Mar/2025 - Mai/2025",
  lotacao: "SUTRI",
  status: "respondeu" | "pendente" | "nao-concorda"
}
```

## Documentation References

- **User Guide:** `docs/GUIA-DO-USUARIO.md` - End-user instructions
- **Developer Guide:** `docs/GUIA-DO-DESENVOLVEDOR.md` - Detailed function signatures and implementation notes
- **README:** `README.md` - Quick start and project overview
- Additional docs in `/docs/` - Sprint reports, roadmaps, bug tracking

## Known Edge Cases & Gotchas

**Parsing:**
- **Multiline CSV cells** - Simple CSV parser may fail; SheetJS library handles this during Excel import
- **Missing year in dates** - Parser uses conservative heuristics; may return empty array if ambiguous (e.g., "jan - fev" without year)
- **Cross-year periods** (Nov 2025 → Feb 2026) - Parser infers year rollover
- **Multiple date formats in same file** - Parser tries all patterns, first match wins
- **Empty/whitespace-only cells** - Treated as no leave scheduled
- **Mixed case headers** - All header matching is case-insensitive and accent-insensitive

**Performance:**
- **Large files (>5MB or >2000 rows)** - Performance may degrade; browser may freeze during parsing
- **Chart rendering** - Chart.js can be slow with 1000+ data points; consider aggregation
- **Memory usage** - IndexedDB cache stores full files; old entries auto-expire after 30 days of no use

**Data Quality:**
- **Multiple rows per employee** - System treats as separate leave periods for same person (not merged)
- **Duplicate employee names** - No deduplication; CPF not required so can't uniquely identify
- **Missing mandatory fields** - Rows without SERVIDOR field are skipped
- **Invalid dates** - Parser returns null/empty; row may be flagged in loadingProblems

**Browser Compatibility:**
- **IndexedDB unavailable** - Cache gracefully degrades; files not cached
- **localStorage full** - Settings may fail to save; no warning shown
- **Chart.js version** - Currently expects Chart.js v3+; v4 may have breaking changes

**Build System:**
- **Vite emptyOutDir: false** - Configured to NOT clear dist/ during build, but files should still be copied first as safeguard
- **Path resolution** - `builderBridge.js` detects correct builder path based on environment (development vs production/GitHub Pages)
- **Base path** - Vite uses `base: './'` for relative paths to work on GitHub Pages
- **GitHub Actions order** - Workflow builds React first, then copies static files (opposite of local script)
