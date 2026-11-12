# 생일 전하 배포 — Vercel 웹 + 별도 실시간 서버

Vercel 웹과 별도 Node.js 실시간 서버를 연결하는 배포 절차입니다. 실행 방법과 주요 기능은 [README](./README.md)를 참고하세요.

## 1. Git 저장소에 올리기

이 프로젝트 폴더 전체를 저장소 루트로 사용합니다. public/models, public/images, public/fonts, shared, server, package-lock.json을 포함해야 합니다.
node_modules, dist, 실제 .env 파일은 .gitignore에서 제외합니다. design 폴더는 참고 시안이며 실행 필수는 아닙니다.

소스 저장소: [fmark22/bday](https://github.com/fmark22/bday). 배포할 변경사항과 public의 실행 에셋이 저장소에 포함되어 있는지 확인합니다.

## 2. Vercel 프로젝트 생성

Git 저장소를 연결하고 Framework를 Vite로 선택합니다. vercel.json에 다음 설정이 들어 있습니다.

- Root Directory: package.json이 있는 프로젝트 루트
- Install Command: npm ci
- Build Command: npm run build
- Output Directory: dist
- Node.js: 22.x

Vercel 프로젝트의 실제 Production 도메인을 먼저 확인합니다. 예: https://bday-jeonha.vercel.app (예시이므로 실제 주소로 바꾸세요.)
실시간 서버 주소를 아직 모르면 도메인만 확인한 뒤 3단계를 진행합니다. VITE_SOCKET_URL이 없으면 Vercel 빌드는 의도적으로 실패합니다.

## 3. 실시간 서버 배포

예를 들어 Render의 New → Web Service에서 같은 저장소를 연결합니다.

- Runtime: Node
- Root Directory: 프로젝트 루트. server 폴더로 지정하면 shared 경로를 찾지 못합니다.
- Build Command: npm ci --omit=dev
- Start Command: npm start
- Health Check Path: /health
- Instances: 1 (방 상태가 메모리에 있으므로 여러 인스턴스로 늘리지 마세요.)

서버 호스팅의 환경변수:

```text
NODE_ENV=production
CLIENT_ORIGIN=https://실제-웹-도메인.vercel.app
```

CLIENT_ORIGIN에는 웹 주소의 origin만 넣습니다. 뒤 슬래시, /?room=... 같은 경로·쿼리는 넣지 않습니다.
여러 웹 도메인을 허용하려면 쉼표로 구분합니다. 예: https://app.example.com,https://your-project.vercel.app
Vercel Preview 주소는 자동 허용하지 않습니다. 테스트할 실제 Preview origin을 추가하거나 Production 주소를 사용하세요.
PORT는 호스팅에서 제공하는 값을 사용하며, 서버는 0.0.0.0에 바인딩합니다.

서버 배포 후 https://실제-서버-도메인/health 를 열어 {"ok":true} 응답을 확인합니다.
서버 루트 /에는 웹 화면이 나오지 않습니다. 웹 화면은 Vercel에서 제공합니다.

## 4. Vercel 환경변수 입력 후 배포

```text
VITE_SOCKET_URL=https://실제-서버-도메인
```

/socket.io 경로와 방 코드는 붙이지 않습니다. https 주소를 사용합니다.
이 값은 웹 빌드 시 포함되므로 변경한 뒤 반드시 Redeploy합니다. Production과 테스트할 Preview 환경에 각각 적용합니다.
Vercel에 CLIENT_ORIGIN만 넣어서는 서버 설정이 바뀌지 않습니다. CLIENT_ORIGIN은 서버 호스팅에 넣습니다.

## 5. 배포 주소로 확인

- 브라우저 두 개 또는 서로 다른 기기에서 같은 웹 주소와 ?room=같은방코드로 접속
- 한 명은 주인공, 다른 한 명은 선물 선택 후 입장
- 접속 인원, 채팅, 선물 전달·착용이 양쪽에 반영되는지 확인
- 대관식 시작 → 이동 → 착석 → 왕관 착용, 소리·축하 효과 확인
- ?demo=1은 서버 연결을 하지 않는 단독 체험입니다. 다중 접속 검증에는 사용하지 않습니다.

현재 상태는 서버 메모리에만 저장됩니다. 서버 재시작·재배포 또는 마지막 참가자 퇴장 시 방과 채팅·선물이 사라집니다.
서버가 중지·절전되면 실시간 접속이 끊어질 수 있으므로 파티 진행 중에는 계속 실행되는 호스팅 설정을 사용하세요.

## 검증 명령

```text
npm test
npm run build
npm run test:deploy
```

test:deploy는 외부 서비스 없이 로컬 서버와 실제 WebSocket 클라이언트 두 개를 실행해 production 시작, health, 동시 접속, 선물 동기화, origin 제한을 검사합니다.
배포된 외부 주소 및 실제 여러 기기 검증은 별도입니다.

공식 안내: https://vercel.com/docs/frameworks/frontend/vite · https://render.com/docs/deploy-node-express-app · https://render.com/docs/web-services
