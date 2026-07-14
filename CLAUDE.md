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

**모든 프론트엔드 코드에서 Ramda 사용이 필수.** 원칙: **Ramda로 표현할 수 있는 것은 전부 Ramda로 작성한다.** 네이티브 JavaScript는 아래 예외 목록에 해당할 때만 허용된다.

- `import * as R from "ramda"` 형태로 import
- 조건문: `R.ifElse`, `R.when`, `R.unless`, `R.cond` (not `if/else`, `switch`, 데이터 삼항)
- JSX 조건 렌더링도 동일: `{cond && <X/>}`, `cond ? <X/> : null` 대신 `R.ifElse(pred, () => <X/>, R.always(null))` / `R.when` / `R.cond`
- Null/Empty 체크: `R.isNil`, `R.isNotNil`, `R.isEmpty`, `R.isNotEmpty` (not `=== null`, `.length > 0`)
- 프로퍼티 접근: `R.prop`, `R.path`, `R.propOr`, `R.pathOr` (not dot notation)
- 배열 연산: `R.map`, `R.filter`, `R.find`, `R.reduce` (not native methods)
- 문자열: `R.replace`, `R.split`, `R.trim`, `R.toLower`/`R.toUpper`, `R.test`, `R.match` (not 문자열 메서드)
- 비교: `R.equals`, `R.propEq`, `R.gt`, `R.lt`; 불리언 합성: `R.both`, `R.either`, `R.allPass`, `R.anyPass`, `R.not`, `R.complement`
- 산술(데이터 연산): `R.add`, `R.subtract`, `R.multiply`, `R.divide`, `R.inc`, `R.dec`
- 함수 합성: `R.pipe`, `R.compose`
- 기본값: `R.defaultTo` (not `|| default`, `?? default`)
- **비동기: `promise.then/catch`와 async `try/catch` 대신 `R.andThen`/`R.otherwise`/`R.pipeWith(R.andThen, [...])`** — 모범: `src/utils/storage.js`

**Ramda 예외 (표현 불가능한 것만 네이티브 허용):** 호스트 객체 조작(`window`/`document`/DOM의 쓰기·메서드 호출 — `window.location` 등), React hooks 호출, 함수·Tauri 커맨드 호출 자체, `Set`/`Map` 조작, JSX 문법과 파라미터 구조분해, 언어 구문(`import`/`async` 정의/`throw`), Ramda 대응 없는 내장(`JSON.*`, `Math.ceil/round/floor`, `String()`/`Number()`/`parseInt`), iframe 주입용 템플릿 리터럴 내부. 상세 목록은 `ramda-reference` 스킬 참고.

기존 코드의 Ramda 패턴 참고 (모범 파일): `src/utils/storage.js` (Promise 파이프라인), `src/atoms/widgetPreview.js`, `src/schemas/widgetPropertySchemas.js`

**전체 272개 함수 레퍼런스는 `ramda-reference` 스킬에 있다** (ramdajs.com/docs 0.32.0 전체를 카테고리별로 수록 + 네이티브→Ramda 치환표). 프론트엔드 코드를 작성·수정하기 전에 반드시 로드해서 적합한 함수를 고를 것.

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

`@nanostores/i18n` 사용. 로케일 파일: `src/i18n/locales/` (en, ko, ja). `useStore(messages)`로 번역 접근. 새 로케일 추가 시 `src/i18n/index.js`의 `SUPPORTED_LOCALES`와 `localeLoaders`에 모두 등록할 것.

## Rust Development Rules

- 모든 Tauri 커맨드: `async fn` → `Result<T, String>` 반환
- `#[tauri::command]` 매크로 사용, `lib.rs`에 등록
- XML 파싱: `quick_xml` (문자열 검색 금지). 속성 값은 `normalized_value(XmlVersion::Implicit1_0)` 사용 — `unescape_value()`는 0.40부터 deprecated
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
- **Vite 8 (Rolldown 기반)**: 번들러 옵션은 `build.rolldownOptions` 사용 (`rollupOptions`는 deprecated alias)
- **React 19**: concurrent features 활성화 상태
- **패키지 매니저**: 개발은 Bun. 위젯 빌드는 npm/pnpm/yarn/bun (사용자 선택)
- **Tauri 플러그인**: `@tauri-apps/plugin-dialog`, `plugin-fs`, `plugin-opener`, `plugin-os`, `plugin-shell`
- **스토리지**: 백엔드는 `%APPDATA%/kirakiraichigo-mendix-manager/app_state.json`에 네이티브 파일 I/O
- **Drag & Drop**: `@formkit/drag-and-drop`
