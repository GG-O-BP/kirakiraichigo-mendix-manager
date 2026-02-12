---
name: migrate-to-rust
description: 프론트엔드 JavaScript 비즈니스 로직을 Rust Tauri 커맨드로 마이그레이션
argument-hint: [대상 함수/로직 설명]
disable-model-invocation: true
---

프론트엔드 로직 "$ARGUMENTS"을(를) Rust로 마이그레이션한다.

## 마이그레이션 절차

1. **분석**: 대상 JavaScript 로직의 입출력, 의존성, 사이드이펙트 파악
2. **Rust 구현**: 적절한 모듈에 Tauri 커맨드 작성
   - 기존 모듈 패턴 참고: `business_logic/`, `js_runtime/`, `state/`
   - `Result<T, String>` 반환, serde 직렬화
   - `#[cfg(test)]` 인라인 테스트 추가
3. **lib.rs 등록**: `invoke_handler!`에 새 커맨드 추가
4. **프론트엔드 교체**: 기존 JS 로직을 `invoke()` 호출로 교체
   - 데이터 페칭: `useSWR` + `SWR_KEYS`
   - 변이 작업: `useSWRMutation`
5. **검증**:
   - `cd src-tauri && cargo test`
   - `cd src-tauri && cargo clippy`
6. **정리**: 프론트엔드에서 불필요해진 코드 삭제
