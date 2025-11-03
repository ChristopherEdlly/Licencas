# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a client-side web dashboard for visualizing and tracking Brazilian public servants' leave schedules ("licenças prêmio"). The system processes Excel/CSV files containing employee data and calculates retirement proximity and leave urgency levels.

**Key characteristics:**
- Pure client-side processing (no backend) - all data processing happens in the browser
- Hosted on GitHub Pages
- Brazilian Portuguese interface and date formats
- No data persistence (by design for security/privacy)
- Target: 300-2000 employee records

## Running Locally

**Development server:**
```bash
python -m http.server 3000
# OR
npx serve .
```

Then open `http://localhost:3000` in your browser.

**No build step required** - this is a vanilla HTML/CSS/JavaScript application. Simply open `index.html` in a browser or serve the directory.

## Core Architecture

### Technology Stack
- **No build tools** - Pure vanilla JavaScript (ES6+), no transpilation or bundling
- **External libraries:**
  - SheetJS (xlsx.full.min.js) - Excel/CSV parsing
  - Chart.js - Data visualization
  - jsPDF + html2canvas - PDF export
  - Bootstrap Icons - Icon font
- **Storage:** localStorage for settings, IndexedDB for file caching (optional)
- **Deployment:** Static files served via GitHub Pages

### File Structure

```
js/
├── cronogramaParser.js       # Main parser - interprets leave schedules from various date formats
├── dashboard.js              # Main orchestrator (DashboardMultiPage class) - coordinates all managers
├── themeManager.js           # Dark/light theme management (global singleton)
├── settingsManager.js        # User settings persistence (localStorage)
├── customDatePicker.js       # Custom date picker component
├── customTooltip.js          # Tooltip system
├── utils/
│   ├── DateUtils.js         # Date parsing/formatting utilities
│   ├── ValidationUtils.js   # Input validation
│   ├── FormatUtils.js       # Display formatting
│   └── FuzzySearch.js       # Fuzzy search algorithm
├── modules/                  # Feature modules (instantiated by dashboard.js)
│   ├── FileManager.js       # File upload, Excel→CSV conversion via SheetJS
│   ├── FilterManager.js     # Basic search and filtering
│   ├── AdvancedFilterManager.js  # Complex multi-field filtering
│   ├── FilterChipsUI.js     # Visual filter chips display
│   ├── SmartSearchManager.js     # Smart search with autocomplete
│   ├── ChartManager.js      # Chart.js wrapper for urgency pie chart
│   ├── CalendarManager.js   # Calendar heatmap view
│   ├── ModalManager.js      # Modal dialogs
│   ├── UIManager.js         # UI state and animations
│   ├── TableSortManager.js  # Table sorting logic
│   ├── CacheManager.js      # IndexedDB file caching
│   ├── ValidationManager.js # Data validation rules
│   ├── ErrorReporter.js     # Error collection and reporting
│   ├── ExportManager.js     # CSV/Excel/PDF export
│   ├── ReportsManager.js    # Reports page orchestration
│   ├── ReportBuilderPremium.js  # Advanced report builder
│   ├── builder-integration.js   # ES6 module integration for report builder
│   ├── KeyboardShortcutsManager.js  # Global keyboard shortcuts
│   ├── LoadingSkeletons.js  # Loading state UI
│   ├── HighContrastManager.js    # Accessibility high contrast mode
│   ├── BreadcrumbsManager.js     # Navigation breadcrumbs
│   ├── NotificationManager.js    # Notification center
│   ├── OperationalImpactAnalyzer.js  # Impact analysis
│   └── ImprovedTooltipManager.js     # Enhanced tooltip system
└── core/                     # Business logic (pure functions, no DOM)
    ├── DataParser.js        # Data extraction from CSV rows
    ├── LicencaCalculator.js # Leave period calculations (30-day months)
    ├── UrgencyAnalyzer.js   # Urgency level calculation based on retirement proximity
    └── AposentadoriaAnalyzer.js  # Retirement eligibility calculations

css/
├── new-styles.css           # Main stylesheet
├── report-builder-premium.css  # Report builder styles
├── reports-builder.css      # Reports page styles
├── components/              # Component-specific styles
│   ├── smart-search.css
│   ├── advanced-filters.css
│   ├── filter-chips.css
│   ├── keyboard-shortcuts.css
│   ├── loading-skeletons.css
│   ├── high-contrast.css
│   ├── breadcrumbs.css
│   ├── notification-center.css
│   ├── reports-page.css
│   └── tips-page.css
└── utilities/               # Utility classes (if needed)
```

### Data Flow

1. **File Upload** → FileManager converts Excel/CSV to CSV string
2. **Parsing** → CronogramaParser extracts employee records with leave periods
3. **Calculation** → Analyzers compute retirement dates and urgency levels
4. **Rendering** → Dashboard updates UI (tables, charts, calendars)
5. **Filtering** → FilterManager applies user filters to displayed data

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

### Testing the Parser

Open browser console and enable debug mode:
```javascript
dashboard.parser.setDebug(true);
// Upload file and check console for detailed parsing logs
```

### Modifying Urgency Thresholds

Defaults are in `js/settingsManager.js`. Users can adjust via Settings page (persisted to localStorage).

### Adding New Date Formats

Add parsing logic to `CronogramaParser.parseCronograma()` handlers in `js/cronogramaParser.js`. The parser uses a chain-of-responsibility pattern - first handler that successfully parses wins.

### Debugging Chart Issues

Charts are managed by Chart.js. Access instances:
```javascript
window.dashboardChart  // Main urgency pie chart
dashboard.charts.timeline  // Timeline bar chart
```

Theme changes auto-update charts via ThemeManager.

### Adding a New Manager/Module

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
5. Link CSS in `index.html` `<head>`

### Working with Filters

The system has three filter layers:
1. **Basic search** (`FilterManager`) - Text search in header
2. **Advanced filters** (`AdvancedFilterManager`) - Multi-field sidebar filters (cargo, lotação, superintendência, urgency, status)
3. **Filter chips** (`FilterChipsUI`) - Visual representation of active filters

All filter changes flow through `dashboard.applyAllFilters()` which updates `filteredServidores` and triggers UI refresh.

### Export System

`ExportManager` handles three export formats:
- **Excel (.xlsx)** - Uses SheetJS to generate binary workbook
- **CSV** - Simple comma-separated format
- **PDF** - Uses jsPDF + html2canvas to capture DOM elements

Reports page has an advanced export configuration modal with preview.

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
2. **No frameworks** - Vanilla JS only (GitHub Pages compatibility requirement)
3. **Brazilian Portuguese** - All UI text, date formats, error messages
4. **30-day months** - Leave calculations use 30-day periods, not calendar months
5. **Flexible input** - Must handle messy real-world Excel data with missing fields
6. **Script load order matters** - Utilities → Core → Modules → Dashboard (see `index.html` script tags)

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

// Debug mode
dashboard.parser.setDebug(true)  // Enable verbose parsing logs
```

**LocalStorage Keys:**
- `dashboardSettings` - User settings (retirement rules, urgency thresholds)
- `theme` - Current theme (light/dark)
- `highContrastMode` - High contrast accessibility mode
- `tooltipsEnabled` - Tooltip display preference
- `animationsEnabled` - Animation preference

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
