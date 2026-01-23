# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KiraKira Ichigo ("KiraIchi") is a **Windows-only** Tauri-based desktop application for managing Mendix Studio Pro versions, local apps, and widget development. The project combines a Rust backend (via Tauri) with a React frontend using functional programming principles.

## Build & Development Commands

### Frontend (React + Vite)
- `bun dev` - Start Vite dev server (port 21420)
- `bun run build` - Build frontend for production
- `bun run preview` - Preview production build
- `bun test` - Run Vitest tests once
- `bun test:watch` - Run Vitest in watch mode
- `bun test <file>` - Run specific test file

### Tauri Application
- `bun tauri dev` - Start Tauri app in development mode (auto-runs `bun dev`)
- `bun tauri build` - Build production executable (auto-runs `bun run build`)

### Rust Backend
- Tests: `cd src-tauri && cargo test`
- Single test: `cd src-tauri && cargo test test_name`
- Manual build: `cd src-tauri && cargo build`
- Lint: `cd src-tauri && cargo clippy`

## Architecture Overview

### Frontend (React + Ramda + Context API)

**Key Architectural Patterns**:
- Functional programming with Ramda.js - **mandatory for all code**
- React Context for state distribution (no prop drilling)
- Hook composition pattern for complex state management
- Self-documenting code - minimize comments through clear naming

**Import Conventions**:
- Import utilities from `src/utils` (e.g., `import { STORAGE_KEYS, wrapAsync } from "../utils"`)
- Import data processing from specific modules: `import { filterMendixApps } from "../utils/data-processing/appFiltering"`
- Import Ramda as namespace: `import * as R from "ramda"`

**Data Flow**:
1. `App.jsx` initializes hooks via `useAppInitialization()` and `useContextValues()`
2. Context providers wrap the app in this order:
   - Modal contexts (ModalProvider → StudioProModalProvider → AppModalProvider → WidgetModalProvider → BuildModalProvider)
   - Data contexts (VersionsProvider → AppProvider → WidgetCollectionProvider → WidgetPreviewProvider → WidgetFormProvider → BuildDeployProvider)
3. Components consume context via hooks like `useVersionsContext()`, `useAppContext()`
4. Handlers invoke Rust backend via Tauri `invoke()`

**Hook Composition Pattern**:
```javascript
// Composition hook combines sub-hooks
export function useVersions() {
  const filters = useVersionFilters();
  const installed = useInstalledVersions(filters.searchTerm);
  const operations = useVersionOperations({ onLoadVersions: installed.loadVersions });
  return { ...filters, ...installed, ...operations };
}
```
- Sub-hooks have single responsibility (pure state, data loading, or operations)
- Use dependency injection via parameters for callbacks
- Handler wrapping happens in `useAppInitialization`, not in context value creation

### Backend (Rust + Tauri)

**Module Structure** (`src-tauri/src/`):
- `mendix/` - Studio Pro version/app management
  - `models.rs` - MendixVersion, MendixApp structs
  - `scanner.rs` - Directory scanning, version extraction
  - `paths.rs` - Path constants and construction
  - `execution.rs` - Process execution, Tauri commands
- `web_scraper/` - Mendix versions download (chromiumoxide headless browser)
  - `config.rs` - Constants, timeouts, URLs
  - `browser.rs` - BrowserSession lifecycle management
  - `parsing.rs` - HTML/datagrid parsing
  - `download.rs` - File download, installer execution
- `widget_parser/` - widget.xml parsing, property transformation
- `widget_preview/` - Widget preview build operations
  - `metadata.rs` - WidgetMetadata parsing, XML id extraction (uses quick_xml)
  - `bundle.rs` - Widget bundle file reading
  - `mod.rs` - Tauri command (build_widget_for_preview)
- `build_deploy/` - Widget build and deployment (parallel via Rayon)
  - `types.rs` - WidgetInput, AppInput, BuildDeployResult structs
  - `transform.rs` - Widget/app transformation and extraction functions
  - `mod.rs` - Tauri commands and orchestration
- `package_manager/` - npm/pnpm/yarn/bun command execution
  - `strategies/` - Execution strategies (direct_node, fnm_simple, powershell_fnm, etc.)
  - `executor.rs` - Strategy execution
  - `widget_operations.rs` - Widget install/build operations
- `storage/` - Persistent state (Tauri fs plugin)
- `data_processing/` - Filtering, pagination, sorting, generic utilities
  - `widget.rs` - Widget struct and creation
  - `extractors.rs` - MendixVersion/MendixApp field extractors
  - `mendix_filters.rs` - Tauri filter commands
  - `version_utils.rs` - Version comparison and filtering utilities
- `validation/` - Input validation
- `formatting/` - Date formatting, version status/badge text
- `config/` - Package manager configuration types
- `utils/` - Path utilities, widget copy operations

**Tauri Commands**:
```javascript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { param: value });
```
All commands registered in `src-tauri/src/lib.rs` via `invoke_handler!`

## Ramda.js Usage Guidelines

**IMPORTANT**: Ramda.js must be used wherever applicable. Always prefer Ramda functions over native JavaScript methods.

**Required Patterns**:
- **Conditionals**: `R.ifElse`, `R.when`, `R.unless`, `R.cond` (not `if/else`)
- **Null checks**: `R.isNil`, `R.complement(R.isNil)` (not `=== null`)
- **Empty checks**: `R.isEmpty`, `R.complement(R.isEmpty)` (not `.length > 0`)
- **Property access**: `R.prop`, `R.path`, `R.propOr`, `R.pathOr` (not dot notation)
- **Array operations**: `R.map`, `R.filter`, `R.find`, `R.reduce`, `R.pluck` (not native methods)
- **Comparisons**: `R.equals`, `R.propEq`, `R.gt`, `R.lt`, `R.gte`, `R.lte`
- **Boolean logic**: `R.and`, `R.or`, `R.not`, `R.both`, `R.either`, `R.all`, `R.any`
- **Function composition**: `R.pipe`, `R.compose`
- **Side effects in pipes**: `R.tap`
- **Currying**: `R.curry`
- **Default values**: `R.defaultTo` (not `|| defaultValue`)
- **Array manipulation**: `R.append`, `R.prepend`, `R.concat`, `R.remove`

**Common Patterns**:
```javascript
// Import convention
import * as R from "ramda";

// Conditional rendering
R.ifElse(R.isNil, R.always(null), R.prop("component"))(data)

// Event handler with side effects
R.pipe(R.path(["target", "value"]), R.tap(setValue), R.tap(doSomething))

// Toggle selection
R.ifElse(R.propEq(currentId, "id"), R.always(null), R.always(newValue))(prevSelected)

// Safe property access with default
R.propOr([], "items", data)
```

## Implementation Notes

### Self-Documenting Code
- **No JSDoc comments** - Function and parameter names should be descriptive enough
- **No inline comments** - Code logic should be self-explanatory through clear naming
- **Descriptive naming** - Use names like `processAppsPipeline`, `useVersionFilters`, `handleBuildDeploy`
- **Exception**: Complex algorithms or non-obvious business logic may have brief explanations

### State Persistence
- Use `STORAGE_KEYS` constants for persistent state
- `saveToStorage(key, value)` / `loadFromStorage(key)` for frontend
- Backend uses serde_json for serialization

### Rust Development
- All commands: `async fn` returning `Result<T, String>`
- Use `#[tauri::command]` and register in `lib.rs`
- Use `rayon` for parallel operations
- Use `quick_xml` for XML parsing (not string search)
- Use `semver` crate for version comparisons
- Prefer zip pattern over index-based iteration for safety
- Tests are inline in modules using `#[cfg(test)]` (see `widget_parser/mod.rs`, `formatting/mod.rs`, etc.)

### CSS Architecture
- Uses **LightningCSS** (not PostCSS)
- CSS in `src/styles/` with modular structure
- Theme system uses Catppuccin palette with CSS variables

## Common Gotchas

- **Windows paths**: Rust uses `C:\\...` format. Use `\\` for path separators.
- **Set operations**: Convert JavaScript `Set` to Array before sending to Rust.
- **Async invoke**: Always `await` Tauri invoke calls; use `wrapAsync` helper for error handling.
- **LightningCSS**: Don't use PostCSS plugins - Vite config uses lightningcss as CSS transformer.
- **React 19**: Frontend uses React 19.x with concurrent features.
- **Tauri plugins**: Import from `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-shell`. Backend storage uses native Rust filesystem operations to `%APPDATA%/kirakiraichigo-mendix-manager/app_state.json`.
- **Package Manager**: Development uses Bun; widget builds support npm, pnpm, yarn, bun (user-selectable).
- **State Management**: Uses nanostores for i18n (`@nanostores/i18n`, `@nanostores/react`).
