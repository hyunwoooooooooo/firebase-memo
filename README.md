# 온리노트 (Firebase Memo)

이메일로 회원가입하고 어느 기기에서든 자신의 메모 한 개를 저장하고 불러오는 학습용 웹앱입니다.

## 사용 기술

- HTML / CSS / JavaScript
- Firebase Authentication
- Cloud Firestore
- GitHub
- Vercel

## 1. Firebase 프로젝트 연결

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트를 만듭니다.
2. 프로젝트 개요에서 웹 앱(`</>`)을 추가합니다.
3. 표시되는 `firebaseConfig` 값을 복사합니다.
4. `app.js` 위쪽의 `firebaseConfig` 예시 값을 실제 값으로 바꿉니다.

Firebase 웹 앱의 `firebaseConfig`는 프로젝트 식별 정보입니다. 데이터 접근 권한은 아래의 Firestore 보안 규칙으로 제한합니다. Firebase Admin SDK 서비스 계정 키나 다른 서비스의 비밀키는 이 저장소에 넣지 마세요.

## 2. 이메일 회원가입 활성화

Firebase Console에서 다음 메뉴로 이동합니다.

```text
Build → Authentication → 시작하기 → Sign-in method → Email/Password → 사용 설정
```

## 3. Firestore 만들기와 규칙 적용

1. `Build → Firestore Database → 데이터베이스 만들기`를 누릅니다.
2. Standard edition과 사용할 지역을 선택합니다.
3. Production mode로 시작합니다.
4. Firestore의 `Rules` 탭을 엽니다.
5. 이 프로젝트의 `firestore.rules` 전체 내용을 붙여넣고 `게시`를 누릅니다.

이 규칙은 로그인한 사용자가 `memos/{자신의 UID}` 문서만 읽고 쓰게 합니다.

## 4. 로컬에서 실행

HTML 파일을 직접 더블클릭하지 말고 이 폴더에서 간단한 웹 서버를 실행합니다.

```powershell
cd "C:\Users\hyun9\Documents\ChatGPT\github 배포\firebase-memo"
python -m http.server 5500
```

브라우저에서 <http://localhost:5500>으로 접속합니다.

최근 생성한 Firebase 프로젝트에서는 `localhost`가 자동 허용되지 않을 수 있습니다. 로그인이 막히면 Firebase Console에서 다음 메뉴로 이동해 `localhost`를 추가합니다.

```text
Authentication → Settings → Authorized domains → Add domain
```

## 5. GitHub 저장소 만들기

GitHub에 `firebase-memo`라는 빈 Private 저장소를 만든 뒤, 이 폴더에서 실행합니다. 아래 주소의 `내아이디`는 실제 GitHub 사용자 이름으로 바꿉니다.

```powershell
git init
git add .
git commit -m "Firebase 회원 메모장 만들기"
git branch -M main
git remote add origin https://github.com/내아이디/firebase-memo.git
git push -u origin main
```

## 6. Vercel 배포

1. [Vercel](https://vercel.com/)에 GitHub 계정으로 로그인합니다.
2. `Add New → Project`를 누릅니다.
3. `firebase-memo` 저장소를 Import합니다.
4. Framework Preset은 `Other`, Root Directory는 기본값으로 둡니다.
5. 별도 Build Command와 Output Directory를 입력하지 않고 `Deploy`를 누릅니다.
6. 배포된 `프로젝트이름.vercel.app` 도메인을 Firebase의 `Authorized domains`에 추가합니다.

`main` 브랜치에 새 커밋을 push하면 Vercel이 자동으로 다시 배포합니다.

## Firestore 데이터 구조

```text
memos
└── Firebase 사용자 UID
    ├── content: 메모 내용
    └── updatedAt: 마지막 저장 시간
```
