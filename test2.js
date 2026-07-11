
    let currentTab = '';
    function loadTab(tabName) {
        if (currentTab === tabName) return;
        currentTab = tabName;
        document.body.setAttribute('data-tab', tabName);
        
        document.querySelectorAll('.tab-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });

        fetch(`./${tabName}-tab.html?v=${Date.now()}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.text();
            })
            .then(html => {
                const area = document.getElementById('content-area');
                
                // Live Server 등 dev tools 주입 코드 제거 (끝태그 뒤 잔여물 정리)
                const marker = '<' + '/script>';
                const lastClose = html.lastIndexOf(marker);
                if (lastClose !== -1) {
                    html = html.substring(0, lastClose + marker.length);
                }
                
                area.innerHTML = html;
                
                // 스크립트 강제 실행 로직 (안전한 생성 방식)
                const scripts = area.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    newScript.textContent = oldScript.textContent;
                    document.body.appendChild(newScript);
                    newScript.remove();
                });
            })
            .catch(err => {
                console.error('Error loading tab:', err);
                document.getElementById('content-area').innerHTML = 
                    `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#ef4444; font-weight:700;">
                        탭을 불러오지 못했습니다. (경로 확인 필요)
                    </div>`;
            });
    }

    document.querySelectorAll('.tab-item').forEach(item => {
        item.addEventListener('click', () => loadTab(item.dataset.tab));
    });
    window.addEventListener('load', () => loadTab('map'));

    // ===== PC 영구 패널: 식당 데이터 로딩 및 필터 =====
    (function() {
        const isMobile = () => window.innerWidth <= 768;
        if (isMobile()) return; // 모바일에서는 실행 안 함

        window.plpRestaurantsData = [];

        async function plpLoadData() {
            try {
                const res = await fetch(`./data/restaurants.xlsx?v=${Date.now()}`);
                if (!res.ok) throw new Error(`HTTP error! ${res.status}`);
                const arrayBuffer = await res.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                const headerMap = {
                    'id': 'id', '이름': 'name', '지역': 'region', '주소': 'address',
                    'lat': 'lat', 'lng': 'lng', '설명': 'description',
                    '가격': 'price', '영업 시간': 'hours',
                    '인스타': 'instagram', '카카오': 'kakaoChannel'
                };
                const headers = rows[0].map(h => headerMap[String(h).trim()] || String(h).trim());

                window.plpRestaurantsData = rows.slice(1)
                    .map(row => { const obj = {}; headers.forEach((key, i) => { obj[key] = row[i]; }); return obj; })
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

                const regions = [...new Set(window.plpRestaurantsData.map(r => r.region))].filter(r => r && r !== '미지정').sort();
                const regionSelect = document.getElementById('plpRegionFilter');
                regionSelect.innerHTML = '<option value="all">지역 전체</option>';
                regions.forEach(rg => {
                    const opt = document.createElement('option');
                    opt.value = rg; opt.text = rg;
                    regionSelect.appendChild(opt);
                });
                if (window.plpRestaurantsData.some(r => r.region === '미지정')) {
                    const opt = document.createElement('option');
                    opt.value = '미지정'; opt.text = '미지정';
                    regionSelect.appendChild(opt);
                }

                plpFilterData();
            } catch(e) {
                console.error('PLP data load error:', e);
                document.getElementById('plpRestaurantCards').innerHTML =
                    '<div style="padding:20px; text-align:center; color:#ef4444; font-size:0.9em; font-weight:700;">데이터를 불러오지 못했습니다.<br>새로고침 해주세요.</div>';
            }
        }

        window.plpFilterData = function() {
            const q = document.getElementById('plpSearchInput').value.toLowerCase();
            const rFilter = document.getElementById('plpRegionFilter').value;
            const dinnerToggle = document.getElementById('plpDinnerToggle');
            const isD = dinnerToggle ? dinnerToggle.classList.contains('active') : false;

            const filtered = window.plpRestaurantsData.filter(r => {
                const mQ = r.name.toLowerCase().includes(q);
                const mR = rFilter === 'all' || r.region === rFilter;
                const mD = !isD || (r.hours.includes('석식') || /17:|18:|19:/.test(r.hours));
                return mQ && mR && mD;
            });

            document.getElementById('plpRestaurantCards').innerHTML = filtered.map(r => {
                const isDinner = r.hours.includes('석식') || /17:|18:|19:/.test(r.hours);
                return `
                <div class="restaurant-card ${window.plpSelectedId === r.id ? 'selected-card' : ''}" onclick="plpSelectRestaurant(${r.id})">
                    <div style="font-weight:800; font-size:1em; color:var(--text-primary); margin-bottom:6px;">${r.name}</div>
                    <div style="font-size:0.85em; color:var(--text-secondary); display:flex; align-items:center;">
                        <span style="background:var(--border-dark); padding:3px 8px; border-radius:8px; margin-right:6px;">💳 ${r.price.toLocaleString()}원</span>
                        ${isDinner ? '<span class="dinner-badge">🌙 석식 가능</span>' : ''}
                    </div>
                </div>`;
            }).join('');
        };

        window.plpToggleDinner = function() {
            const b = document.getElementById('plpDinnerToggle');
            b.classList.toggle('active');
            if (b.classList.contains('active')) {
                b.style.background = 'var(--text-primary)';
                b.style.color = 'var(--bg-app)';
                b.style.borderColor = 'var(--text-primary)';
            } else {
                b.style.background = 'var(--bg-surface)';
                b.style.color = 'var(--text-primary)';
                b.style.borderColor = 'var(--border-light)';
            }
            plpFilterData();
        };

        // 식당 클릭 시: 지도 탭이 활성이면 selectRestaurant 호출, 다른 탭은 폈팅 팝업 표시
        window.plpSelectRestaurant = function(id) {
            window.plpSelectedId = id;
            plpFilterData(); // 선택 상태 UI 갱신

            if (currentTab === 'map' && typeof window.selectRestaurant === 'function') {
                window.selectRestaurant(id);
            } else {
                plpShowPopup(id);
            }
        };

        window.plpClearSelection = function() {
            window.plpSelectedId = null;
            plpFilterData(); // 선택 해제 UI 갱신
        };

        window.plpMoveToGPS = function() {
            if (currentTab === 'map' && typeof window.moveToGPS === 'function') {
                window.moveToGPS();
            } else {
                window._pendingAction = 'gps';
                loadTab('map');
            }
        };

        window.plpGoHome = function() {
            if (currentTab === 'map' && typeof window.goHome === 'function') {
                window.goHome();
            } else {
                window._pendingAction = 'home';
                loadTab('map');
            }
        };

        let plpPopupCurrentId = null;

        function plpShowPopup(id) {
            const isPopupOpen = document.getElementById('plp-detail-popup').classList.contains('open');
            if (plpPopupCurrentId === id && isPopupOpen) {
                window.plpClosePopup();
                return;
            }

            const r = window.plpRestaurantsData.find(x => x.id === id);
            if (!r) return;
            plpPopupCurrentId = id;

            document.getElementById('plp-popup-name').innerText = r.name;

            const descEl = document.getElementById('plp-popup-desc');
            descEl.innerText = r.description || '';
            descEl.style.display = r.description ? 'block' : 'none';

            let formattedHours = r.hours || '정보 없음';
            formattedHours = formattedHours.replace(/, /g, '<br>').replace(/,/g, '<br>');
            document.getElementById('plp-popup-hours').innerHTML = formattedHours;
            document.getElementById('plp-popup-price').innerText = `${r.price.toLocaleString()}원`;

            let snsHtml = '';
            if (r.instagram) snsHtml += `<a href="${r.instagram}" target="_blank" class="insta-btn">📸 인스타그램</a>`;
            if (r.kakaoChannel) snsHtml += `<a href="${r.kakaoChannel}" target="_blank" class="kakao-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-6.627 0-12 4.254-12 9.5 0 3.321 2.161 6.248 5.5 7.91l-1.13 4.144c-.066.241.02.5.213.655a.575.575 0 0 0 .341.111c.119 0 .237-.036.338-.107l4.908-3.414c.6.066 1.21.101 1.83.101 6.627 0 12-4.254 12-9.5S18.627 3 12 3z"/></svg> 카톡 채널</a>`;
            const snsEl = document.getElementById('plp-popup-sns');
            snsEl.innerHTML = snsHtml;
            snsEl.style.display = snsHtml ? 'flex' : 'none';

            document.getElementById('plp-detail-popup').classList.add('open');
            document.getElementById('plp-detail-overlay').classList.add('open');
        }

        window.plpClosePopup = function() {
            document.getElementById('plp-detail-popup').classList.remove('open');
            document.getElementById('plp-detail-overlay').classList.remove('open');
            plpPopupCurrentId = null;
        };

        // 팝업에서 '지도에서 보기' 버튼 클릭 시 지도 탭으로 이동 + 선택
        window.plpGoToMap = function() {
            if (plpPopupCurrentId === null) return;
            const id = plpPopupCurrentId;
            plpClosePopup();
            if (currentTab === 'map' && typeof window.selectRestaurant === 'function') {
                window.selectRestaurant(id);
            } else {
                window._pendingSelectId = id;
                loadTab('map');
            }
        };

        // 탭 바뀔 때 다크모드 적용 스크립트 실행을 위해 전역 변수로 노출
        window.applyAppTheme = function() {
            const theme = localStorage.getItem('woody_app_theme') || 'default';
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        };
        // 초기 로드 시 테마 적용
        window.applyAppTheme();

        plpLoadData();
    })();
