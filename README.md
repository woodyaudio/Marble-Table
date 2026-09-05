# Woody-Table 프로젝트 구조

## 📁 파일 구조
```
/project-root
│
├── index.html              # 메인 페이지 (탭 네비게이션)
├── map-tab.html            # 지도 탭 (식당 지도 및 목록)
├── game-tab.html           # 게임 탭
├── contact-tab.html        # 문의 탭
│
└── /data
    ├── restaurants.xlsx    # 식당 데이터 (브라우저에서 SheetJS로 직접 파싱)
    └── subway_slim.json    # 지하철 노선/역 데이터
```

## 🚀 사용 방법

### 로컬 서버 실행
이 프로젝트는 `fetch()` API를 사용하므로 **로컬 서버**가 필요합니다.

**방법 1: Python 서버**
```bash
# Python 3
python -m http.server 5500

# 브라우저에서 http://localhost:5500 접속
```

**방법 2: VS Code Live Server**
- VS Code에서 `index.html` 우클릭
- "Open with Live Server" 선택

**방법 3: Node.js http-server**
```bash
npx http-server -p 5500
```

## 📝 수정 가이드

### 지도 관련 수정
→ `map-tab.html` 파일 수정

**예시:**
- 마커 아이콘 변경 → `createIcon()` 함수
- 필터 버튼 스타일 → `<style>` 섹션의 `.filter-item`
- 홈 버튼 위치 → `goHome()` 함수의 `homeLoc.lat + 0.0006` 값 조정
- 검색 기능 수정 → `filterData()` 함수

### 게임 기능 추가
→ `game-tab.html` 파일 수정

### 문의 기능 추가
→ `contact-tab.html` 파일 수정

### 식당 데이터 관리
→ `data/restaurants.xlsx` 파일 수정 (엑셀에서 직접 편집 후 저장하면 됨)

**엑셀 컬럼 구조** (1행: 헤더, 2행부터 데이터):
| id | 이름 | 지역 | 주소 | lat | lng | 설명 | 가격 | 영업 시간 | 인스타 | 카카오 |
|---|---|---|---|---|---|---|---|---|---|---|

`lat`/`lng`는 위도/경도를 직접 숫자로 입력 (네이버 지도 등에서 좌표를 확인해 입력). 컬럼 매핑은 [map-tab.html](map-tab.html)의 `headerMap` 참고.

### 새 탭 추가하기

1. **새 HTML 파일 생성**
   ```html
   <!-- newtab-tab.html -->
   <style>
     /* 스타일 */
   </style>
   <div id="newtab-container">
     <!-- 내용 -->
   </div>
   <script>
     // 로직
   </script>
   ```

2. **index.html에 탭 버튼 추가**
   ```html
   <div class="tab-item" onclick="loadTab('newtab')">
     <div class="tab-icon">🎨</div>
     <div>새 탭</div>
   </div>
   ```

## 🔧 기술 스택
- HTML5 / CSS3 / JavaScript (Vanilla)
- 네이버 지도 API v3 (Web Dynamic Map + Geocoder)
- SheetJS (엑셀 데이터 파싱)
- Firebase Firestore (한줄평/인기도/문의)

## 🗺️ 네이버 지도 API 키 설정
지도는 [네이버 지도 API v3](https://navermaps.github.io/maps.js.ncp/)를 사용하며, [index.html](index.html)의 `<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...">` 태그에 발급받은 **Client ID**를 넣어야 지도가 표시됩니다.

**발급 방법**
1. [네이버 클라우드 플랫폼](https://www.ncloud.com) 가입 (무료)
2. 콘솔 → Application Services → Maps → Application 등록
3. 등록한 Application에서 **Web Dynamic Map**, **Geocoding** 서비스 활성화 (Dynamic Map 체크 안 하면 429 오류 발생)
4. Service URL(허용 도메인)에 배포 주소 등록 — 지금은 `https://woodyaudio.github.io`, 나중에 커스텀 도메인을 사면 콘솔에서 추가만 하면 됨 (코드 변경 불필요)
5. 발급된 Client ID를 `index.html`의 `ncpKeyId=` 뒤에 그대로 입력 (공개용 클라이언트 키라 코드에 노출돼도 안전)

Application 이름은 `Client ID`에 대응하는 NCP 내부 식별자일 뿐 사용자에게 노출되지 않으며, 영문자/숫자/하이픈만 허용됩니다(한글 불가).

무료 이용량은 등록 즉시 콘솔에서 실측 확인 가능 (2026-09-05 기준, 이 프로젝트 계정): Geocoding 월 3,000,000회, Dynamic Map 월 6,000,000회. 로컬 개발 중 `localhost`에서도 지도를 띄우려면 콘솔의 Service URL 목록에 `http://localhost:5500`(또는 사용하는 포트)을 추가로 등록하면 됩니다.

## 💡 팁
- 브라우저 캐시 때문에 변경사항이 안 보이면 `Ctrl+Shift+R` (강력 새로고침)
- 지도가 제대로 안 보이면 개발자도구(F12) → Console 탭에서 에러 확인
- 모바일 테스트는 개발자도구 → Toggle device toolbar (Ctrl+Shift+M)
