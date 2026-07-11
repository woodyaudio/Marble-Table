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
    └── restaurants.json    # 식당 데이터
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
→ `data/restaurants.json` 파일 수정

**JSON 구조:**
```json
[
  {
    "id": 1,
    "name": "식당 이름",
    "price": 7500,
    "hours": "중식 11:30~13:30",
    "lat": 37.479932,
    "lng": 126.895215,
    "address": "주소",
    "description": "설명",
    "instagram": "https://instagram.com/..."
  }
]
```

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
- Leaflet.js (지도 라이브러리)
- OpenStreetMap (지도 타일)

## 💡 팁
- 브라우저 캐시 때문에 변경사항이 안 보이면 `Ctrl+Shift+R` (강력 새로고침)
- 지도가 제대로 안 보이면 개발자도구(F12) → Console 탭에서 에러 확인
- 모바일 테스트는 개발자도구 → Toggle device toolbar (Ctrl+Shift+M)
