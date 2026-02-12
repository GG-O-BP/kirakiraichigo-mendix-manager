---
name: add-tauri-command
description: 새 Tauri 커맨드를 생성하고 등록하는 워크플로우
argument-hint: [command-name] [module-path]
disable-model-invocation: true
---

새 Tauri 커맨드 `$0`을(를) `src-tauri/src/$1` 모듈에 생성한다.

1. 해당 모듈 파일에 `#[tauri::command]` 함수 작성
   - `pub async fn` + `Result<T, String>` 반환
   - serde 직렬화 가능한 입출력 타입 정의
2. `src-tauri/src/lib.rs`의 `invoke_handler!`에 커맨드 등록
3. 프론트엔드에서 호출할 수 있도록 `invoke("$0", { ... })` 사용 예시 제시
4. `cd src-tauri && cargo clippy`로 린트 확인
5. 필요하면 `#[cfg(test)]` 인라인 테스트 추가
