---
name: add-i18n
description: 새 번역 키를 en/ko/ja 3개 로케일 파일에 추가
argument-hint: [key.path] [영문 텍스트]
disable-model-invocation: true
---

번역 키 `$0`을(를) 3개 로케일 파일에 추가한다.

1. `src/i18n/locales/en.json`에 영문 텍스트 추가: "$1"
2. `src/i18n/locales/ko.json`에 한국어 번역 추가
3. `src/i18n/locales/ja.json`에 일본어 번역 추가
4. 기존 키 구조와 네이밍 컨벤션을 따를 것
5. 중첩 구조가 필요하면 기존 패턴 참고
6. 번역이 자연스러운지 확인하고, 불확실하면 사용자에게 확인
