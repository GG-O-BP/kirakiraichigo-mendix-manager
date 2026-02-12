---
name: build-check
description: 프론트엔드 + 백엔드 전체 빌드 및 린트 검증
disable-model-invocation: true
allowed-tools: Bash(cargo *), Bash(bun run build)
---

전체 프로젝트 빌드 상태를 검증한다.

1. `cd src-tauri && cargo clippy` — Rust 린트
2. `cd src-tauri && cargo test` — Rust 테스트
3. `bun run build` — Frontend 프로덕션 빌드

각 단계의 결과를 요약하고, 실패한 항목이 있으면 원인 분석과 수정 방안을 제시한다.
