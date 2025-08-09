# 민열지식로그

한국어 기반의 블로그 구독 및 포스트 관리 웹 애플리케이션입니다.

## 🌟 주요 기능

- **블로그 구독**: RSS 피드를 통한 블로그 구독
- **포스트 관리**: 구독한 블로그의 포스트 목록 표시
- **폴더 관리**: 포스트를 폴더별로 분류 및 관리
- **메모 기능**: 포스트별 메모 작성 및 저장
- **클라우드 저장**: GitHub Gist를 통한 사용자별 데이터 저장
- **웹 배포**: GitHub Pages를 통한 웹 접근 가능
- **사용자별 데이터**: GitHub 계정별로 개별 데이터 관리

## 🚀 배포 방법

### 1. GitHub Pages 배포

1. **GitHub 저장소 생성**
   - GitHub.com에 로그인
   - "New repository" 클릭
   - 저장소 이름: `minyeol-knowledge-log` (또는 원하는 이름)
   - Public으로 설정
   - "Create repository" 클릭

2. **파일 업로드**
   - 생성된 저장소에 다음 파일들을 업로드:
     - `index.html`
     - `styles.css`
     - `script.js`
     - `favicon.svg`
     - `README.md`
     - `.github/workflows/deploy.yml`

3. **GitHub Pages 활성화**
   - 저장소 Settings > Pages
   - Source를 "Deploy from a branch"로 설정
   - Branch를 "main"으로 설정
   - Save 클릭

4. **접근 URL**
   - 배포 완료 후 `https://username.github.io/repository-name`으로 접근 가능
   - 배포에는 몇 분 정도 소요될 수 있음

### 2. GitHub OAuth 설정

클라우드 저장 기능을 사용하려면 GitHub OAuth App을 생성해야 합니다:

1. **GitHub OAuth App 생성**
   - GitHub.com > Settings > Developer settings > OAuth Apps
   - "New OAuth App" 클릭
   - 다음 정보 입력:
     - **Application name**: 민열지식로그
     - **Homepage URL**: `https://username.github.io/repository-name`
     - **Authorization callback URL**: `https://username.github.io/repository-name`

2. **Client ID 설정**
   - 생성된 OAuth App에서 Client ID 복사
   - `script.js` 파일의 `GITHUB_CLIENT_ID` 변수에 붙여넣기:
   ```javascript
   const GITHUB_CLIENT_ID = 'your_actual_client_id_here';
   ```

3. **파일 업데이트 및 재배포**
   - 수정된 `script.js` 파일을 GitHub에 업로드
   - GitHub Pages가 자동으로 재배포됨

## 📝 사용법

### 첫 사용자

1. **웹사이트 접속**: `https://username.github.io/repository-name`
2. **GitHub 로그인**: "GitHub 로그인" 버튼 클릭
3. **권한 승인**: GitHub 계정으로 로그인 및 권한 승인
4. **데이터 로드**: 로그인 완료 후 자동으로 사용자별 데이터 로드

### 기존 사용자

1. **웹사이트 접속**: `https://username.github.io/repository-name`
2. **자동 로그인**: 자동으로 로그인 상태 확인
3. **데이터 로드**: 사용자별 데이터 자동 로드

### 블로그 구독

- 상단 URL 입력란에 블로그 주소 입력
- "구독" 버튼 클릭

### 포스트 관리

- **단일 클릭**: 포스트 선택하여 메모 표시
- **더블 클릭**: 포스트 내용을 프로그램 내에서 표시
- **읽기 상태**: "읽기" ↔ "읽는 중" 토글
- **다 읽음**: 별도 버튼으로 완독 표시

### 폴더 관리

- "새 폴더" 버튼으로 폴더 생성
- 폴더 더블클릭으로 이름 변경
- 포스트를 폴더로 드래그 앤 드롭
- 폴더 옆 삭제 버튼으로 폴더 삭제

### 메모 시스템

- 포스트 선택 시 자동으로 메모 로드
- 메모 작성 후 "저장" 버튼 클릭
- 로그인 시 클라우드에 저장, 미로그인 시 로컬에 저장

## 📁 파일 구조

```
민열지식로그/
├── index.html                    # 메인 HTML 파일
├── styles.css                    # 스타일시트
├── script.js                     # JavaScript 로직
├── favicon.svg                   # 아이콘
├── README.md                     # 이 파일
├── deploy.md                     # 웹 배포 가이드
├── .github/workflows/deploy.yml  # GitHub Actions 배포 설정
├── CNAME                         # 커스텀 도메인 설정
└── 지식로그 폴더/                 # 메모 저장 폴더 (로컬용)
```

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: GitHub Gist API, localStorage
- **Authentication**: GitHub OAuth 2.0
- **Deployment**: GitHub Pages
- **Font**: Noto Sans KR
- **Browser**: Chrome (권장)

## 🛠️ 문제 해결

### GitHub 로그인이 안 되는 경우

- GitHub OAuth App 설정이 올바른지 확인
- Client ID가 올바르게 설정되었는지 확인
- Callback URL이 정확한지 확인

### 데이터가 저장되지 않는 경우

- GitHub 로그인 상태 확인
- 인터넷 연결 상태 확인
- 브라우저 콘솔에서 오류 메시지 확인

### 웹 페이지가 열리지 않는 경우

- GitHub Pages 설정 확인
- 저장소가 Public인지 확인
- 배포 상태 확인 (Settings > Pages)

### OAuth 앱 설정 문제

- GitHub OAuth App이 올바르게 생성되었는지 확인
- Client ID와 Client Secret이 정확한지 확인
- Callback URL이 웹사이트 URL과 일치하는지 확인

## 📊 모니터링

### 사용자 통계

- GitHub 저장소 Insights에서 방문자 통계 확인 가능
- OAuth App 설정에서 사용자 수 확인 가능

### 성능 모니터링

- 브라우저 개발자 도구에서 성능 확인
- GitHub Pages는 CDN을 통해 빠른 로딩 제공

## 🔄 업데이트

### 자동 배포

- GitHub Actions를 통한 자동 배포
- main 브랜치에 push하면 자동으로 GitHub Pages에 배포

### 수동 배포

- GitHub 저장소 Settings > Pages에서 수동 배포 가능
- 배포 상태 및 로그 확인 가능

## 📄 라이선스

MIT License

## 👨‍💻 개발자

민열
