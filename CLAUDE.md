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
- `bun test src/path/to/file.test.js` - Run a specific test file

### Tauri Application
- `bun tauri dev` - Start Tauri app in development mode (auto-runs `bun dev`)
- `bun tauri build` - Build production executable (auto-runs `bun run build`)
- `bun tauri` - Access Tauri CLI directly

### Rust Backend
- Build: Handled automatically by Tauri commands
- Tests: Run from `src-tauri/` directory using `cargo test`
- Manual build: `cd src-tauri && cargo build`

## Architecture Overview

### Frontend Architecture (React + Ramda + Context API)

The frontend follows **functional programming** patterns using Ramda.js with React Context for state distribution:

**Utils Structure** (`src/utils/`):
- `index.js` - Re-exports all utilities (import from `../utils` not individual files)
- `constants.js` - STORAGE_KEYS, PACKAGE_MANAGERS, ITEMS_PER_PAGE, VERSION_OPERATIONS
- `storage.js` - saveToStorage, loadFromStorage
- `validation.js` - invokeValidateRequired, invokeValidateBuildDeploySelections
- `versionState.js` - updateVersionLoadingStates, getVersionLoadingState
- `widgetHelpers.js` - invokeCreateWidget, invokeHasBuildFailures, invokeCreateCatastrophicErrorResult (all call backend)
- `async.js` - wrapAsync helper for error handling
- `setUtils.js` - arrayToSet, hasItems, setProperty
- `dataProcessing.js` - Re-exports from data-processing/ (backward compatible)
- `editorConfigParser.js` - Widget editor config parsing

**Data Processing Sub-Modules** (`src/utils/data-processing/`):
- `versionFiltering.js` - filterMendixVersions
- `appFiltering.js` - filterMendixApps, filterAndSortAppsWithPriority, filterAppsBySelectedPaths
- `widgetFiltering.js` - filterWidgets, filterWidgetsBySelectedIds, sortWidgetsByOrder, removeWidgetById
- `propertyCalculation.js` - initializePropertyValues, count* functions, transformPropertiesToSpec, countAllSpecGroupsVisibleProperties
- `pathUtils.js` - extractFolderNameFromPath

**Context API** (`src/contexts/`):
- `AppContext` - Apps state: filteredApps, selectedApps, handleAppClick, versionFilter
- `VersionsContext` - Version state: versions, downloadableVersions, versionLoadingStates, handleLaunchStudioPro, handleUninstallStudioPro
- `WidgetCollectionContext` - Widget CRUD: widgets, selectedWidgets, filteredWidgets, handleAddWidget
- `WidgetPreviewContext` - Preview state: selectedWidgetForPreview, properties, updateProperty
- `WidgetFormContext` - Widget form inputs: newWidgetCaption, newWidgetPath
- `BuildDeployContext` - Build/deploy state: packageManager, isBuilding, handleInstall/handleBuildDeploy
- `ModalContext` - Combined modal states (backward compatible)

**Domain-Specific Modal Contexts** (`src/contexts/modals/`):
- `StudioProModalContext` - Uninstall and download modals
- `AppModalContext` - App delete modal
- `WidgetModalContext` - Widget add/manage and delete modals
- `BuildModalContext` - Build result modal

**Hooks** (`src/hooks/`):
- `useCollection` - Generic collection hook for selection, filtering, persistence (used by useApps, useWidgets)
- `useApps` - Extends useCollection for Mendix apps
- `useWidgets` - Extends useCollection for widgets
- `useBuildDeploy` - Build/deploy operations with parameter-based handlers (no external dependencies)
- `useVersions` - Composition hook combining version sub-hooks (backward compatible)
- `useWidgetPreview` - Widget preview state
- `useTheme` - Theme selection and persistence
- `useVersionFiltering` - Version filtering, pagination, and display logic
- `useWidgetProperties` - Composition hook combining widget property sub-hooks (backward compatible)
- `usePreviewBuild` - Preview build state and execution

**Version Sub-Hooks** (`src/hooks/versions/`) - For granular control:
- `useVersionFilters` - Pure filter state (searchTerm, LTS/MTS/Beta toggles)
- `useVersionSelection` - Version selection with toggle behavior
- `useInstalledVersions` - Installed versions loading and filtering
- `useDownloadableVersions` - Downloadable versions fetching with pagination
- `useVersionOperations` - Operation handlers (launch, uninstall, download) with dependency injection

**Widget Property Sub-Hooks** (`src/hooks/widget-properties/`) - For granular control:
- `useWidgetDataLoader` - Widget definition, properties, and editor config loading
- `usePropertyVisibility` - Visible property keys and group counts calculation
- `usePropertyGroupUI` - Group expansion/collapse UI state

**Build/Deploy Sub-Hooks** (`src/hooks/build-deploy/`) - For granular control:
- `useBuildDeployState` - Loading states and results management
- `usePackageManagerPersistence` - Package manager preference persistence
- `useInstallOperation` - Install handler with dependency injection
- `useBuildDeployOperation` - Build/deploy handler with dependency injection

**Modal Hooks** (separated for single responsibility):
- `useUninstallModal` - Studio Pro uninstall confirmation
- `useAppDeleteModal` - App deletion confirmation
- `useWidgetModal` - Widget add/manage dialog
- `useWidgetDeleteModal` - Widget removal confirmation
- `useDownloadModal` - Version download dialog
- `useResultModal` - Build result display

**Data Flow**:
1. App.jsx initializes hooks via `useAppInitialization()` and `useContextValues()`
2. App.jsx wraps the app with Context providers (ModalProvider → VersionsProvider → AppProvider → etc.)
3. Tab components and modal components consume context directly via hooks like `useVersionsContext()`, `useAppContext()`, `useModalContext()`
4. Handlers invoke Rust backend via Tauri `invoke()`
5. State updates propagate through context - no prop drilling needed

**Tab Component Structure** (`src/components/tabs/`):

Each tab is split into focused subcomponents with a main orchestrator:

```
tabs/
├── studio-pro/
│   ├── StudioProManager.jsx      # Main orchestrator (~80 lines)
│   ├── DownloadableVersionsPanel.jsx
│   ├── InstalledVersionsPanel.jsx
│   └── AppsPanel.jsx
├── widget-manager/
│   ├── WidgetManager.jsx         # Main orchestrator (~60 lines)
│   ├── AppsSelectionPanel.jsx
│   ├── WidgetsSelectionPanel.jsx
│   ├── BuildDeploySection.jsx
│   └── InlineResults.jsx         # Build results display component
└── widget-preview/
    ├── WidgetPreview.jsx         # Main orchestrator (~80 lines)
    ├── WidgetSelectionPanel.jsx
    ├── PropertiesPanel.jsx
    ├── PreviewPanel.jsx
    ├── PreviewBuildControls.jsx  # Package manager + Run Preview button
    └── PropertyGroupAccordion.jsx
```

**Other Component Directories**:
- `src/components/modals/` - Modal dialogs with domain separation
  - `domain/` - Domain-specific modal groups that consume context directly (StudioProModals, AppDeleteModals, WidgetModals, BuildResultModals)
  - `AppModals.jsx` - Composition component combining all domain modals (no props - children consume context)
- `src/components/common/` - Reusable UI components (FilterCheckbox, LoadMoreIndicator, PackageManagerSelector, etc.)

### Backend Architecture (Rust + Tauri)

The Rust backend is organized into **domain modules**, each exposing Tauri commands:

**Module Structure** (`src-tauri/src/`):
- `mendix/` - Studio Pro version/app management, installation detection
- `web_scraper/` - Downloads Mendix versions using headless Chrome (chromiumoxide)
- `widget_parser/` - Parses widget.xml, validates widget structure, property transformation (parse_widget_properties_as_spec returns frontend-ready format)
- `widget_preview/` - Builds widgets for preview mode
- `build_deploy/` - Builds and deploys widgets to apps (parallel deployment via Rayon), create_catastrophic_error_result
- `package_manager/` - Runs npm/pnpm/yarn/bun commands for widget builds
- `storage/` - Persistent app state using Tauri's fs plugin
- `data_processing/` - Filtering, pagination, sorting for frontend data, create_widget
- `validation/` - Input validation (required fields, build/deploy selection checks)
- `formatting/` - Date formatting and text transformations

**Tauri Commands** are invoked from frontend via:
```javascript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { param: value });
```

All available commands are registered in `src-tauri/src/lib.rs` via `invoke_handler!`

## Ramda.js Usage Guidelines

**IMPORTANT**: Ramda.js must be used wherever applicable. Always prefer Ramda functions over native JavaScript methods.

**Required Ramda Patterns**:
- **Conditionals**: Use `R.ifElse`, `R.when`, `R.unless`, `R.cond` instead of `if/else` statements
- **Null checks**: Use `R.isNil`, `R.complement(R.isNil)` instead of `=== null` or `!== undefined`
- **Empty checks**: Use `R.isEmpty`, `R.complement(R.isEmpty)` instead of `.length > 0`
- **Property access**: Use `R.prop`, `R.path`, `R.propOr`, `R.pathOr` instead of dot notation or optional chaining
- **Array operations**: Use `R.map`, `R.filter`, `R.find`, `R.reduce`, `R.pluck` instead of native array methods
- **Comparisons**: Use `R.equals`, `R.propEq`, `R.gt`, `R.lt`, `R.gte`, `R.lte` for comparisons
- **Boolean logic**: Use `R.and`, `R.or`, `R.not`, `R.both`, `R.either`, `R.all`, `R.any`
- **Function composition**: Use `R.pipe`, `R.compose` for chaining operations
- **Side effects in pipes**: Use `R.tap` to execute side effects within `R.pipe`
- **Currying**: Use `R.curry` for creating reusable curried functions
- **Default values**: Use `R.defaultTo` instead of `|| defaultValue`
- **Array manipulation**: Use `R.append`, `R.prepend`, `R.concat`, `R.remove` for immutable array operations

**Common Patterns**:
```javascript
// Conditional rendering
R.ifElse(R.isNil, R.always(null), R.prop("component"))(data)

// Event handler with side effects
R.pipe(
  R.path(["target", "value"]),
  R.tap(setValue),
  R.tap(doSomething),
)

// Toggle selection
R.ifElse(
  R.propEq(currentId, "id"),
  R.always(null),
  R.always(newValue),
)(prevSelected)

// Safe property access with default
R.propOr([], "items", data)

// Find item by property
R.find(R.propEq(targetId, "id"), items)
```

**Import Convention**:
```javascript
import * as R from "ramda";
```

## Implementation Notes

### Functional Programming Guidelines
- Import utilities from `src/utils` (not individual files like `src/utils/constants.js`)
- Never mutate state directly - use Ramda's `R.set`, `R.over`, `R.evolve`
- Keep side effects (invoke, console.log) out of pure functions
- Use `wrapAsync` helper to safely handle async operations with error logging

### Hook Composition Pattern
When creating complex hooks, follow the composition pattern used by `useVersions`, `useWidgetProperties`, and `useBuildDeploy`:
```javascript
// Composition hook combines sub-hooks while maintaining backward compatibility
export function useVersions() {
  const filters = useVersionFilters();
  const installed = useInstalledVersions(filters.searchTerm);
  const operations = useVersionOperations({ onLoadVersions: installed.loadVersions });

  return { ...filters, ...installed, ...operations };
}

// useBuildDeploy example - state + persistence + operations
export function useBuildDeploy(options = {}) {
  const state = useBuildDeployState();
  const persistence = usePackageManagerPersistence();
  const install = useInstallOperation({ packageManager: persistence.packageManager, ... });
  const buildDeploy = useBuildDeployOperation({ ... });

  return { ...persistence, ...state, ...install, ...buildDeploy };
}
```
- Sub-hooks should have single responsibility (pure state, data loading, or operations)
- Use dependency injection via parameters for callbacks (e.g., `{ onLoadVersions }`)
- Composition hooks flatten returns for backward compatibility
- Handler wrapping (binding selections to handlers) happens in `useAppInitialization`, not in context value creation

### Rust Development
- All commands must be async (`async fn`) and return `Result<T, String>`
- Use `#[tauri::command]` attribute and register in `lib.rs`
- Use `rayon` for parallel operations on collections
- For web scraping, use chromiumoxide's headless browser (already configured)

### State Persistence
- Use `STORAGE_KEYS` constants when adding new persistent state
- Call `saveToStorage(key, value)` to persist, `loadFromStorage(key)` to retrieve
- Backend handles serialization/deserialization via serde_json

### CSS Architecture
- Uses **LightningCSS** (not PostCSS) - configured in Vite
- CSS in `src/styles/` with modular structure: base/, components/, themes/, utilities/
- Theme system uses Catppuccin palette with dynamic CSS variables

## Common Gotchas

- **Windows paths**: Rust code uses Windows-specific paths (`C:\\...`). Use `\\` for path separators in Rust strings.
- **Set operations**: Frontend uses native JavaScript `Set` for selections. Convert to Array before sending to Rust.
- **Async invoke**: Always `await` Tauri invoke calls and wrap in try-catch or use `wrapAsync` helper.
- **LightningCSS**: Don't use PostCSS plugins - Vite config uses `lightningcss` as CSS transformer.
- **React 19**: Frontend uses React 19.x with concurrent features - be aware of breaking changes from React 18.
- **Tauri plugins**: Uses `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-shell` - import from these packages, not from core API.
- **Package Manager**: Development uses Bun; widget builds support npm, pnpm, yarn, bun (user-selectable).
