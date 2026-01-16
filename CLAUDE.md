# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KiraKira Ichigo ("KiraIchi") is a Tauri-based desktop application for managing Mendix Studio Pro versions, local apps, and widget development. The project combines a Rust backend (via Tauri) with a React frontend using functional programming principles.

## Build & Development Commands

### Frontend (React + Vite)
- `bun dev` - Start Vite dev server (port 21420)
- `bun run build` - Build frontend for production
- `bun run preview` - Preview production build
- `bun test` - Run Vitest tests once
- `bun test:watch` - Run Vitest in watch mode

### Tauri Application
- `bun tauri dev` - Start Tauri app in development mode (auto-runs `bun dev`)
- `bun tauri build` - Build production executable (auto-runs `bun run build`)
- `bun tauri` - Access Tauri CLI directly

### Rust Backend
- Build: Handled automatically by Tauri commands
- Tests: Run from `src-tauri/` directory using `cargo test`
- Manual build: `cd src-tauri && cargo build`

## Architecture Overview

### Frontend Architecture (React + Ramda)

The frontend follows **functional programming** patterns using Ramda.js:

- **Pure functions**: All data transformations are pure functions in `src/utils/functional.js`
- **Immutable state**: State updates use Ramda lenses and immutable operations
- **No side effects**: Side effects are isolated to React hooks and Tauri invoke calls
- **Composition**: Complex operations built from composing simple, reusable functions

**Component Structure**:
- `src/App.jsx` - Main application state and orchestration
- `src/components/tabs/` - Main feature tabs (StudioProManager, WidgetManager, WidgetPreview)
- `src/components/modals/` - Modal dialogs (WidgetModal, BuildResultModal, DownloadModal)
- `src/components/common/` - Reusable UI components (TabButton, ConfirmModal, etc.)
- `src/components/functional/` - Exported functional components index

**State Management**:
- Single state object in App.jsx using React useState
- State updates via Ramda lenses (e.g., `R.set`, `R.over`, `R.lensPath`)
- Persistent state saved to Tauri storage via `save_to_storage` command
- Storage keys defined in `STORAGE_KEYS` constant
- Drag-and-drop reordering uses `@formkit/drag-and-drop` (widget/app list ordering persisted to storage)

**Data Flow**:
1. User action triggers event handler
2. Handler uses pure functions from `src/utils/functional.js`
3. Result invokes Rust backend via Tauri `invoke()`
4. Response processed through pure transformations
5. State updated immutably via Ramda

### Backend Architecture (Rust + Tauri)

The Rust backend is organized into **domain modules**, each exposing Tauri commands:

**Module Structure** (`src-tauri/src/`):
- `mendix/` - Studio Pro version/app management, installation detection
- `web_scraper/` - Downloads Mendix versions using headless Chrome (chromiumoxide)
- `widget_parser/` - Parses widget.xml, validates widget structure
- `widget_preview/` - Builds widgets for preview mode
- `build_deploy/` - Builds and deploys widgets to apps (parallel deployment via Rayon)
- `package_manager/` - Runs npm/pnpm/yarn commands for widget builds
- `storage/` - Persistent app state using Tauri's fs plugin
- `data_processing/` - Filtering, pagination, sorting for frontend data
- `config/` - Configuration types and defaults
- `utils/` - Shared utilities (file operations, etc.)

**Key Patterns**:
- **Pure data types**: Structs are immutable with derived Serialize/Deserialize
- **Command functions**: Each `#[tauri::command]` is registered in `lib.rs`
- **Parallel processing**: Widget deployment uses Rayon for concurrent file operations
- **Async operations**: Web scraping uses Tokio + chromiumoxide for browser automation

**Tauri Commands** are invoked from frontend via:
```javascript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { param: value });
```

All available commands are registered in `src-tauri/src/lib.rs` via `invoke_handler!`

### Frontend-Backend Communication

**Data Synchronization**:
- Frontend state persisted via `save_app_state` / `load_app_state` / `clear_app_state` commands
- Generic storage via `save_to_storage` / `load_from_storage` with key-value pairs
- Storage managed through `@tauri-apps/plugin-fs` (local app data directory)

**Filtering Pipeline**:
1. Frontend sends filter criteria to Rust commands (`filter_mendix_apps`, `filter_widgets`, etc.)
2. Rust performs filtering/sorting using `data_processing` module
3. Results returned to frontend for display
4. Pagination handled via `paginate_mendix_apps` / `paginate_mendix_versions`

## CSS Architecture

Uses **LightningCSS** for modern CSS features:
- Nested selectors enabled
- Custom media queries support
- CSS is in `src/styles/` with modular structure:
  - `base/` - Reset and base styles
  - `components/` - Component-specific styles
  - `themes/` - Catppuccin theme variants
  - `utilities/` - Utility classes
  - `fonts/` - Font imports (Maple Mono)

Theme system uses Catppuccin palette (`@catppuccin/palette`) with dynamic CSS variables.

## Widget Development Workflow

**Widget Build & Deploy**:
1. User selects widgets (from parsed widget list) and target apps
2. Frontend validates selections via `validateBuildDeploySelections`
3. Frontend calls `build_and_deploy_widgets` with widget paths, app paths, package manager
4. Rust backend:
   - Builds each widget sequentially (npm/pnpm build in widget directory)
   - Deploys .mpk files to multiple apps in parallel (Rayon)
   - Returns `BuildDeployResult` with successful/failed deployments

**Widget Preview**:
- Uses `build_widget_for_preview` command
- Builds widget without full deployment
- Displays in WidgetPreview tab

**Widget Properties**:
- Parsed from `widget.xml` via `parse_widget_properties` command
- Editor config parsed via `read_editor_config` command
- Validation via `validate_mendix_widget` command
- Properties stored in frontend state for editing

## Important Implementation Notes

### Functional Programming Guidelines
- Always use pure functions from `src/utils/functional.js` for transformations
- Never mutate state directly - use Ramda's `R.set`, `R.over`, `R.evolve`
- Keep side effects (invoke, console.log) out of pure functions
- Use `wrapAsync` helper to safely handle async operations with error logging

### Rust Development
- All commands must be async (`async fn`) and return `Result<T, String>`
- Use `#[tauri::command]` attribute and register in `lib.rs`
- Prefer pure data transformations - keep side effects explicit
- Use `rayon` for parallel operations on collections (e.g., batch file operations)
- For web scraping, use chromiumoxide's headless browser (already configured)

### State Persistence
- Important UI state is automatically saved to storage (selected apps, widgets, theme)
- Use `STORAGE_KEYS` constants when adding new persistent state
- Call `saveToStorage(key, value)` to persist, `loadFromStorage(key)` to retrieve
- Backend handles serialization/deserialization via serde_json

### Testing
- Frontend tests use Vitest + @testing-library/react
- Located alongside components or in `__tests__` directories
- Run tests before committing: `bun test`

### Package Manager Support
- **Development**: Uses Bun (v1.3.6) as the project package manager
- **Widget builds**: Application supports npm, pnpm, yarn, and bun for widget builds
- Package manager selection stored in state (`packageManager`)
- Commands executed via `run_package_manager_command` in Rust backend (uses `@tauri-apps/plugin-shell`)

## Common Gotchas

- **Windows paths**: Rust code uses Windows-specific paths (`C:\\...`). Use `\\` for path separators in Rust strings.
- **Set operations**: Frontend uses native JavaScript `Set` for selections. Convert to Array before sending to Rust (`setToArray` helper).
- **Async invoke**: Always `await` Tauri invoke calls and wrap in try-catch or use `wrapAsync` helper.
- **LightningCSS**: Vite config uses `lightningcss` as CSS transformer - don't use PostCSS plugins.
- **Theme CSS variables**: Defined dynamically in `styles/themes/` - use CSS vars like `var(--ctp-mocha-base)`.
- **React 19**: Frontend uses React 19.x with concurrent features - be aware of breaking changes from React 18.
- **Tauri plugins**: Uses `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-shell` - import from these packages, not from core API.
