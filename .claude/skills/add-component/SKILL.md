---
name: add-component
description: 프로젝트 컨벤션에 맞는 React 컴포넌트 생성
argument-hint: [component-name] [directory]
disable-model-invocation: true
---

`src/components/$1/$0.jsx` 컴포넌트를 생성한다.

## 컨벤션
- Ramda.js 필수 사용 (네이티브 JS 메서드 금지)
- JSDoc/인라인 주석 금지 — 명확한 네이밍으로 대체
- 상태: Jotai atom 또는 Context hook 사용
- 데이터 페칭: useSWR + SWR_KEYS
- 스타일: `src/styles/components/`에 CSS 파일 생성 (LightningCSS)
- i18n: `useStore(messages)`로 번역 텍스트 사용
- 기존 컴포넌트 패턴 참고: `src/components/` 내 유사 컴포넌트

## 절차
1. 기존 유사 컴포넌트의 패턴 확인
2. 컴포넌트 JSX 파일 생성
3. 필요시 CSS 파일 생성
4. 필요시 i18n 키 추가 (en, ko, ja)
