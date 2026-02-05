---
name: widget-dev-patterns
description: Mendix 위젯 개발 패턴. 위젯 파싱, 프리뷰, 빌드, 배포 작업 시 참고.
user-invocable: false
---

## Mendix 위젯 아키텍처

### 파싱 파이프라인
- widget.xml → `widget_parser/` (quick_xml로 파싱)
- editorConfig.ts → `editor_config_parser/` (Boa JS 엔진으로 실행)
- 프리뷰 빌드 → `widget_preview/` (metadata.rs + bundle.rs)

### 빌드/배포
- `build_deploy/` 모듈 — rayon으로 병렬 빌드
- `WidgetInput`, `AppInput`, `BuildDeployResult` 타입 참고: `build_deploy/types.rs`
- 패키지 매니저 전략: `package_manager/strategies/` (direct_node, fnm_simple 등)

### 프론트엔드 위젯 상태
- 위젯 컬렉션: `WidgetCollectionContext` + `src/atoms/collection.js`
- 위젯 프리뷰: `WidgetPreviewContext` + `src/atoms/widgetPreview.js`
- 위젯 폼: `WidgetFormContext` + `src/atoms/widgetForm.js`
- 빌드/배포: `BuildDeployContext` + `src/atoms/buildDeploy.js`
