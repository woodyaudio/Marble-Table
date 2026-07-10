
(function() {
    let restaurantsData = [];
    
    // 기본값
    const defaultCompanyLoc = { lat: 37.479932, lng: 126.895215 };
    
    // 로컬 스토리지에서 위치 불러오기
    let savedHomeLoc = localStorage.getItem('woody_home_loc') ? JSON.parse(localStorage.getItem('woody_home_loc')) : null;
    let savedCompanyLoc = localStorage.getItem('woody_company_loc') ? JSON.parse(localStorage.getItem('woody_company_loc')) : defaultCompanyLoc;
    
    // 초기 지도의 중심점
    let centerLoc = savedCompanyLoc;

    let map, markerLayer, selectedMarkerId = null, markerMap = {};
    let homeMarker = null, companyMarker = null, gpsMarker = null;
    
    // 위치 지정 모드 여부 확인
    const pickerMode = localStorage.getItem('woody_location_picker_mode'); // 'home' or 'company'
    const searchedLocStr = localStorage.getItem('woody_picker_search_loc');
    
    // 탭 이동 시 위치 지정 모드 유지 방지 (읽은 후 즉시 삭제)
    localStorage.removeItem('woody_location_picker_mode');
    localStorage.removeItem('woody_picker_search_loc');
    
    let currentTileLayer;
    
    // 테마 설정 (0: Voyager, 1: Positron, 2: Stadia Smooth Dark)
    const THEMES = [
        { name: '🌎 기본맵', url: 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', bg: 'rgba(255,255,255,0.7)', color: '#333', isStadia: true },
        { name: '☀️ 라이트', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', bg: '#f1f5f9', color: '#1e293b' },
        { name: '🌃 다크맵', url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', bg: '#1e293b', color: '#fff', isStadia: true, filterClass: 'dark-map-filter' }
    ];
    let currentThemeIndex = parseInt(localStorage.getItem('woody_map_theme')) || 0;
    
    // 파이어베이스 관련 변수
    let db;
    let unsubscribeReviews = null;

    async function initFirebase() {
        try {
            const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js');
            const { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
            
            const firebaseConfig = {
                apiKey: "AIzaSyAaMivo3ZBcwS5OjDjXmCo9kZo47t0rZBc",
                authDomain: "woody-table.firebaseapp.com",
                projectId: "woody-table",
                storageBucket: "woody-table.firebasestorage.app",
                messagingSenderId: "640333501525",
                appId: "1:640333501525:web:db00602be7d7e8742c30dc"
            };
            const apps = getApps();
            const app = apps.length ? apps[0] : initializeApp(firebaseConfig);
            db = getFirestore(app);
            
            window.fsCollection = collection;
            window.fsAddDoc = addDoc;
            window.fsQuery = query;
            window.fsOrderBy = orderBy;
            window.fsLimit = limit;
            window.fsOnSnapshot = onSnapshot;
            window.fsServerTimestamp = serverTimestamp;
        } catch(e) { console.error("Firebase init err:", e); }
    }

    async function init() {
        if (typeof L === 'undefined') { setTimeout(init, 100); return; }
        const isMobile = window.innerWidth <= 768;
        map = L.map('map', { zoomControl: false }); // 초기 좌표 설정은 하단에서 수행
        
        // 사용자가 마지막으로 선택한 테마 또는 기본 테마 로드
        const t = THEMES[currentThemeIndex];
        currentTileLayer = L.tileLayer(t.url, {
            attribution: t.isStadia ? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            className: t.filterClass || ''
        }).addTo(map);

        markerLayer = L.layerGroup().addTo(map);

        // 회사 위치 마커
        companyMarker = L.marker([savedCompanyLoc.lat, savedCompanyLoc.lng], { 
            icon: L.divIcon({ html: `<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:20px; background:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:3px solid #ef4444;">🏢</div><div style="margin-top:4px; font-size:11px; font-weight:700; color:#dc2626; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; white-space:nowrap;">회사</div></div>`, className: '', iconSize: [100, 60] }) 
        }).addTo(map);

        // 집 위치 마커 (있을 경우만)
        if (savedHomeLoc) {
            homeMarker = L.marker([savedHomeLoc.lat, savedHomeLoc.lng], { 
                icon: L.divIcon({ html: `<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:20px; background:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:3px solid #ef4444;">🏠</div><div style="margin-top:4px; font-size:11px; font-weight:700; color:#dc2626; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; white-space:nowrap;">집</div></div>`, className: '', iconSize: [100, 60] }) 
            }).addTo(map);
        }

        // GPS 로 시작 위치 결정 (pickerMode 제외)
        if (pickerMode) {
            // 피커 모드일 경우: 검색 좌표 또는 회사 위치
            let initialLat = centerLoc.lat;
            let initialLng = centerLoc.lng;
            if (searchedLocStr) {
                try {
                    const parsed = JSON.parse(searchedLocStr);
                    if (parsed.lat && parsed.lng) { initialLat = parsed.lat; initialLng = parsed.lng; }
                } catch(e) {}
            }
            map.setView([isMobile ? initialLat - 0.0006 : initialLat, initialLng], 17);
        } else {
            // 일반 모드: GPS 우선, 실패 시 회사 위치
            map.setView([isMobile ? centerLoc.lat - 0.0006 : centerLoc.lat, centerLoc.lng], 17);
            startGPS(false); // 지도를 GPS로 이동 (isMobile 동일하게 적용)
        }

        // 검색 모드 UI 활성화
        if (pickerMode) {
            document.getElementById('picker-crosshair').classList.add('active');
            document.getElementById('location-picker-ui').classList.add('active');
            document.getElementById('picker-title').innerText = pickerMode === 'home' ? '🏠 집 위치 지정' : '🏢 회사 위치 지정';
            
            // 모바일에서 왼쪽 패널이 화면을 가리지 않도록 자동 접기
            document.getElementById('left-panel').classList.add('collapsed');
        }

        // ✅ 지도 빈 공간 클릭 시 선택 해제
        map.on('click', function() {
            if (selectedMarkerId !== null) {
                closeDetail();
            }
        });

        try {
            await initFirebase();
            const res = await fetch(`./data/restaurants.xlsx?v=${Date.now()}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const arrayBuffer = await res.arrayBuffer();

            // SheetJS로 XLSX 파싱
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            // 1행: 헤더, 2행~: 데이터
            const headerMap = {
                'id': 'id', '이름': 'name', '지역': 'region', '주소': 'address',
                'lat': 'lat', 'lng': 'lng', '설명': 'description',
                '가격': 'price', '영업 시간': 'hours',
                '인스타': 'instagram', '카카오': 'kakaoChannel'
            };
            const headers = rows[0].map(h => headerMap[String(h).trim()] || String(h).trim());

            restaurantsData = rows.slice(1)
                .map(row => {
                    const obj = {};
                    headers.forEach((key, i) => { obj[key] = row[i]; });
                    return obj;
                })
                .filter(r => r.name && String(r.name).trim() !== '' && String(r.name).trim() !== 'Dev_Test')
                .map(r => ({
                    id:           parseInt(r.id) || 0,
                    name:         String(r.name).trim(),
                    region:       r.region && String(r.region).trim() !== '' ? String(r.region).trim() : '미지정',
                    address:      r.address ? String(r.address).trim() : '',
                    lat:          parseFloat(r.lat) || 0,
                    lng:          parseFloat(r.lng) || 0,
                    description:  r.description && String(r.description).trim() !== '' ? String(r.description).trim() : '',
                    price:        parseInt(r.price) || 0,
                    hours:        r.hours ? String(r.hours).trim() : '',
                    instagram:    (r.instagram && String(r.instagram).trim() !== '' && String(r.instagram).trim().toLowerCase() !== 'null') ? String(r.instagram).trim() : null,
                    kakaoChannel: (r.kakaoChannel && String(r.kakaoChannel).trim() !== '' && String(r.kakaoChannel).trim().toLowerCase() !== 'null') ? String(r.kakaoChannel).trim() : null
                }));

            // 지역 옵션 동적 생성
            const regions = [...new Set(restaurantsData.map(r => r.region))].filter(r => r && r !== '미지정').sort();
            const regionSelect = document.getElementById('regionFilter');
            regionSelect.innerHTML = '<option value="all">지역 전체</option>'; // 초기화
            regions.forEach(rg => {
                const opt = document.createElement('option');
                opt.value = rg;
                opt.text = rg;
                regionSelect.appendChild(opt);
            });

            // 지역 미지정이 있으면 맨 뒤에 추가
            if (restaurantsData.some(r => r.region === '미지정')) {
                const opt = document.createElement('option');
                opt.value = '미지정';
                opt.text = '미지정';
                regionSelect.appendChild(opt);
            }

            filterData();

            // 다른 탭에서 식당 클릭 후 지도 탭으로 전환된 경우 자동 선택
            if (window._pendingSelectId !== undefined) {
                const pendingId = window._pendingSelectId;
                delete window._pendingSelectId;
                setTimeout(() => window.selectRestaurant(pendingId), 100);
            }

            // 다른 탭에서 위치 이동(GPS/Home) 후 지도 탭으로 전환된 경우
            if (window._pendingAction !== undefined) {
                const action = window._pendingAction;
                delete window._pendingAction;
                setTimeout(() => {
                    if (action === 'gps') window.moveToGPS();
                    else if (action === 'home') window.goHome();
                }, 100);
            }
        } catch(e) {
            console.error('Data fetch error:', e);
            document.getElementById('restaurantCards').innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444; font-size: 0.9em; font-weight: 700;">데이터를 불러오지 못했습니다.<br>새로고침 해주세요.</div>`;
        }
    }

    // ✅ 마커 아이콘 생성 함수 (선택 여부에 따라 다른 디자인)
    function createIcon(name, isSelected = false) {
        if (isSelected) {
            // 선택된 마커: 물방울 스타일 + 굵은 글씨
            return L.divIcon({
                html: `<div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="width:30px;height:30px;background:rgba(56,189,248,0.9);border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;animation:marker-focus 0.4s forwards;">
                        <div style="width:10px;height:10px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div>
                    </div>
                    <div style="margin-top:4px; font-size:11px; font-weight:700; color:#0c3060; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; white-space:nowrap;">${name}</div>
                </div>
                <style>@keyframes marker-focus { 100% { transform: scale(1.3) translateY(-8px) rotate(-45deg); } }</style>`,
                className: '',
                iconSize: [100, 60],
                iconAnchor: [50, 30]
            });
        } else {
            // 기본 마커: 포크 이모지 + 작고 얇은 글씨
            return L.divIcon({
                html: `<div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="width:30px; height:30px; background:#fff; border:2.5px solid #3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px;">🍴</div>
                    <div style="margin-top:3px; font-size:9px; font-weight:500; color:#334155; text-shadow:-0.5px -0.5px 0 #fff, 0.5px -0.5px 0 #fff, -0.5px 0.5px 0 #fff, 0.5px 0.5px 0 #fff; white-space:nowrap;">${name}</div>
                </div>`,
                className: '',
                iconSize: [100, 60],
                iconAnchor: [50, 30]
            });
        }
    }

    window.filterData = function() {
        const q = document.getElementById('searchInput').value.toLowerCase();
        const rFilter = document.getElementById('regionFilter') ? document.getElementById('regionFilter').value : 'all';
        const isD = document.getElementById('dinnerToggle').classList.contains('active');
        
        const filtered = restaurantsData.filter(r => {
            const mQ = r.name.toLowerCase().includes(q);
            const mR = rFilter === 'all' || r.region === rFilter;
            const mD = !isD || (r.hours.includes('석식') || /17:|18:|19:/.test(r.hours));
            return mQ && mR && mD;
        });

        document.getElementById('restaurantCards').innerHTML = filtered.map(r => {
            const isDinner = r.hours.includes('석식') || /17:|18:|19:/.test(r.hours);
            return `
            <div class="restaurant-card" onclick="selectRestaurant(${r.id})">
                <div style="font-weight:700; font-size:0.95em; color:var(--text-primary);">${r.name}</div>
                <div style="font-size:0.8em; color:#64748b; margin-top:3px;">
                    💳 ${r.price.toLocaleString()}원 
                    ${isDinner ? '<span class="dinner-badge">🌙 석식 가능</span>' : ''}
                </div>
            </div>`;
        }).join('');

        // ✅ 마커 다시 그리기 (선택 상태 유지)
        markerLayer.clearLayers();
        markerMap = {};
        filtered.forEach(r => {
            const isSelected = r.id === selectedMarkerId;
            const marker = L.marker([r.lat, r.lng], { 
                icon: createIcon(r.name, isSelected) 
            }).addTo(markerLayer);
            
            markerMap[r.id] = marker;
            
            marker.on('click', function(e) {
                L.DomEvent.stopPropagation(e); // 지도 클릭 이벤트 전파 방지
                selectRestaurant(r.id);
            });
        });
    }

    window.selectRestaurant = function(id) {
        const isPanelOpen = document.getElementById('detail-panel').classList.contains('open');
        if (selectedMarkerId === id && isPanelOpen) {
            window.closeDetail();
            return;
        }

        const r = restaurantsData.find(x => x.id === id);
        if (!r) return;
        
        // ✅ 이전 선택 마커 복구
        if (selectedMarkerId !== null && markerMap[selectedMarkerId]) {
            const prevR = restaurantsData.find(x => x.id === selectedMarkerId);
            if (prevR) {
                markerMap[selectedMarkerId].setIcon(createIcon(prevR.name, false));
            }
        }
        
        // ✅ 새 마커 선택
        selectedMarkerId = id;
        if (markerMap[id]) {
            markerMap[id].setIcon(createIcon(r.name, true));
        }
        
        // ✅ 모바일에서는 마커를 위쪽에 표시
        const isMobile = window.innerWidth <= 768;
        map.panTo([isMobile ? r.lat - 0.0006 : r.lat, r.lng]);
        
        document.getElementById('detailName').innerText = r.name;
        
        const detailDescEl = document.getElementById('detailDesc');
        detailDescEl.innerText = r.description || "";
        detailDescEl.style.display = r.description ? 'block' : 'none';
        
        let formattedHours = r.hours || "정보 없음";
        formattedHours = formattedHours.replace(/, /g, "<br>").replace(/,/g, "<br>");
        document.getElementById('detailHours').innerHTML = formattedHours;
        document.getElementById('detailPrice').innerText = `${r.price.toLocaleString()}원`;

        // SNS 버튼 렌더링 (인스타 + 카카오톡 채널)
        let snsHtml = '';
        if (r.instagram) snsHtml += `<a href="${r.instagram}" target="_blank" class="insta-btn">📸 인스타그램<\/a>`;
        if (r.kakaoChannel) snsHtml += `<a href="${r.kakaoChannel}" target="_blank" class="kakao-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-6.627 0-12 4.254-12 9.5 0 3.321 2.161 6.248 5.5 7.91l-1.13 4.144c-.066.241.02.5.213.655a.575.575 0 0 0 .341.111c.119 0 .237-.036.338-.107l4.908-3.414c.6.066 1.21.101 1.83.101 6.627 0 12-4.254 12-9.5S18.627 3 12 3z"/><\/svg> 카톡 채널<\/a>`;
        document.getElementById('snsArea').innerHTML = snsHtml;

        // 한줄평 로드
        loadReviews(id);
        document.getElementById('reviewInput').value = '';
        document.getElementById('reviewCooldownMsg').innerHTML = '';
        document.getElementById('detail-panel').classList.add('open');
    }

    window.closeDetail = function() { 
        document.getElementById('detail-panel').classList.remove('open'); 
        
        if (typeof window.plpClearSelection === 'function') {
            window.plpClearSelection();
        } 
        
        // 패널을 닫을 때 선택된 마커 스타일도 초기화
        if (selectedMarkerId !== null) {
            const prevR = restaurantsData.find(x => x.id === selectedMarkerId);
            if (prevR && markerMap[selectedMarkerId]) {
                markerMap[selectedMarkerId].setIcon(createIcon(prevR.name, false));
            }
            selectedMarkerId = null;
        }
    }
    
    window.toggleCollapse = function() { 
        document.getElementById('left-panel').classList.toggle('collapsed'); 
        closeDetail(); 
    }

    window.toggleDinner = function() {
        const b = document.getElementById('dinnerToggle');
        b.classList.toggle('active');
        if (b.classList.contains('active')) {
            b.style.background = 'var(--text-primary)';
            b.style.color = 'var(--bg-app)';
            b.style.borderColor = 'var(--text-primary)';
        } else {
            b.style.background = '';
            b.style.color = '';
            b.style.borderColor = '';
        }
        filterData();
    }
    
    // ✅ 지도 테마 설정 (기본/라이트/다크)
    window.setMapTheme = function(index) {
        currentThemeIndex = index;
        localStorage.setItem('woody_map_theme', currentThemeIndex); // 로컬 스토리지에 저장
        
        const t = THEMES[currentThemeIndex];
        const b = document.getElementById('themeToggle');
        
        // 기존 타일 레이어 제거
        if (currentTileLayer) {
            map.removeLayer(currentTileLayer);
        }
        
        // 새 타일 레이어 적용
        currentTileLayer = L.tileLayer(t.url, {
            attribution: t.isStadia ? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            className: t.filterClass || ''
        }).addTo(map);
        
        // 버튼 스타일 및 텍스트 변경
        if (b) {
            b.innerHTML = t.name;
            b.style.background = t.bg;
            b.style.color = t.color;
            b.style.borderColor = (currentThemeIndex === 2) ? '#0f172a' : '#fff';
        }
    }
    
    // ✅ 3단 토글 함수
    window.toggleMapTheme = function() {
        window.setMapTheme((currentThemeIndex + 1) % 3);
    }
    
    // 위치 지정 모드 저장
    window.saveLocation = function() {
        if (!pickerMode) return;
        const c = map.getCenter();
        const saveKey = pickerMode === 'home' ? 'woody_home_loc' : 'woody_company_loc';
        localStorage.setItem(saveKey, JSON.stringify({lat: c.lat, lng: c.lng}));
        
        // 1. 마커 화면에서 즉시 위치 이동 처리
        if (pickerMode === 'home') {
            savedHomeLoc = {lat: c.lat, lng: c.lng};
            if (homeMarker) {
                homeMarker.setLatLng([c.lat, c.lng]);
            } else {
                homeMarker = L.marker([c.lat, c.lng], { 
                    icon: L.divIcon({ html: `<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:20px; background:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:3px solid #ef4444;">🏠</div><div style="margin-top:4px; font-size:11px; font-weight:700; color:#dc2626; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; white-space:nowrap;">집</div></div>`, className: '', iconSize: [100, 60] }) 
                }).addTo(map);
            }
        } else if (pickerMode === 'company') {
            savedCompanyLoc = {lat: c.lat, lng: c.lng};
            centerLoc = savedCompanyLoc;
            if (companyMarker) companyMarker.setLatLng([c.lat, c.lng]);
        }
        
        // 2. 안내 모달 UI 변경
        const uiContainer = document.getElementById('location-picker-ui');
        const titleEl = document.getElementById('picker-title');
        const descEl = titleEl.nextElementSibling;
        titleEl.innerText = "설정이 완료 되었습니다! ✅";
        titleEl.style.color = "#10b981"; // 초록빛 성공색
        descEl.innerText = pickerMode === 'home' ? "이제 집 핀이 이 위치에 고정됩니다." : "이제 회사 핀이 이 위치에 고정됩니다.";
        
        // 버튼 숨김
        const btns = document.querySelectorAll('#location-picker-ui .picker-btn');
        btns.forEach(b => b.style.display = 'none');
        
        // 크로스헤어 즉시 숨김
        document.getElementById('picker-crosshair').classList.remove('active');
        
        // 상태 초기화 방지 (5초 후 다시 복구하기 위함)
        // localStorage.removeItem('woody_location_picker_mode');
        
        // 검색결과 기준점은 삭제 (더 이상 고정되지 않게)
        localStorage.removeItem('woody_picker_search_loc');
        
        // 3. 약간의 딜레이 후 UI 창 복구 (실수 대비)
        setTimeout(() => {
            document.getElementById('picker-crosshair').classList.add('active');
            
            // 향후 진입을 위해 원상 복구
            titleEl.style.color = "var(--main-blue)";
            titleEl.innerText = pickerMode === 'home' ? '🏠 집 위치 지정' : '🏢 회사 위치 지정';
            descEl.innerText = "지도를 움직여 중심을 맞춘 후\n완료를 눌러주세요.";
            btns.forEach(b => b.style.display = 'inline-block');
        }, 3000);
    };

    // 위치 지정 모드 취소
    window.cancelLocationPicker = function() {
        // 설정 화면의 '자주 가는 장소 설정' 탭으로 복귀
        localStorage.setItem('woody_setting_resume_screen', 'favorite-places');
        if (window.loadTab) {
            window.loadTab('contact'); // 설정 화면으로 복구
        } else {
            document.getElementById('picker-crosshair').classList.remove('active');
            document.getElementById('location-picker-ui').classList.remove('active');
        }
    };
    
    window.goHome = function() {
        const dest = getSmartHomeDest();
        const isMobile = window.innerWidth <= 768;
        map.setView([isMobile ? dest.lat - 0.0006 : dest.lat, dest.lng], 17);
        closeDetail();
    }

    // ===== GPS 현재 위치 =====
    function getDistanceKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    // 현재 GPS 좌표 저장 (proximity 연산용)
    let currentGPSLat = null, currentGPSLng = null;

    // Home 버튼: GPS 위치에 따라 집/회사 중 가까운 쪽 반환
    function getSmartHomeDest() {
        if (currentGPSLat === null) return savedCompanyLoc;
        const distHome = savedHomeLoc ? getDistanceKm(currentGPSLat, currentGPSLng, savedHomeLoc.lat, savedHomeLoc.lng) : Infinity;
        const distCompany = getDistanceKm(currentGPSLat, currentGPSLng, savedCompanyLoc.lat, savedCompanyLoc.lng);
        return distHome < distCompany ? savedHomeLoc : savedCompanyLoc;
    }

    // Home 버튼 UI 업데이트
    function updateHomeBtn() {
        const btn = document.getElementById('home-btn');
        if (!btn) return;
        if (currentGPSLat === null) { btn.innerText = '🏠'; return; }
        const dest = getSmartHomeDest();
        btn.innerText = (savedHomeLoc && dest === savedHomeLoc) ? '🏠' : '🏢';
    }
    function placeGPSMarker(lat, lng) {
        currentGPSLat = lat;
        currentGPSLng = lng;
        if (gpsMarker) {
            gpsMarker.setLatLng([lat, lng]);
        } else {
            gpsMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `<div class="gps-dot"></div>`,
                    className: '',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                }),
                zIndexOffset: 500
            }).addTo(map);
        }
        updateHomeBtn();
    }

    // ========== 위치 보정 로직 (watchPosition 활용) ==========
    let gpsWatchId = null;
    let gpsTimeoutId = null;

    function getAccurateLocation(onLocation, onComplete, onError, timeoutMs = 10000) {
        if (!navigator.geolocation) {
            if (onError) onError(new Error('GPS 미지원'));
            return;
        }

        if (gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
        if (gpsTimeoutId) clearTimeout(gpsTimeoutId);

        let bestAccuracy = 999999;
        let updateCount = 0;

        // 제한 시간 내에 가장 정확한 위치를 찾고 감시 종료
        gpsTimeoutId = setTimeout(() => {
            if (gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
            if (onComplete) onComplete();
        }, timeoutMs);

        gpsWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                const acc = pos.coords.accuracy;
                // 이전보다 정확도가 향상되었거나 첫 측정일 때 위치 업데이트
                if (acc < bestAccuracy) {
                    bestAccuracy = acc;
                    onLocation(pos.coords.latitude, pos.coords.longitude, updateCount === 0);
                    updateCount++;
                }

                // 오차가 50m 이내면 충분히 정확하므로 조기 종료
                if (acc <= 50) {
                    clearTimeout(gpsTimeoutId);
                    navigator.geolocation.clearWatch(gpsWatchId);
                    if (onComplete) onComplete();
                }
            },
            (err) => {
                // 한 번도 위치를 가져오지 못한 상태에서 에러가 발생한 경우만 에러 처리
                if (updateCount === 0 && onError) {
                    clearTimeout(gpsTimeoutId);
                    navigator.geolocation.clearWatch(gpsWatchId);
                    onError(err);
                }
            },
            { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
        );
    }

    // 내 위치로 지도 이동 + 마커 표시 (앱 시작 시 호출)
    function startGPS(panToLocation) {
        getAccurateLocation(
            (lat, lng, isFirst) => {
                placeGPSMarker(lat, lng);
                // panToLocation이 명시적으로 false가 아니고 첫 위치 갱신일 때만 지도 이동
                // (이후 정확한 위치가 잡히면 마커만 이동하고 지도는 안 움직임 -> 사용자 방해 방지)
                if (panToLocation !== false && isFirst) {
                    const isMobile = window.innerWidth <= 768;
                    map.setView([isMobile ? lat - 0.0006 : lat, lng], 17);
                }
            },
            () => {}, // 완료 시 별도 액션 없음
            (err) => { console.warn('GPS 오류:', err?.message); }
        );
    }

    // GPS 버튼 클릭 시 현위치로 이동
    window.moveToGPS = function() {
        const btn = document.getElementById('locate-btn');
        if (btn) btn.style.opacity = '0.5';
        
        getAccurateLocation(
            (lat, lng, isFirst) => {
                placeGPSMarker(lat, lng);
                // 버튼 클릭 시에는 위치가 갱신될 때마다 더 정확한 곳으로 지도를 이동해줌
                const isMobile = window.innerWidth <= 768;
                map.setView([isMobile ? lat - 0.0006 : lat, lng], 17);
            },
            () => { 
                if (btn) btn.style.opacity = '1'; 
            },
            (err) => {
                console.warn('GPS 오류:', err?.message);
                alert('현재 위치를 가져올 수 없습니다.\nWi-Fi를 켜시거나 위치 권한을 확인해주세요.');
                if (btn) btn.style.opacity = '1';
            },
            12000 // 수동 클릭 시에는 12초까지 대기하며 최고 정확도 찾기
        );
    };

    // ========== 한줄평 시스템 (파이어베이스 연동) ==========
    const COOLDOWN_KEY = 'woody_review_cooldown';
    const COOLDOWN_MS = 60000; // 1분 쿨타임
    let currentDetailId = null;

    window.loadReviews = function(restaurantId) {
        currentDetailId = restaurantId;
        const listEl = document.getElementById('reviewList');
        listEl.innerHTML = '<div class="review-empty">리뷰를 불러오는 중... ⏳</div>';
        
        if (unsubscribeReviews) { unsubscribeReviews(); }
        if (!db) { listEl.innerHTML = '<div class="review-empty">DB 연결 지연 중...</div>'; return; }

        const q = window.fsQuery(
            window.fsCollection(db, `restaurants/${restaurantId}/reviews`), 
            window.fsOrderBy('createdAt', 'desc'), 
            window.fsLimit(20)
        );
        
        unsubscribeReviews = window.fsOnSnapshot(q, (snapshot) => {
            if (currentDetailId !== restaurantId) return; // 뒤늦게 온 응답 무시
            
            if (snapshot.empty) {
                listEl.innerHTML = '<div class="review-empty">아직 한줄평이 없어요. 첫 번째 평가를 남겨 주세요! ✍️</div>';
                return;
            }
            
            let html = '';
            snapshot.forEach((doc) => {
                const rv = doc.data();
                const text = escapeHtml(rv.text || '');
                const nickname = escapeHtml(rv.nickname || '익명');
                
                let dateStr = '';
                if (rv.createdAt) {
                    const date = rv.createdAt.toDate();
                    dateStr = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                }
                
                html += `
                    <div class="review-item" style="flex-direction: column; gap: 4px;">
                        <div style="font-weight: 800; font-size: 0.8em; color: var(--main-blue);">${nickname}</div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
                            <div class="review-item-text" style="flex:1;">${text}</div>
                            <div class="review-item-date">${dateStr}</div>
                        </div>
                    </div>
                `;
            });
            listEl.innerHTML = html;
        }, (error) => {
            console.error("Firebase fetch error:", error);
            listEl.innerHTML = '<div class="review-empty">리뷰를 불러오는 데 실패했습니다. 😢</div>';
        });
    }

    window.submitReview = async function() {
        if (currentDetailId === null || !db) return;
        const input = document.getElementById('reviewInput');
        const nickInput = document.getElementById('reviewNickname');
        const text = input.value.trim();
        const nickname = nickInput.value.trim() || '익명';
        
        if (!text) return;
        if (text.length > 50) { alert('한줄평은 50자 이내로 작성해 주세요.'); return; }
        if (nickname.length > 10) { alert('닉네임은 10자 이내로 작성해 주세요.'); return; }

        const lastTime = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0');
        const now = Date.now();
        if (now - lastTime < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - lastTime)) / 1000);
            document.getElementById('reviewCooldownMsg').innerHTML = `<div class="review-cooldown-msg">⏳ ${remaining}초 후에 다시 작성할 수 있어요.</div>`;
            return;
        }

        document.getElementById('reviewCooldownMsg').innerHTML = '<div style="font-size: 0.78em; color: var(--main-blue); margin-top: 4px;">등록 중... ✍️</div>';
        
        try {
            await window.fsAddDoc(window.fsCollection(db, `restaurants/${currentDetailId}/reviews`), {
                text: text,
                nickname: nickname,
                createdAt: window.fsServerTimestamp()
            });
            
            localStorage.setItem(COOLDOWN_KEY, String(now));
            input.value = '';
            // 닉네임은 다음 작성 편의를 위해 초기화하지 않습니다
            document.getElementById('reviewCooldownMsg').innerHTML = '';
        } catch (e) {
            console.error("Firebase addDoc error: ", e);
            document.getElementById('reviewCooldownMsg').innerHTML = `<div class="review-cooldown-msg">오류가 발생했습니다. 다시 시도해 주세요.</div>`;
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Enter 키로 한줄평 등록
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'reviewInput') {
            e.preventDefault();
            submitReview();
        }
    });

    init();
})();
