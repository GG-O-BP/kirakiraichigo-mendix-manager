---
name: ramda-reference
description: Ramda 0.32.0 전체 함수 레퍼런스 (272개, ramdajs.com/docs 전체 수록). 프론트엔드 코드 작성·수정·리뷰 시 어떤 Ramda 함수를 쓸지 결정할 때 반드시 참고.
user-invocable: false
---

# Ramda 0.32.0 전체 레퍼런스

ramdajs.com/docs 전체 272개 함수를 카테고리별로 수록 (설치된 `ramda@0.32.0`의 export와 1:1 일치). 프론트엔드 코드에서 네이티브 JS 대신 사용할 함수를 여기서 고른다. ramda 버전을 올리면 이 파일을 재생성할 것 (소스: `node_modules/ramda/src/*.js`의 JSDoc `@category`).

## 핵심 메커니즘

- **모든 함수는 자동 커링 + data-last**: `R.map(fn)(list)` == `R.map(fn, list)`. 데이터를 마지막에 받으므로 `R.pipe` 합성에 최적.
- **`R.__` 자리표시자**: 중간 인자를 비워 부분 적용 — `R.includes(R.__, options)`.
- **합성**: `R.pipe(f, g)` 왼→오른쪽, `R.compose(f, g)` 오른→왼쪽. 값을 먼저 주려면 `R.flow(x, [f, g])` 또는 `R.applyTo(x, fn)`.
- **비동기**: Promise 체인은 `R.andThen`(then) / `R.otherwise`(catch)로 합성. async 파이프라인은 `R.pipeWith(R.andThen, [...])`.
- **렌즈**: `R.lensProp`/`R.lensPath`/`R.lensIndex`로 만들고 `R.view`(읽기)/`R.set`(쓰기)/`R.over`(변환).
- **깊은 비교 vs 참조 비교**: `R.equals`는 깊은 동등, `R.identical`은 `Object.is`.
- **⚠️ 인자 순서 (0.29+)**: `R.propEq(값, 키, obj)`, `R.pathEq(값, 경로, obj)` — 값이 먼저다. 구버전 예제(키 먼저)를 따라 쓰지 말 것.
- **⚠️ `R.of`는 0.30+에서 `R.of(Array, x)`** 형태 (타입 대표 필요). `R.sequence`/`R.traverse`도 첫 인자로 타입 대표를 받는다.

## 네이티브 → Ramda 필수 치환표 (CLAUDE.md 규칙의 구체화)

| 네이티브 패턴 | Ramda 치환 |
|---|---|
| `obj.x`, `obj?.x` (데이터 객체) | `R.prop("x")`, `R.propOr(def, "x")`, `R.path(["a","b"])`, `R.pathOr(def, [...])` |
| `if (x === null)`, `!x` nil 체크 | `R.isNil`, `R.isNotNil` |
| `arr.length === 0` / `> 0` | `R.isEmpty` / `R.isNotEmpty` |
| `if/else`, 데이터 삼항 | `R.ifElse(pred, onT, onF)`, `R.when(pred, fn)`, `R.unless(pred, fn)` |
| `if/else if` 체인, `switch` | `R.cond([[pred, fn], ..., [R.T, fallback]])` |
| `a \|\| def`, `a ?? def` | `R.defaultTo(def, a)` |
| `x === y` | `R.equals(y, x)`, `R.propEq(val, key, obj)` |
| `arr.map/filter/find/reduce/...` | `R.map/R.filter/R.find/R.reduce/...` |
| `[...arr, x]` / `[x, ...arr]` | `R.append(x, arr)` / `R.prepend(x, arr)` |
| `arr[i]`, `key[1]` | `R.nth(i, arr)`, `R.nth(1, key)` |
| `e.target.value` 핸들러 | `R.pipe(R.path(["target", "value"]), setter)` |
| `Object.keys/values/entries` | `R.keys` / `R.values` / `R.toPairs` |
| `!pred(x)` | `R.complement(pred)`, `R.not` |
| `p(x) && q(x)` / `\|\|` 술어 합성 | `R.both`/`R.either`/`R.allPass`/`R.anyPass`, 값은 `R.and`/`R.or` |
| `{ ...a, ...b }` (데이터 병합) | `R.mergeRight(a, b)`, 깊은 병합 `R.mergeDeepRight` |
| `obj[k] = v` 누적 | `R.assoc(k, v, obj)`, `R.reduce` + `R.assoc` |
| `try { JSON.parse } catch` (동기) | `R.tryCatch(tryer, catcher)` |
| `promise.then(fn)` / `.catch(h)` / async `try/catch` | `R.andThen(fn, p)` / `R.otherwise(h, p)` / 파이프라인은 `R.pipeWith(R.andThen, [...])` |
| JSX `{cond && <X/>}`, `cond ? <X/> : null` | `R.ifElse(pred, () => <X/>, R.always(null))`, `R.when`, `R.cond` |
| `str.replace/split/trim/toLowerCase()` | `R.replace` / `R.split` / `R.trim` / `R.toLower` (`R.toUpper`, `R.test`, `R.match`도 동일) |
| `a + b`, `a - b`, `n + 1` (데이터 산술) | `R.add` / `R.subtract` / `R.multiply` / `R.divide` / `R.inc` / `R.dec` |

**원칙: Ramda로 표현 가능한 것은 전부 Ramda로 작성한다.** 네이티브가 허용되는 예외는 Ramda로 표현이 **불가능한** 것뿐이다:

- **호스트 객체 조작**: `window`/`document`/DOM/`location`의 쓰기·메서드 호출. 주의 — `R.assocPath(["location", "href"], url, window)`는 복사본 객체만 만들 뿐 네비게이션하지 않는다 (조용한 버그). 읽기도 실익이 없으므로 호스트 객체는 통째로 예외.
- **React hooks 호출**: rules of hooks 때문에 조건부 합성 불가. hook 호출 자체는 항상 네이티브.
- **함수·Tauri 커맨드 호출 자체**: `invoke(...)`, 콜백 실행, 이벤트 핸들러 등록.
- **`Set`/`Map` 조작**: Ramda 미지원. Rust로 보내기 전 `Array.from` 변환 (CLAUDE.md gotcha).
- **JSX 문법 자체, 함수 파라미터 구조분해**.
- **언어 구문**: `import`/`export`, `async` 함수 정의, `throw`.
- **Ramda 대응이 없는 내장**: `JSON.parse/stringify`, `Math.ceil/round/floor/random`, `parseInt`/`parseFloat`/`isNaN`, `Date`, 타이머. `String(x)` 강제변환도 예외 (`R.toString("a")`는 `'"a"'`로 따옴표가 붙어 대체 불가).
- **iframe 주입용 템플릿 리터럴 내부 코드** (샌드박스에 Ramda 로드 불가), 문자열 보간용 템플릿 리터럴 자체.

**`promise.then/catch`·async `try/catch`·문자열 메서드는 예외가 아니다** — 각각 `R.andThen`/`R.otherwise`, `R.replace`/`R.trim` 등으로 반드시 치환한다.

## Function (55)

- `R.F()` — 항상 `false` 반환
- `R.T()` — 항상 `true` 반환
- `R.__` — 부분 적용 자리표시자
- `R.addIndex(iterFn)` — map/filter류에 `(item, idx, list)` 콜백 시그니처 부여
- `R.addIndexRight(iterFn)` — addIndex의 오른쪽→왼쪽 순회 버전
- `R.always(x)` — 항상 x를 반환하는 함수 생성
- `R.andThen(fn, promise)` — Promise 성공 값에 fn 적용 (`.then`)
- `R.ap(fnList, list)` — 함수 컨테이너를 값 컨테이너에 적용 (Apply)
- `R.apply(fn, argsList)` — 인자 배열을 펼쳐 호출
- `R.applySpec(spec)` — 스펙 객체 모양대로 각 함수 결과를 채운 객체 생성
- `R.applyTo(x, fn)` — x를 fn에 적용 (값 우선)
- `R.ascend(fn)` — fn 결과 기준 오름차순 비교자 생성 (sortWith용)
- `R.ascendNatural(locales, fn)` — localeCompare 자연 정렬 오름차순 비교자
- `R.binary(fn)` — 인자 2개로 제한한 함수
- `R.bind(fn, thisObj)` — this를 고정한 함수
- `R.call(fn, ...args)` — fn을 즉시 호출
- `R.comparator(pred)` — `(a,b)→bool` 술어를 -1/0/1 비교자로 변환
- `R.compose(...fns)` — 오른쪽→왼쪽 함수 합성
- `R.composeWith(transformer, fns)` — 각 단계 결과를 변환기로 연결하며 합성
- `R.construct(Ctor)` — 생성자를 new 없이 쓰는 커링 함수로
- `R.constructN(n, Ctor)` — arity를 지정한 construct
- `R.converge(after, branchFns)` — 같은 인자로 분기 함수들 실행 후 결과들을 after에 전달
- `R.curry(fn)` — 자동 커링
- `R.curryN(n, fn)` — arity를 명시한 커링 (default 파라미터가 있으면 필수)
- `R.descend(fn)` — fn 결과 기준 내림차순 비교자
- `R.descendNatural(locales, fn)` — 자연 정렬 내림차순 비교자
- `R.empty(x)` — 같은 타입의 빈 값 (`[]`, `""`, `{}`)
- `R.flip(fn)` — 첫 두 인자 순서를 바꾼 함수
- `R.flow(x, [f, ...fns])` — 값 x를 파이프라인에 통과 (pipe의 값-우선형)
- `R.identity(x)` — x 그대로 반환
- `R.invoker(arity, method)` — 메서드를 data-last 함수로 (`R.invoker(1, "slice")(0, str)`)
- `R.juxt(fns)` — 같은 인자로 모든 fn 호출, 결과 배열
- `R.lift(fn)` — 함수를 컨테이너(배열 등) 위로 리프트
- `R.liftN(n, fn)` — arity 지정 lift
- `R.memoizeWith(keyFn, fn)` — 키 함수 기반 메모이제이션
- `R.nAry(n, fn)` — 인자 n개로 제한
- `R.nthArg(n)` — n번째 인자를 반환하는 함수
- `R.o(f, g)` — 단항 2-함수 합성 (`f(g(x))`)
- `R.of(TypeRep, x)` — 컨테이너에 값 넣기 (`R.of(Array, 1)` → `[1]`)
- `R.on(binFn, unaryFn, a, b)` — `binFn(unaryFn(a), unaryFn(b))`
- `R.once(fn)` — 최초 1회만 실행, 이후 캐시 반환
- `R.otherwise(handler, promise)` — Promise 실패 처리 (`.catch`)
- `R.partial(fn, argsList)` — 앞쪽 인자 부분 적용
- `R.partialObject(fn, partObj)` — 객체 인자를 깊은 병합으로 부분 적용
- `R.partialRight(fn, argsList)` — 뒤쪽 인자 부분 적용
- `R.pipe(...fns)` — 왼쪽→오른쪽 함수 합성 (이 프로젝트 표준)
- `R.pipeWith(transformer, fns)` — 단계 연결을 변환기로 제어 (`R.pipeWith(R.andThen, [...])` = async 파이프)
- `R.promap(pre, post, fn)` — fn의 입력·출력을 동시에 매핑
- `R.tap(fn, x)` — 부수효과 실행 후 x 그대로 반환 (파이프 중간 사이드이펙트)
- `R.thunkify(fn)` — 호출을 지연하는 썽크 생성 함수로 변환
- `R.tryCatch(tryer, catcher)` — 예외 발생 시 catcher 호출
- `R.unapply(fn)` — 가변 인자를 배열로 모아 fn에 전달
- `R.unary(fn)` — 인자 1개로 제한 (`R.unary(parseInt)`)
- `R.uncurryN(n, fn)` — 커링된 함수를 n-ary로 펼침
- `R.useWith(fn, transformers)` — 각 인자를 대응 변환기로 변환 후 fn 호출

## List (92)

- `R.adjust(idx, fn, list)` — 해당 인덱스 요소에 fn 적용한 새 배열
- `R.all(pred, list)` — 모든 요소가 술어 만족?
- `R.any(pred, list)` — 하나라도 만족?
- `R.aperture(n, list)` — n개짜리 연속 슬라이딩 윈도우 목록
- `R.append(x, list)` — 끝에 추가한 새 배열
- `R.chain(fn, list)` — flatMap (매핑 후 1단계 평탄화)
- `R.collectBy(keyFn, list)` — 키 함수 결과가 같은 요소끼리 서브리스트로 분할
- `R.concat(a, b)` — 배열/문자열 연결
- `R.count(pred, list)` — 술어 만족 개수
- `R.drop(n, list)` — 앞 n개 제거
- `R.dropLast(n, list)` — 뒤 n개 제거
- `R.dropLastWhile(pred, list)` — 뒤에서 술어 만족하는 동안 제거
- `R.dropRepeats(list)` — 연속 중복 제거
- `R.dropRepeatsBy(fn, list)` — fn 결과 기준 연속 중복 제거
- `R.dropRepeatsWith(eqFn, list)` — 동치 함수 기준 연속 중복 제거
- `R.dropWhile(pred, list)` — 앞에서 술어 만족하는 동안 제거
- `R.endsWith(suffix, list)` — 접미 일치 여부
- `R.filter(pred, list)` — 술어 만족 요소만
- `R.find(pred, list)` — 첫 만족 요소 (없으면 undefined)
- `R.findIndex(pred, list)` — 첫 만족 인덱스 (없으면 -1)
- `R.findLast(pred, list)` — 마지막 만족 요소
- `R.findLastIndex(pred, list)` — 마지막 만족 인덱스
- `R.flatten(list)` — 모든 중첩 완전 평탄화
- `R.forEach(fn, list)` — 부수효과 순회 (원본 반환)
- `R.fromPairs(pairs)` — `[[k,v],...]` → 객체
- `R.groupBy(keyFn, list)` — 키 함수 결과별로 그룹한 객체
- `R.groupWith(eqFn, list)` — 인접 동치 요소끼리 그룹
- `R.head(list)` — 첫 요소
- `R.includes(x, list)` — 포함 여부 (equals 기준)
- `R.indexBy(keyFn, list)` — 키→요소 객체 (마지막 값 우선)
- `R.indexOf(x, list)` — 첫 위치 (equals 기준)
- `R.init(list)` — 마지막 요소 제외 전부
- `R.insert(idx, x, list)` — 위치에 삽입
- `R.insertAll(idx, xs, list)` — 위치에 여러 개 삽입
- `R.intersperse(sep, list)` — 요소 사이에 구분자 삽입
- `R.into(acc, transducer, list)` — 트랜스듀서를 실행해 acc에 수집
- `R.join(sep, list)` — 문자열로 결합
- `R.last(list)` — 마지막 요소
- `R.lastIndexOf(x, list)` — 마지막 위치
- `R.length(list)` — 길이
- `R.map(fn, list)` — 매핑 (객체·펑터에도 동작)
- `R.mapAccum(fn, acc, list)` — 왼→오 누산하며 매핑, `[최종acc, 결과들]`
- `R.mapAccumRight(fn, acc, list)` — 오→왼 누산 매핑
- `R.mergeAll(objList)` — 객체 배열을 하나로 얕은 병합
- `R.move(from, to, list)` — 요소를 다른 위치로 이동
- `R.none(pred, list)` — 아무도 만족 안 함?
- `R.nth(n, list)` — n번째 요소 (음수는 뒤에서)
- `R.pair(a, b)` — `[a, b]`
- `R.partition(pred, list)` — `[만족 목록, 불만족 목록]`
- `R.pluck(key, list)` — 각 요소의 프로퍼티만 추출한 배열
- `R.prepend(x, list)` — 앞에 추가
- `R.range(from, to)` — from..to-1 정수 배열
- `R.rebuild(fn, obj)` — 각 [키,값] 쌍을 0~n개의 새 쌍으로 변환해 객체 재구성
- `R.reduce(fn, init, list)` — 왼쪽부터 축약 (`R.reduced`로 조기 종료)
- `R.reduceBy(valueFn, init, keyFn, list)` — 그룹별로 리듀스한 객체
- `R.reduceRight(fn, init, list)` — 오른쪽부터 축약
- `R.reduceWhile(pred, fn, init, list)` — 술어가 참인 동안만 축약
- `R.reduced(x)` — reduce 조기 종료 신호로 x 래핑
- `R.reject(pred, list)` — filter의 반대 (불만족만)
- `R.remove(start, count, list)` — 구간 삭제
- `R.repeat(x, n)` — x를 n번 반복한 배열
- `R.reverse(list)` — 뒤집기
- `R.scan(fn, init, list)` — 모든 중간 누적값 배열
- `R.sequence(TypeRep, traversable)` — 컨테이너 중첩 뒤집기 (`[Maybe a]`→`Maybe [a]`)
- `R.slice(from, to, list)` — 구간 추출
- `R.sort(comparator, list)` — 비교자로 정렬한 새 배열
- `R.splitAt(idx, list)` — 인덱스 기준 2분할
- `R.splitEvery(n, list)` — n개씩 청크 분할
- `R.splitWhen(pred, list)` — 첫 만족 요소 앞에서 2분할
- `R.splitWhenever(pred, list)` — 만족 요소마다 반복 분할
- `R.startsWith(prefix, list)` — 접두 일치 여부
- `R.swap(idxA, idxB, list)` — 두 위치 요소 교환
- `R.tail(list)` — 첫 요소 제외 전부
- `R.take(n, list)` — 앞 n개
- `R.takeLast(n, list)` — 뒤 n개
- `R.takeLastWhile(pred, list)` — 뒤에서 만족하는 동안
- `R.takeWhile(pred, list)` — 앞에서 만족하는 동안
- `R.times(fn, n)` — `fn(0)..fn(n-1)` 결과 배열
- `R.transduce(transducer, fn, init, list)` — 트랜스듀서 + 리듀서 실행
- `R.transpose(matrix)` — 행렬 전치
- `R.traverse(TypeRep, fn, traversable)` — 매핑하며 sequence
- `R.unfold(fn, seed)` — 시드에서 `[값, 다음시드]` 반복으로 리스트 생성
- `R.uniq(list)` — 중복 제거 (equals 기준)
- `R.uniqBy(fn, list)` — fn 결과 기준 중복 제거
- `R.uniqWith(eqFn, list)` — 동치 함수 기준 중복 제거
- `R.unnest(list)` — 1단계만 평탄화
- `R.update(idx, x, list)` — 해당 인덱스를 새 값으로
- `R.without(xs, list)` — xs에 있는 요소 제외
- `R.xprod(a, b)` — 데카르트 곱 쌍 목록
- `R.zip(a, b)` — 같은 위치끼리 쌍 목록
- `R.zipObj(keys, values)` — 키 배열 + 값 배열 → 객체
- `R.zipWith(fn, a, b)` — 같은 위치끼리 fn 적용

## Logic (19)

- `R.allPass(preds)` — 모든 술어를 만족하는지 검사하는 술어
- `R.and(a, b)` — 논리곱 (값)
- `R.anyPass(preds)` — 하나라도 만족 술어
- `R.both(f, g)` — `f(x) && g(x)` 술어 합성
- `R.complement(pred)` — 술어 부정
- `R.cond(pairs)` — `[[술어, 결과fn], ...]` 다중 분기 (switch/if-chain 대체)
- `R.defaultTo(def, x)` — x가 null/undefined/NaN이면 def
- `R.either(f, g)` — `f(x) || g(x)` 술어 합성
- `R.ifElse(pred, onTrue, onFalse)` — 조건 분기 함수
- `R.isEmpty(x)` — 타입의 빈 값인지 (`[]`, `""`, `{}`)
- `R.isNotEmpty(x)` — isEmpty의 부정
- `R.not(x)` — 논리 부정
- `R.or(a, b)` — 논리합 (값)
- `R.pathSatisfies(pred, path, obj)` — 경로 값이 술어 만족?
- `R.propSatisfies(pred, key, obj)` — prop 값이 술어 만족?
- `R.unless(pred, fn, x)` — 불만족 시 fn(x), 만족 시 x
- `R.until(pred, fn, x)` — 만족할 때까지 fn 반복 적용
- `R.when(pred, fn, x)` — 만족 시 fn(x), 불만족 시 x
- `R.xor(a, b)` — 배타적 논리합

## Math (13)

- `R.add(a, b)` — 덧셈
- `R.dec(n)` — n - 1
- `R.divide(a, b)` — 나눗셈
- `R.inc(n)` — n + 1
- `R.mathMod(m, p)` — 수학적 모듈로 (음수 안전)
- `R.mean(list)` — 평균
- `R.median(list)` — 중앙값
- `R.modulo(a, b)` — JS `%` 연산
- `R.multiply(a, b)` — 곱셈
- `R.negate(n)` — 부호 반전
- `R.product(list)` — 전체 곱
- `R.subtract(a, b)` — 뺄셈
- `R.sum(list)` — 전체 합

## Object (55)

- `R.assoc(key, val, obj)` — 프로퍼티 설정한 얕은 복제본
- `R.assocPath(path, val, obj)` — 중첩 경로에 값 설정
- `R.clone(x)` — 깊은 복제
- `R.dissoc(key, obj)` — 프로퍼티 제거한 복제본
- `R.dissocPath(path, obj)` — 중첩 경로 제거
- `R.eqProps(key, a, b)` — 두 객체의 해당 prop이 equals?
- `R.evolve(spec, obj)` — 스펙의 함수들로 해당 프로퍼티만 변환
- `R.forEachObjIndexed(fn, obj)` — `(값, 키, obj)` 부수효과 순회
- `R.has(key, obj)` — own 프로퍼티 존재?
- `R.hasIn(key, obj)` — 프로토타입 포함 존재?
- `R.hasPath(path, obj)` — 중첩 경로 존재?
- `R.invert(obj)` — 값→[키 배열] 반전
- `R.invertObj(obj)` — 값→키 반전 (마지막 우선)
- `R.keys(obj)` — own 키 배열
- `R.keysIn(obj)` — 프로토타입 포함 키 배열
- `R.lens(getter, setter)` — 커스텀 렌즈 생성
- `R.lensIndex(n)` — 배열 인덱스 렌즈
- `R.lensPath(path)` — 중첩 경로 렌즈
- `R.lensProp(key)` — 프로퍼티 렌즈
- `R.mapKeys(fn, obj)` — 키를 fn으로 변환한 객체
- `R.mapObjIndexed(fn, obj)` — `(값, 키, obj)`로 값 매핑
- `R.mergeDeepLeft(l, r)` — 깊은 병합, 왼쪽 우선
- `R.mergeDeepRight(l, r)` — 깊은 병합, 오른쪽 우선
- `R.mergeDeepWith(fn, l, r)` — 충돌 시 fn(lVal, rVal)로 깊은 병합
- `R.mergeDeepWithKey(fn, l, r)` — 충돌 시 fn(key, lVal, rVal) 깊은 병합
- `R.mergeLeft(l, r)` — 얕은 병합, 왼쪽 우선
- `R.mergeRight(l, r)` — 얕은 병합, 오른쪽 우선 (`{...l, ...r}` 대체)
- `R.mergeWith(fn, l, r)` — 충돌 키만 fn으로 병합
- `R.mergeWithKey(fn, l, r)` — 충돌 시 키 포함 fn 병합
- `R.modify(key, fn, obj)` — 해당 prop에 fn 적용한 복제본
- `R.modifyPath(path, fn, obj)` — 중첩 경로에 fn 적용
- `R.objOf(key, val)` — 단일 프로퍼티 객체 생성
- `R.omit(keys, obj)` — 지정 키 제외한 복제본
- `R.over(lens, fn, x)` — 렌즈 초점에 fn 적용
- `R.path(path, obj)` — 중첩 경로 값 (없으면 undefined)
- `R.pathOr(def, path, obj)` — 경로 값, nil이면 def
- `R.paths(pathList, obj)` — 여러 경로 값 배열
- `R.pick(keys, obj)` — 존재하는 지정 키만 추출
- `R.pickAll(keys, obj)` — 지정 키 전부 추출 (없으면 undefined 포함)
- `R.pickBy(pred, obj)` — `(값, 키)` 술어로 추출
- `R.project(keys, objList)` — 객체 배열 각각에 pick (SQL select)
- `R.prop(key, obj)` — 프로퍼티 값
- `R.propOr(def, key, obj)` — prop 값, nil이면 def
- `R.props(keys, obj)` — 여러 prop 값 배열
- `R.renameKeys(keyMap, obj)` — 매핑 객체대로 키 이름 변경
- `R.set(lens, val, x)` — 렌즈 초점에 값 설정
- `R.toPairs(obj)` — own `[키, 값]` 쌍 배열 (Object.entries 대체)
- `R.toPairsIn(obj)` — 프로토타입 포함 쌍 배열
- `R.unwind(key, obj)` — 배열 prop을 요소별 객체들로 전개
- `R.values(obj)` — own 값 배열
- `R.valuesIn(obj)` — 프로토타입 포함 값 배열
- `R.view(lens, x)` — 렌즈 초점 값 읽기
- `R.where(spec, obj)` — prop별 술어 스펙 전부 만족?
- `R.whereAny(spec, obj)` — 스펙 중 하나라도 만족?
- `R.whereEq(spec, obj)` — prop별 equals 스펙 전부 일치?

## Relation (25)

- `R.clamp(min, max, n)` — 범위로 제한
- `R.countBy(fn, list)` — fn 결과별 개수 객체
- `R.difference(a, b)` — a에만 있는 요소
- `R.differenceWith(eqFn, a, b)` — 동치 함수 기준 차집합
- `R.eqBy(fn, a, b)` — fn 적용 후 equals
- `R.equals(a, b)` — 깊은 구조 동등 비교
- `R.gt(a, b)` — a > b
- `R.gte(a, b)` — a >= b
- `R.identical(a, b)` — `Object.is` 참조 동일성
- `R.innerJoin(pred, records, ids)` — 관계형 inner join
- `R.intersection(a, b)` — 교집합
- `R.lt(a, b)` — a < b
- `R.lte(a, b)` — a <= b
- `R.max(a, b)` — 큰 값
- `R.maxBy(fn, a, b)` — fn 결과가 큰 쪽의 원본
- `R.min(a, b)` — 작은 값
- `R.minBy(fn, a, b)` — fn 결과가 작은 쪽의 원본
- `R.pathEq(val, path, obj)` — 경로 값이 val과 equals? (값이 첫 인자)
- `R.propEq(val, key, obj)` — prop 값이 val과 equals? (값이 첫 인자)
- `R.sortBy(fn, list)` — fn 결과 기준 오름차순 정렬
- `R.sortWith(comparators, list)` — 비교자 배열 순차 적용 정렬
- `R.symmetricDifference(a, b)` — 한쪽에만 있는 요소들
- `R.symmetricDifferenceWith(eqFn, a, b)` — 동치 함수 기준 대칭차
- `R.union(a, b)` — 합집합 (중복 제거)
- `R.unionWith(eqFn, a, b)` — 동치 함수 기준 합집합

## String (8)

- `R.match(regex, str)` — 매치 결과 배열 (없으면 `[]`)
- `R.replace(pattern, replacement, str)` — 치환
- `R.split(sep, str)` — 분할 배열
- `R.test(regex, str)` — 정규식 매치 여부
- `R.toLower(str)` — 소문자로
- `R.toString(x)` — 값의 문자열 표현 (재귀적)
- `R.toUpper(str)` — 대문자로
- `R.trim(str)` — 앞뒤 공백 제거

## Type (5)

- `R.is(Ctor, x)` — 생성자 기반 타입 검사 (`R.is(Array, x)`)
- `R.isNil(x)` — null 또는 undefined?
- `R.isNotNil(x)` — nil 아님?
- `R.propIs(Ctor, key, obj)` — prop이 해당 타입?
- `R.type(x)` — 타입명 문자열 (`"Object"`, `"Array"`, `"Null"` 등)
