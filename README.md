# Mia English — React Native(Expo) + NestJS

영어 회화 롤플레이 앱. 캠퍼스에서 3D 캐릭터 Mia와 "점심 약속 잡기"를 연습한다.
난이도(쉬움/보통/어려움) · 대화 중 Mia의 거절 · 돌발상황 · 대화 중 Mia 줌업이 들어 있다.

```
mia-app/
├─ packages/
│  ├─ dialogue/      # 대화 엔진(TypeScript, 규칙 기반). 서버/앱 공용 · 타입체크 통과
│  └─ avatar-core/   # 3D VRM 렌더러(순수 JS, WebGL2) — WebView 안에서만 실행
├─ apps/
│  ├─ api/           # NestJS: 세션·기록·대화 제공자(규칙/Claude 하이브리드)·STT
│  └─ mobile/        # Expo(React Native): 화면·녹음·재생·사용자 조작 + 아바타 WebView
```

## 역할 분담
| 영역 | 담당 |
|---|---|
| mobile | 시작/대화/결과 화면, 마이크 녹음(expo-av), Mia 음성(expo-speech), 3D 아바타(WebView) 제어 |
| api | 세션 생성·턴 처리·기록 조회, 대화 제공자 선택, 음성 인식(STT) 중계 |
| dialogue | 시간·장소·날짜 파악, 거절/돌발상황 흐름, 난이도별 말투, 종료 판정 |

## 실행
```bash
npm install                      # 루트에서 (workspaces)
cp apps/api/.env.example apps/api/.env
npm run api                      # http://localhost:3000
```
앱: `apps/mobile/app.json` 의 `extra.apiUrl` 을 서버 주소로 바꾼다(Android 에뮬레이터 `10.0.2.2`, 실기기는 PC의 LAN IP).
```bash
npm run avatar                   # (선택) avatar-core 를 수정했을 때 assets/avatar.html 재생성
npm run app                      # Expo 개발 서버 → 실기기/에뮬레이터
```
> WebView 3D는 **개발 빌드(expo run:ios/android)** 또는 Expo Go 모두에서 동작해야 하지만, 기기 성능에 따라 프레임이 달라진다. 저사양 기기에서는 `camera`/해상도 조정이 필요할 수 있다.

## API
- `POST /sessions {level:0|1|2, events:boolean}` → `{id, line, missions}`
- `POST /sessions/:id/turns {text}` → `{line, tags, done?, event?, note?, missions}`
- `POST /sessions/:id/finish` / `GET /sessions/:id` → 결과(미션, 내가 한 말, 배운 표현, 돌발상황, 거절 횟수)
- `GET /me/sessions` → 기록 목록 (헤더 `x-user-id`)
- `POST /speech/stt` (multipart `audio`) → `{text}` — `OPENAI_API_KEY` 필요(Whisper), 없으면 501 → 앱이 입력창으로 안내

## AI 사용 방식 (하이브리드)
- 기본: 규칙 엔진만(키 불필요).
- `ANTHROPIC_API_KEY` 설정 시: 규칙 엔진이 "무슨 말을 할지·끝났는지"를 결정하고, Claude가 사용자 말에 자연스럽게 반응하도록 문장을 다듬는다. 실패/타임아웃이면 규칙 문장 사용. 약속이 반드시 정해지고 끝나도록 상태 판정은 AI에 맡기지 않는다.
- 완전한 자유 대화로 가려면 `DialogueProvider` 를 구현해 교체한다.

## 아바타 ↔ 앱 메시지 (postMessage JSON)
앱→아바타: `speak{on}` `listen{on}` `mood{mood:{happy,relaxed,surprised}}` `gesture{name:wave|thumbs|shrug}` `nod{n}` `shake` `camera{cam:{ey,ez,cy,fov}}`
아바타→앱: `ready` `error{message}`

## 검증 상태 (중요)
- 확인함: `packages/dialogue` 타입체크(tsc)·실행, `apps/api` 의 세션 서비스 로직(스텁 환경에서 실행), `avatar.html` 을 브라우저에서 띄워 `speak`/`mood` 메시지로 입 모양·표정 동작 확인, 줌업 카메라 값 확인.
- 확인하지 못함: `npm install`(개발 환경에서 패키지 서버 접근이 막혀 있었음), NestJS 서버 기동, Expo 앱 빌드/실행, 기기 WebView에서의 3D 성능, 마이크 녹음→STT, 실제 TTS 음성. 첫 실행 때 버전/타입 오류가 나올 수 있다.

## 라이선스 주의
`apps/mobile/assets/Mia.vrm` 은 비영리 개인 사용·수정/재배포 금지·크레딧 표기(JakeMoon) 조건이다. 상업 배포 전에 VRoid에서 라이선스를 바꿔 다시 내보내야 한다.

저장소에는 위 재배포 조건 때문에 `Mia.vrm`을 포함하지 않는다. 로컬 실행 시 사용 권한이 있는 모델을 `apps/mobile/assets/Mia.vrm`과 `apps/mobile/public/Mia.vrm`에 각각 배치한다.
