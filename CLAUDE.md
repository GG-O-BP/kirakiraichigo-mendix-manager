# CLAUDE.md

## Project Overview

KiraKira Ichigo ("KiraIchi") — **Windows-only** Tauri 데스크톱 앱. Mendix Studio Pro 버전 관리, 로컬 앱 관리, 위젯 개발을 지원한다. Rust 백엔드(Tauri) + React 프론트엔드(함수형 프로그래밍) 구조.

## Commands

```bash
# Frontend
bun dev                          # Vite dev server (port 21420)
bun run build                    # Production build

# Tauri
bun tauri dev                    # 개발 모드 (bun dev 자동 실행)
bun tauri build                  # 프로덕션 빌드

# Rust
cd src-tauri && cargo test       # 전체 테스트
cd src-tauri && cargo test <name> # 단일 테스트
cd src-tauri && cargo clippy     # Lint
```

## Code Style — MUST Follow

### Ramda.js (IMPORTANT)

**모든 프론트엔드 코드에서 Ramda 사용이 필수.** 네이티브 JavaScript 메서드 대신 Ramda를 사용할 것.

- `import * as R from "ramda"` 형태로 import
- 조건문: `R.ifElse`, `R.when`, `R.cond` (not `if/else`)
- Null/Empty 체크: `R.isNil`, `R.isEmpty` (not `=== null`, `.length > 0`)
- 프로퍼티 접근: `R.prop`, `R.path`, `R.propOr`, `R.pathOr` (not dot notation)
- 배열 연산: `R.map`, `R.filter`, `R.find`, `R.reduce` (not native methods)
- 비교: `R.equals`, `R.propEq`, `R.gt`, `R.lt`
- 함수 합성: `R.pipe`, `R.compose`
- 기본값: `R.defaultTo` (not `|| default`)

기존 코드의 Ramda 패턴을 참고: `src/hooks/`, `src/contexts/`

### Self-Documenting Code

- **JSDoc 금지**, **인라인 주석 금지** — 명확한 네이밍으로 대체
- 예외: 복잡한 알고리즘이나 비직관적 비즈니스 로직에만 간략한 설명 허용

## Architecture — Key Decisions

### Frontend State Management (우선순위 순)

1. **Jotai atoms** (`src/atoms/`) — 모달 상태, 단순 UI 상태
2. **SWR** (`src/lib/swr.js`) — 서버 상태, 데이터 페칭 + 캐싱
3. **React Context** — 복합 상태 (버전, 앱, 위젯)
4. **nanostores** — i18n 로케일 전용

SWR 키는 반드시 `SWR_KEYS` (`src/lib/swr.js`)를 사용할 것. 변이 후 `mutate(SWR_KEYS.KEY)`로 revalidation.

### Frontend → Rust 마이그레이션 (진행 중)

복잡한 비즈니스 로직을 React에서 Rust Tauri 커맨드로 이전하는 중. 프론트엔드는 UI 렌더링에 집중, Rust가 연산과 상태를 처리.

- Collection 연산 → `js_runtime/`
- Validation → `business_logic/validation/`
- 상태 관리 → `state/` (Mutex 기반)
- editorConfig 평가 → `editor_config_parser/` (Boa JS 엔진)

### Hook Composition Pattern

Sub-hook은 단일 책임(상태/데이터 로딩/오퍼레이션). 합성 hook이 이들을 조합. 참고: `src/hooks/useVersions.js`

### i18n

`@nanostores/i18n` 사용. 로케일 파일: `src/i18n/locales/` (en, ko, ja). `useStore(messages)`로 번역 접근.

## Rust Development Rules

- 모든 Tauri 커맨드: `async fn` → `Result<T, String>` 반환
- `#[tauri::command]` 매크로 사용, `lib.rs`에 등록
- XML 파싱: `quick_xml` (문자열 검색 금지)
- 버전 비교: `semver` crate
- JS 실행: `boa_engine` (editorConfig.ts 평가용)
- 병렬 처리: `rayon`
- 반복: zip 패턴 선호 (인덱스 기반 지양)
- 테스트: 모듈 내 `#[cfg(test)]` 인라인

## Gotchas

- **Mendix 문서**: `https://docs.mendix.com` 대신 GitHub 소스를 사용할 것 — `https://github.com/mendix/docs/blob/development/content/en/docs`
- **Windows 경로**: Rust에서 `\\` 구분자 사용 (`C:\\Users\\...`)
- **Set → Array**: JavaScript `Set`을 Rust로 보내기 전 반드시 Array로 변환
- **Tauri invoke**: 항상 `await`. 데이터 페칭은 `useSWR`, 변이는 `useSWRMutation`
- **CSS**: LightningCSS 사용 (PostCSS 플러그인 사용 금지). Catppuccin 테마.
- **React 19**: concurrent features 활성화 상태
- **패키지 매니저**: 개발은 Bun. 위젯 빌드는 npm/pnpm/yarn/bun (사용자 선택)
- **Tauri 플러그인**: `@tauri-apps/plugin-dialog`, `plugin-fs`, `plugin-opener`, `plugin-os`, `plugin-shell`
- **스토리지**: 백엔드는 `%APPDATA%/kirakiraichigo-mendix-manager/app_state.json`에 네이티브 파일 I/O
- **Drag & Drop**: `@formkit/drag-and-drop`
