# 생일 전하 — Vercel 통합 배포

웹과 실시간 API를 같은 Vercel 프로젝트에 배포합니다. 별도 Render 서버는 필요하지 않습니다.
방 상태와 이벤트 전달에는 Upstash Redis를 사용합니다.

## 한 번만 설정하기

1. Vercel 프로젝트의 **Storage → Create Database → Upstash Redis**에서 Redis를 생성하거나 기존 저장소를 연결합니다.
2. Production과 사용할 Preview 환경을 선택합니다.
3. **Settings → Environment Variables**에 Redis TCP 접속 정보인 `REDIS_URL` 또는 `KV_URL`이 등록되었는지 확인합니다. 값은 `rediss://...` 형식입니다. REST 주소나 REST 토큰을 `REDIS_URL`에 넣지 않습니다.
4. 프로젝트의 Framework는 Vite, Root Directory는 이 저장소 루트로 설정합니다.
5. Git 변경사항을 push하고 새 배포를 실행합니다.

Redis 비밀번호와 접속 URL은 서버에서만 사용합니다. `VITE_` 접두사를 붙이거나 저장소에 커밋하지 않습니다.
기존 분리 배포용 `VITE_SOCKET_URL`과 `CLIENT_ORIGIN`은 Vercel 통합 배포에서는 제거합니다.
기존 `VITE_SOCKET_URL`을 남겨두면 웹이 예전 실시간 서버로 연결됩니다.

## 배포 설정

| 항목 | 값 |
| --- | --- |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 22.x |
| API | `api/realtime.js` (공유 서버: `api/socket-io.js`) |
| WebSocket 경로 | `/api/realtime` (끝 슬래시 없음) |
| 상태 확인 | `/api/socket-io/health` |

Vercel Functions의 WebSocket 지원을 사용하며 클라이언트는 WebSocket 전송으로 연결합니다.
API는 HTTP 서버를 export하고, Vercel에서는 직접 listen하지 않습니다.
`vercel.json`에서 API 하위 경로 라우팅과 최대 실행 시간 300초를 설정합니다.

## 다중 접속과 재연결

- Redis에 방 상태를 저장하고, 원자적 비교·교체로 동시에 두 사람이 주인공이 되는 문제와 선물 중복 전달을 막습니다.
- 상태 저장과 Pub/Sub 알림은 하나의 Lua 작업으로 처리합니다. 서로 다른 Function 인스턴스의 접속자도 같은 방 상태를 공유합니다.
- 상태에는 버전이 있어 늦게 도착한 이전 상태로 화면이 되돌아가지 않습니다.
- 연결이 끊기면 클라이언트가 자동 재접속하며 같은 세션으로 역할·캐릭터·선물 상태를 복원합니다. 복구 유예 시간은 60초, 활동 없는 연결의 유효 시간은 75초입니다.
- 연결은 20초마다 활동 상태를 갱신합니다. 방 저장 데이터는 마지막 갱신으로부터 6시간 후 만료됩니다.
- 모든 참가자의 유효 시간이 만료된 방에 새로 입장하면 새 파티를 시작합니다.
- 세션 토큰은 해당 브라우저 탭의 sessionStorage에 저장하며 다른 참가자의 상태에는 노출하지 않습니다.

Vercel Functions는 최대 실행 시간에 도달하면 WebSocket을 종료합니다. 재연결은 정상 동작의 일부입니다.
Redis가 연결되지 않은 Vercel 배포에서는 메모리 모드로 조용히 전환하지 않고 시작 오류를 냅니다.

## 로컬 실행

Redis 없이도 기존처럼 실행할 수 있습니다. 이때는 로컬 서버 한 개의 메모리 모드를 사용합니다.

```bash
npm ci
npm run server
```

다른 터미널:

```bash
npm run dev
```

로컬에서도 Redis를 사용하려면 서버 프로세스에 REDIS_URL을 설정합니다. Node 서버가 .env 파일을 자동으로 읽지는 않습니다.
동일 Redis에 있는 운영 데이터와 섞이지 않도록 로컬 테스트에는 `BDAY_REDIS_NAMESPACE`를 별도 설정합니다.

## 검증

```bash
npm test
npm run build
npm run test:deploy
```

`test:deploy`는 별도 HTTP 서버 두 개와 실제 WebSocket 클라이언트를 연결합니다.
기본값은 공유 메모리 저장소이며, `TEST_REDIS_URL`을 설정하면 독립 Redis 연결을 쓰는 두 인스턴스로 검증합니다.
테스트용 Redis 키는 임의의 독립 namespace에 만들고 종료 시 해당 키만 지웁니다.

배포된 주소를 검증하려면:

```bash
npm run test:live -- https://실제-프로젝트.vercel.app
```

별도 테스트 방에 주인공과 손님을 입장시켜 상태 확인, 채팅, 선물, 이동, 착석, 왕관, 재접속을 검사합니다.
다른 사람이 사용 중인 방에는 참여하지 않습니다. Vercel 배포 보호가 활성화된 주소는 인증 없이는 검증할 수 없습니다.

## 현재 검증 범위

- 로컬 게임 규칙·모델·오디오 및 웹 빌드 검증
- 실제 WebSocket을 사용하는 서버 두 개의 채팅·선물·이동·재접속 복구
- 로컬 Redis 호환 서버(fakeredis + Lua)에 독립 연결한 두 인스턴스의 동기화와 주인공 동시 입장 경쟁
- 실제 Upstash와 실제 Vercel 운영 주소 검증은 계정 연결 후 별도 수행 필요

참고: [Vercel WebSockets](https://vercel.com/docs/functions/websockets) · [Upstash Vercel 연결](https://upstash.com/docs/redis/howto/vercelintegration)
