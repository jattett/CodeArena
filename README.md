# CodeArena ⚡

Java / Python / C# / JavaScript를 모두 지원하는 **멀티 언어 코딩테스트 플랫폼**입니다.
**React + Vite + TypeScript** 프론트엔드와 **Express 기반 로컬 OAuth/프록시 서버**로 구성되어 있습니다.

## ✨ 주요 기능

- 🎨 **모던 다크 UI** (Monaco 에디터 통합)
- 🌐 **4개 언어 지원**: JavaScript / Python / Java / C#
- 🧪 **자동 채점**: 샘플 테스트 + 히든 테스트
- ⏱️ **실행 시간 측정**: 케이스별 ms 단위 + 통계 / 막대 차트
- 💾 **자동 저장**: 문제·언어별 코드를 `localStorage`에 자동 저장
- 📋 **stdout 뷰**: 프로그램 표준 출력을 그대로 확인
- 🤖 **AI 문제 생성**: OpenAI API로 원하는 주제/난이도의 문제를 자동 출제
  - 주제/난이도/히든 테스트 개수/추가 제약 지정 가능
  - 4개 언어 스타터 코드 모두 자동 생성
  - 생성한 문제는 `localStorage`에 보관되어 나중에 다시 풀 수 있음
  - 불필요한 문제는 개별 삭제 가능

## 🔑 AI 기능 인증 — 두 가지 방식

### A. 🔐 Sign in with ChatGPT (기본)

OpenAI Codex CLI 와 **동일한 PKCE OAuth 플로우**를 그대로 사용합니다. ChatGPT Plus/Pro/Business/Edu/Enterprise 구독이 있다면 **별도 API 키 없이** 바로 로그인해서 사용할 수 있습니다.

1. 터미널에서 `npm run dev` 실행 (프론트 + 로컬 백엔드 동시 기동)
2. 웹에서 **⚙️ 설정 → 🔐 Sign in with ChatGPT** 클릭
3. 팝업에서 ChatGPT 계정으로 로그인 → 자동으로 창 닫힘
4. 이후 AI 문제 생성은 [`openai-oauth`](https://github.com/EvanZhouDev/openai-oauth) 로컬 프록시를 거쳐 ChatGPT Codex 백엔드로 라우팅됨

**아키텍처**

```
[브라우저] → [Express 1455] ┬→ /auth/*           (PKCE OAuth 로그인 플로우)
                            └→ /api/openai/chat  ──┐
                                                    ↓
                              [openai-oauth 10531] ──→  chatgpt.com/backend-api/codex
                                    ↑
                              ~/.codearena/auth.json (Codex CLI 포맷)
```

`openai-oauth` 서브프로세스는 **계정의 사용 가능한 모델을 자동 탐지**합니다 (예: `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex`, `gpt-5.2` 등). 토큰은 Codex CLI 와 동일한 포맷으로 `~/.codearena/auth.json` (권한 0600) 에 저장되며 만료 시 자동 갱신됩니다.

**OAuth 파라미터 (공개값)**
- Client ID: `app_EMoamEEZ73f0CkXaXp7hrann` (Codex CLI 공개 PKCE 클라이언트)
- Authorize: `https://auth.openai.com/oauth/authorize`
- Token: `https://auth.openai.com/oauth/token`
- Redirect URI: `http://localhost:1455/auth/callback`
- Scopes: `openid profile email offline_access`

### B. 🔑 API 키 모드

전통적인 OpenAI API 키가 있다면 설정에서 **🔑 API 키** 로 전환해 키를 붙여넣으면 됩니다. 키는 브라우저 localStorage 에만 저장되며, AI 호출 시 로컬 백엔드 프록시를 통해 전달됩니다.

> ⚠️ 어느 방식이든 공용 PC 사용 후에는 반드시 설정에서 로그아웃/키 삭제해주세요.

## 🧠 언어별 실행 방식

| 언어 | 실행 환경 | 비고 |
|------|-----------|------|
| JavaScript | 브라우저 **Web Worker** | 오프라인에서도 동작, 매우 빠름 |
| Python | **Pyodide** (WebAssembly) | 최초 1회 CDN에서 런타임 로드 (수 초) |
| Java | **Piston API** (원격) | 인터넷 필요 |
| C# | **Piston API** (원격) | 인터넷 필요 |

> Piston API는 [emkc.org/api/v2/piston](https://emkc.org/api/v2/piston)의 무료 공개 코드 실행 API입니다. Java/C#는 **원격 실행**이므로 측정 시간에 네트워크 왕복 시간이 포함됩니다.

## 🚀 실행 방법

### 필요 환경
- Node.js 18 이상

### 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 자동으로 [http://localhost:5173](http://localhost:5173) 이 열리고, 동시에 로컬 OAuth/프록시 서버가 [http://localhost:1455](http://localhost:1455) 에서 함께 기동됩니다.

> 포트 1455는 OpenAI OAuth 가 허용하는 redirect URI(`http://localhost:1455/auth/callback`)와 일치해야 하므로 **변경할 수 없습니다**. 해당 포트가 사용 중이면 `lsof -i :1455` 로 확인 후 종료해주세요.

### 프로덕션 빌드

```bash
npm run build
npm run preview
```

## 📁 프로젝트 구조

```
.
├── index.html                # 엔트리 HTML (Pyodide CDN 포함)
├── package.json
├── vite.config.ts            # /api, /auth → localhost:1455 프록시
├── tsconfig.json             # 프로젝트 루트 ref
├── tsconfig.app.json         # 앱 컴파일 옵션
├── tsconfig.node.json        # Vite config 컴파일 옵션
├── tsconfig.server.json      # Express 서버 컴파일 옵션
├── server/                   # 🆕 로컬 Express 서버 (OAuth + 프록시)
│   ├── index.ts              #   포트 1455, CORS, 엔드포인트 라우팅
│   ├── auth.ts               #   PKCE OAuth 플로우 / refresh
│   ├── tokens.ts             #   ~/.codearena/auth.json (Codex 포맷) 저장소
│   ├── codexProxy.ts         #   openai-oauth 서브프로세스 관리 (포트 10531)
│   └── proxy.ts              #   /api/openai/chat 요청을 openai-oauth 또는 api.openai.com 으로 포워딩
└── src/
    ├── main.tsx              # React 엔트리
    ├── App.tsx               # 최상위 컴포넌트
    ├── components/
    │   ├── Sidebar.tsx       # 문제 목록 (기본 + AI 생성 섹션)
    │   ├── ProblemPanel.tsx  # 문제 설명 / 예시
    │   ├── EditorPanel.tsx   # Monaco 에디터 + 툴바
    │   ├── ResultPanel.tsx   # 결과 / stdout / 통계 탭
    │   ├── Modal.tsx         # 공용 모달 컴포넌트
    │   ├── SettingsModal.tsx # 인증 모드 토글 + OAuth 섹션 + API 키
    │   └── GenerateModal.tsx # AI 문제 생성 폼
    ├── hooks/
    │   ├── useRunner.ts      # 실행 + 채점 훅
    │   ├── useProblems.ts    # 기본 + AI 생성 문제 통합 저장소
    │   ├── useSettings.ts    # OpenAI 설정 훅 (authMode + key)
    │   └── useAuth.ts        # 🆕 백엔드 OAuth 상태 + 로그인/로그아웃
    ├── lib/
    │   ├── executor.ts       # 언어별 실행 디스패처
    │   ├── authClient.ts     # 🆕 백엔드 auth/health/login API 래퍼
    │   ├── openai.ts         # /api/openai/chat 프록시 + Structured Outputs
    │   └── aiGenerator.ts    # AI 문제 생성기 (프롬프트 + JSON 스키마)
    ├── data/
    │   └── problems.ts       # 기본 문제 데이터
    ├── types/
    │   ├── index.ts          # 도메인 타입 (Problem, AuthMode, AuthStatus 등)
    │   └── global.d.ts       # Pyodide 전역 타입
    └── styles/
        ├── index.css
        └── app.css
```

## 🔍 개발자 명령어

```bash
npm run dev         # 프론트(Vite) + 백엔드(Express) 동시 기동
npm run dev:web     # 프론트만
npm run dev:server  # 백엔드만 (tsx watch)
npm run build       # 타입체크(tsc -b) + 프로덕션 빌드
npm run typecheck   # 타입체크만 실행
npm run preview     # 빌드 결과물 미리보기
```

## 🧩 새 문제 추가하기

`src/data/problems.ts`의 `PROBLEMS` 배열에 `Problem` 타입을 따르는 객체를 추가하세요:

```ts
import type { Problem } from '../types'

const myProblem: Problem = {
  id: 'my-problem',
  title: '문제 제목',
  difficulty: 'easy', // 'easy' | 'medium' | 'hard'
  description: `문제 설명 (멀티라인 문자열)`,
  sampleTests: [
    { name: '예제 #1', stdin: '입력\n', expected: '기대 출력' },
  ],
  hiddenTests: [
    { name: '히든 #1', stdin: '...', expected: '...' },
  ],
  starter: {
    javascript: '...',
    python: '...',
    java: '...',
    csharp: '...',
  },
}
```

TypeScript가 네 언어 모두의 `starter`가 빠지지 않도록 컴파일 타임에 검증해줍니다.

- **채점 규칙**: stdout(trim, trailing whitespace 제거)이 expected와 완전히 일치하면 통과
- **JavaScript 스타터 코드**: `input`이라는 문자열 변수가 자동 주입됩니다 (stdin 전체)
- **Python 스타터 코드**: `input()` / `sys.stdin.read()` 그대로 사용 가능
- **Java / C#**: 표준 입출력을 그대로 사용 (`Scanner`, `Console.ReadLine()` 등)

## 🧠 AI 문제 생성 원리

- **Structured Outputs**: OpenAI `response_format: json_schema` 를 사용해 JSON 스키마를 엄격하게 강제
- 스키마가 `{ title, difficulty, description, sampleTests, hiddenTests, starter: { javascript, python, java, csharp } }` 전부를 필수로 선언하므로 모델이 **한 언어라도 빠뜨리면 응답 자체가 실패**함
- 생성된 문제는 기존 문제와 완전히 동일한 `Problem` 타입이므로, 기존 실행/채점 파이프라인을 그대로 재사용

## ⚠️ 알려진 제한

- Java / C# 실행은 Piston API에 의존하므로 **네트워크 연결 및 외부 서버 상태**에 따라 영향 받을 수 있습니다.
- Pyodide는 처음 로드될 때 약 5~10초 소요됩니다 (한 번만).
- 보안상 Web Worker는 샌드박스지만, **신뢰할 수 없는 코드를 대량 실행하는 서비스로 쓰지 마세요**.
- AI가 생성한 문제의 테스트 케이스가 항상 완벽하지는 않을 수 있습니다. 통과하지 않을 경우 문제 설명 / 기대 출력을 검토해보세요.
- **공식 OAuth 지원은 포함되지 않았습니다** (브라우저 SPA만으로는 OAuth 시크릿을 안전히 보관할 수 없습니다). 필요하시면 Node/Express 백엔드를 추가해 PKCE 플로우 + API 프록시를 구현해야 합니다.

## 📜 라이선스

개인 학습/데모용. 자유롭게 수정/사용하세요.
