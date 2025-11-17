# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Client-side web dashboard for tracking Brazilian public servants' leave schedules ("licenças prêmio"). Processes Excel/CSV files to calculate retirement proximity and leave urgency levels.

**Key characteristics:**
- Pure vanilla JavaScript (no frameworks, no build step)
- 100% client-side processing (no backend)
- Hosted on GitHub Pages
- Brazilian Portuguese interface and date formats
- Target: 300-2000 employee records
- No data persistence by design (privacy/security)

## Running Locally

This is a static website with no build step required:

```bash
# Option 1: Python simple server
python -m http.server 3000

# Option 2: npx serve
npx serve .

# Option 3: Open index.html directly in browser
# (Some features like SharePoint auth may require a server)
```

Then open `http://localhost:3000` in your browser.

## Core Architecture

### Technology Stack

**Client-side only:**
- SheetJS (xlsx.full.min.js) - Excel/CSV parsing
- Chart.js - Data visualization
- jsPDF + html2canvas - PDF export
- Bootstrap Icons - Icon font
- MSAL.js - Microsoft Entra (Azure AD) authentication
- localStorage for settings, IndexedDB for file caching

**Deployment:** Static files served via GitHub Pages

### File Structure

```
/
├── index.html                # Main entry point
├── env.config.js             # Azure AD config (auto-generated, not in git)
│
├── js/                       # All JavaScript (vanilla ES6+)
│   ├── dashboard.js          # Main orchestrator (DashboardMultiPage class)
│   ├── cronogramaParser.js   # Leave schedule parser (Brazilian date formats)
│   ├── settingsManager.js    # User settings (localStorage)
│   ├── themeManager.js       # Dark/light theme (global singleton)
│   │
│   ├── core/                 # Business logic (pure functions)
│   │   ├── AposentadoriaAnalyzer.js
│   │   ├── DataParser.js
│   │   ├── LicencaCalculator.js
│   │   └── UrgencyAnalyzer.js
│   │
│   ├── utils/                # Utility functions
│   │   ├── DateUtils.js
│   │   ├── FormatUtils.js
│   │   ├── FuzzySearch.js
│   │   ├── ValidationUtils.js
│   │   └── customModal.js
│   │
│   └── modules/              # Feature modules (~27 managers)
│       ├── FileManager.js
│       ├── FilterManager.js
│       ├── AdvancedFiltersBuilder.js
│       ├── FilterChipsUI.js
│       ├── SmartSearchManager.js
│       ├── ChartManager.js
│       ├── CalendarManager.js
│       ├── ExportManager.js
│       ├── ValidationManager.js
│       ├── ErrorReporter.js
│       ├── CacheManager.js
│       ├── KeyboardShortcutsManager.js
│       ├── HighContrastManager.js
│       ├── LoadingSkeletons.js
│       ├── NotificationManager.js
│       ├── OperationalImpactAnalyzer.js
│       ├── ReportsManager.js
│       ├── TableSortManager.js
│       ├── UIManager.js
│       ├── BreadcrumbsManager.js
│       ├── ModalManager.js
│       ├── ImprovedTooltipManager.js
│       ├── SidebarManager.js
│       ├── AuthenticationManager.js      # Microsoft Entra auth via MSAL.js
│       ├── SharePointDataLoader.js       # Load Excel from SharePoint/OneDrive
│       └── SharePointLoadingUI.js        # Modern loading UX for SharePoint
│
├── css/
│   ├── new-styles.css        # Main stylesheet
│   ├── themes.css
│   ├── components/           # Component-specific styles (~15 files)
│   │   ├── ui-improvements.css
│   │   ├── smart-search.css
│   │   ├── advanced-filters-modal.css
│   │   ├── filter-chips.css
│   │   ├── keyboard-shortcuts.css
│   │   ├── loading-skeletons.css
│   │   ├── high-contrast.css
│   │   ├── custom-modal.css
│   │   ├── breadcrumbs.css
│   │   ├── tips-page.css
│   │   ├── reports-page.css
│   │   ├── widget-library.css
│   │   ├── sidebar-modelo.css
│   │   └── modelo-layout.css
│   └── utilities/
│
├── docs/
│   ├── GUIA-DO-USUARIO.md    # End-user instructions (Portuguese)
│   └── GUIA-DO-DESENVOLVEDOR.md  # Developer reference (Portuguese)
│
└── img/                      # Images and icons
```

### Data Flow

1. **File Upload** → FileManager converts Excel/CSV to CSV string
2. **Parsing** → CronogramaParser extracts employee records with leave periods
3. **Calculation** → Core analyzers (AposentadoriaAnalyzer, UrgencyAnalyzer) compute retirement dates and urgency levels
4. **Rendering** → Dashboard updates UI (tables, charts, calendars)
5. **Filtering** → FilterManager applies user filters to displayed data

**SharePoint Integration Flow:**
1. User authenticates via AuthenticationManager (MSAL.js popup)
2. User provides SharePoint/OneDrive link
3. SharePointDataLoader parses URL, searches user's drive, downloads Excel file
4. File passed to CronogramaParser (same flow as local upload)
5. SharePointLoadingUI provides visual feedback throughout

### Key Classes

**DashboardMultiPage** (`js/dashboard.js`)
- Main application controller and singleton instance
- Manages page navigation (Home, Calendar, Timeline, Reports, Settings, Tips)
- Orchestrates all managers via lazy initialization pattern in `init()`
- Key properties:
  - `allServidores` - Full dataset after parsing
  - `filteredServidores` - Currently filtered/displayed employees
  - `currentFilters` - Active filter state object
  - `charts` - Chart.js instances
  - `notificacoes` / `filteredNotificacoes` - Notification tracking
  - `loadingProblems` - Parsing errors/warnings
  - All managers as properties (e.g., `this.cacheManager`, `this.exportManager`)

**Manager Initialization Pattern:**
All managers are initialized in `dashboard.init()` and stored as instance properties. Each manager receives `this` (dashboard reference) to enable cross-communication. Managers are conditionally initialized only if their classes are loaded (graceful degradation).

**CronogramaParser** (`js/cronogramaParser.js`)
- Interprets various Brazilian date formats (`jan/2025`, `Jan-25`, `06/2025`, `15/01/2025`, etc.)
- Handles both column-based formats (INICIO/FINAL) and text-based formats (CRONOGRAMA field)
- Extracts years from column headers for better date inference
- Returns array of `servidor` objects with parsed `licencas` array
- Flexible header matching (case-insensitive, accent-insensitive)

**AuthenticationManager** (`js/modules/AuthenticationManager.js`)
- Handles Microsoft Entra (Azure AD) authentication using MSAL.js
- Manages user sessions, token acquisition, and UI state updates
- Requires configuration via `env.config.js` (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_REDIRECT_URI)
- Key methods:
  - `login()` - Initiates OAuth2 login flow with popup
  - `logout()` - Signs out user and clears tokens
  - `acquireToken(scopes)` - Gets access token for Microsoft Graph API
  - `isAuthenticated()` - Checks if user has active session
- Global instance: `window.authenticationManager` or `dashboard.authenticationManager`

**SharePointDataLoader** (`js/modules/SharePointDataLoader.js`)
- Loads Excel files from SharePoint/OneDrive via Microsoft Graph API
- Parses SharePoint URLs and searches for files in user's drive
- Downloads file content and passes to CronogramaParser
- Key methods:
  - `parseSharePointUrl(url)` - Extracts file info from SharePoint link
  - `findFileInDrive(fileName)` - Searches for file in user's OneDrive
  - `downloadFile(fileId)` - Downloads Excel file content
  - `loadFromSharePoint(url)` - Complete workflow: find → download → parse

**SharePointLoadingUI** (`js/modules/SharePointLoadingUI.js`)
- Modern visual feedback for SharePoint operations
- Loading overlays, progress bars, skeleton loaders, toast notifications
- Key methods:
  - `showGlobalLoading(message)` / `hideGlobalLoading()`
  - `showProgressBar(options)` / `updateProgress(percent)`
  - `showSuccess(message)` / `showError(message)`
  - `authenticateWorkflow(callback)` / `loadFileWorkflow(callback)`

## Date Format Handling

The parser must handle diverse Brazilian date formats:
- `jan/2025`, `fev/2026` (month/year - assumes day 1)
- `Jan-25`, `Feb-25` (month-year abbreviation)
- `06/2025` (numeric month/year)
- `15/01/2025` (full date DD/MM/YYYY)
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

## Script Load Order

**CRITICAL:** Script load order in `index.html` matters. The order is:

1. **External libraries** (XLSX.js, Chart.js, MSAL.js, jsPDF, html2canvas)
2. **Theme manager** (`js/themeManager.js`) - Must load first for global theme
3. **Core logic** (`js/core/*.js`) - Pure business logic functions
4. **Utilities** (`js/utils/*.js`) - Helper functions
5. **Modules** (`js/modules/*.js`) - Feature managers
6. **Main dashboard** (`js/dashboard.js`) - Orchestrator (must load last)

When adding a new manager:
1. Create file in `js/modules/YourManager.js`
2. Add `<script>` tag in `index.html` BEFORE `dashboard.js`
3. Initialize in `dashboard.init()`:
   ```javascript
   if (typeof YourManager !== 'undefined') {
       this.yourManager = new YourManager(this);
       console.log('✅ YourManager inicializado');
   }
   ```
4. Add corresponding CSS in `css/components/your-component.css` if needed

## Page Structure

Single-page app with client-side routing via CSS classes.

**Pages (`.page-content` divs):**
1. **Home** (`#homePage`) - Stats cards, urgency pie chart, server table
   - Two views: `#cronogramaView` (default) and `#notificacoesView`
2. **Calendar** (`#calendarPage`) - Year-based heatmap showing leave intensity
3. **Timeline** (`#timelinePage`) - Bar chart with daily/monthly/yearly views
4. **Reports** (`#reportsPage`) - Report templates and custom report builder
5. **Settings** (`#settingsPage`) - Retirement rules, urgency thresholds, UI preferences
6. **Tips** (`#tipsPage`) - Keyboard shortcuts and usage tips

**Navigation:** Sidebar `.nav-link` elements toggle `.active` class on pages.

## Accessibility Features

1. **High Contrast Mode** - WCAG AAA compliant (toggle via Settings or `Ctrl+Alt+H`)
2. **Keyboard Shortcuts** - Full keyboard navigation
   - `Ctrl+K` - Focus search
   - `Ctrl+D` - Toggle dark mode
   - `Ctrl+F` - Open filters
   - `Ctrl+1-5` - Navigate pages
   - `Escape` - Close modals
3. **ARIA attributes** - Proper roles, labels, live regions
4. **Skip links** - "Pular para o conteúdo" at top
5. **Focus management** - Trapped in modals, restored on close
6. **Tooltips** - Can be disabled in Settings for screen readers

## Important Constraints

1. **No build step** - Pure vanilla JavaScript, no frameworks or bundlers
2. **No server-side storage** - 100% client-side processing
3. **Brazilian Portuguese** - All UI text, date formats, error messages
4. **30-day months** - Leave calculations use 30-day periods, not calendar months
5. **Flexible input** - Must handle messy real-world Excel data with missing fields
6. **Script load order matters** - See "Script Load Order" section above

## Browser Console Utilities

When dashboard is loaded, these globals are available:

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
dashboard.advancedFiltersBuilder  // Visual filter builder
dashboard.keyboardShortcutsManager  // Keyboard shortcuts
dashboard.authenticationManager     // Microsoft auth
dashboard.sharePointDataLoader      // SharePoint file loader

// Charts
dashboard.charts             // Object containing Chart.js instances
dashboard.charts.timeline    // Timeline bar chart
window.dashboardChart        // Main urgency pie chart (global)

// Settings and theme
window.settingsManager       // Global settings manager
window.themeManager          // Global theme manager

// SharePoint
window.authenticationManager // Microsoft authentication
window.sharePointLoadingUI   // Modern loading UI utilities

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

## Known Edge Cases & Gotchas

**Parsing:**
- **Multiline CSV cells** - SheetJS library handles this during Excel import
- **Missing year in dates** - Parser uses conservative heuristics; may return empty array if ambiguous
- **Cross-year periods** (Nov 2025 → Feb 2026) - Parser infers year rollover
- **Multiple date formats in same file** - Parser tries all patterns, first match wins
- **Empty/whitespace-only cells** - Treated as no leave scheduled
- **Mixed case headers** - All header matching is case-insensitive and accent-insensitive

**Performance:**
- **Large files (>5MB or >2000 rows)** - Performance may degrade; browser may freeze during parsing
- **Chart rendering** - Chart.js can be slow with 1000+ data points
- **Memory usage** - IndexedDB cache stores full files; old entries auto-expire after 30 days

**Data Quality:**
- **Multiple rows per employee** - Treated as separate leave periods for same person (not merged)
- **Duplicate employee names** - No deduplication; CPF not required so can't uniquely identify
- **Missing mandatory fields** - Rows without SERVIDOR field are skipped
- **Invalid dates** - Parser returns null/empty; row may be flagged in loadingProblems

**Browser Compatibility:**
- **IndexedDB unavailable** - Cache gracefully degrades; files not cached
- **localStorage full** - Settings may fail to save; no warning shown
- **Chart.js version** - Currently expects Chart.js v3+; v4 may have breaking changes
