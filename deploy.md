# 민열지식로그 웹 배포 가이드

## 🚀 GitHub Pages 배포

### 1. GitHub 저장소 생성

1. GitHub.com에 로그인
2. "New repository" 클릭
3. 저장소 이름: `minyeol-knowledge-log` (또는 원하는 이름)
4. Public으로 설정
5. "Create repository" 클릭

### 2. 파일 업로드

1. 생성된 저장소에 다음 파일들을 업로드:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `favicon.svg`
   - `README.md`

2. 업로드 방법:
   - "Add file" > "Upload files" 클릭
   - 파일들을 드래그 앤 드롭
   - "Commit changes" 클릭

### 3. GitHub Pages 활성화

1. 저장소 Settings 탭 클릭
2. 왼쪽 메뉴에서 "Pages" 클릭
3. Source 섹션에서:
   - "Deploy from a branch" 선택
   - Branch: "main" 선택
   - Folder: "/ (root)" 선택
4. "Save" 클릭

### 4. 접근 URL 확인

- 배포 완료 후 `https://username.github.io/repository-name`으로 접근 가능
- 배포에는 몇 분 정도 소요될 수 있음

## 🔐 GitHub OAuth 설정

### 1. OAuth App 생성

1. GitHub.com > Settings > Developer settings > OAuth Apps
2. "New OAuth App" 클릭
3. 다음 정보 입력:
   - **Application name**: 민열지식로그
   - **Homepage URL**: `https://username.github.io/repository-name`
   - **Authorization callback URL**: `https://username.github.io/repository-name`
4. "Register application" 클릭

### 2. Client ID 설정

1. 생성된 OAuth App에서 Client ID 복사
2. `script.js` 파일의 `GITHUB_CLIENT_ID` 변수에 붙여넣기:
   ```javascript
   const GITHUB_CLIENT_ID = 'your_actual_client_id_here';
   ```

### 3. 파일 업데이트 및 재배포

1. 수정된 `script.js` 파일을 GitHub에 업로드
2. GitHub Pages가 자동으로 재배포됨

## 📝 사용자 가이드

### 첫 사용자

1. 웹사이트 접속: `https://username.github.io/repository-name`
2. "GitHub 로그인" 버튼 클릭
3. GitHub 계정으로 로그인 및 권한 승인
4. 로그인 완료 후 자동으로 사용자별 데이터 로드

### 기존 사용자

1. 웹사이트 접속
2. 자동으로 로그인 상태 확인
3. 사용자별 데이터 자동 로드

## 🔧 문제 해결

### 배포 문제

- **페이지가 열리지 않는 경우**:
  - GitHub Pages 설정 확인
  - 저장소가 Public인지 확인
  - 배포 상태 확인 (Settings > Pages)

### OAuth 문제

- **로그인이 안 되는 경우**:
  - OAuth App 설정 확인
  - Client ID가 올바른지 확인
  - Callback URL이 정확한지 확인

### 데이터 문제

- **데이터가 저장되지 않는 경우**:
  - GitHub 로그인 상태 확인
  - 인터넷 연결 확인
  - 브라우저 콘솔에서 오류 확인

## 📊 모니터링

### 사용자 통계

- GitHub 저장소 Insights에서 방문자 통계 확인 가능
- OAuth App 설정에서 사용자 수 확인 가능

### 성능 모니터링

- 브라우저 개발자 도구에서 성능 확인
- GitHub Pages는 CDN을 통해 빠른 로딩 제공
