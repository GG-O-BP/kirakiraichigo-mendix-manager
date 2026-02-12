---
name: fix-issue
description: GitHub 이슈를 분석하고 수정
argument-hint: [issue-number]
disable-model-invocation: true
---

GitHub 이슈 #$ARGUMENTS를 수정한다.

1. `gh issue view $ARGUMENTS`로 이슈 내용 확인
2. 관련 코드를 탐색하고 근본 원인 파악
3. 수정 구현
4. 테스트 작성 또는 기존 테스트 실행으로 검증
   - Rust: `cd src-tauri && cargo test`
5. `cd src-tauri && cargo clippy` 린트 확인
6. 수정 내용을 설명하는 커밋 생성
