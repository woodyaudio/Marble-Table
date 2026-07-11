
(function() {
    let restaurantsData = [];
    
    // ê¸°ë³¸ê°?    const defaultCompanyLoc = { lat: 37.479932, lng: 126.895215 };
    
    // ë¡œì»¬ ?¤í† ë¦¬ì??ì„œ ?„ì¹˜ ë¶ˆëŸ¬?¤ê¸°
    let savedHomeLoc = localStorage.getItem('woody_home_loc') ? JSON.parse(localStorage.getItem('woody_home_loc')) : null;
    let savedCompanyLoc = localStorage.getItem('woody_company_loc') ? JSON.parse(localStorage.getItem('woody_company_loc')) : defaultCompanyLoc;
    
    // ì´ˆê¸° ì§€?„ì˜ ì¤‘ì‹¬??    let centerLoc = savedCompanyLoc;

    let map, markerLayer, selectedMarkerId = null, markerMap = {};
    let homeMarker = null, companyMarker = null, gpsMarker = null;
    
    // ?„ì¹˜ ì§€??ëª¨ë“œ ?¬ë? ?•ì¸
    const pickerMode = localStorage.getItem('woody_location_picker_mode'); // 'home' or 'company'
    const searchedLocStr = localStorage.getItem('woody_picker_search_loc');
    
    // ???´ë™ ???„ì¹˜ ì§€??ëª¨ë“œ ? ì? ë°©ì? (?½ì? ??ì¦‰ì‹œ ?? œ)
    localStorage.removeItem('woody_location_picker_mode');
    localStorage.removeItem('woody_picker_search_loc');
    
    let currentTileLayer;
    
    // ?Œë§ˆ ?¤ì • (0: Voyager, 1: Positron, 2: Stadia Smooth Dark)
    const THEMES = [
        { name: '?Œ ê¸°ë³¸ë§?, url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', bg: 'rgba(255,255,255,0.7)', color: '#333' },
        { name: '?€ï¸??¼ì´??, url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', bg: '#f1f5f9', color: '#1e293b' },
        { name: '?Œƒ ?¤í¬ë§?, url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', bg: '#1e293b', color: '#fff', isStadia: true }
    ];
    let currentThemeIndex = parseInt(localStorage.getItem('woody_map_theme')) || 0;
    
    // ?Œì´?´ë² ?´ìŠ¤ ê´€??ë³€??    let db;
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
        map = L.map('map', { zoomControl: false }); // ì´ˆê¸° ì¢Œí‘œ ?¤ì •?€ ?˜ë‹¨?ì„œ ?˜í–‰
        
        // ?¬ìš©?ê? ë§ˆì?ë§‰ìœ¼ë¡?? íƒ???Œë§ˆ ?ëŠ” ê¸°ë³¸ ?Œë§ˆ ë¡œë“œ
        const t = THEMES[currentThemeIndex];
        currentTileLayer = L.tileLayer(t.url, {
            attribution: t.isStadia ? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            className: t.isStadia ? 'dark-map-filter' : ''
        }).addTo(map);

        markerLayer = L.layerGroup().addTo(map);

        // ?Œì‚¬ ?„ì¹˜ ë§ˆì»¤
        companyMarker = L.marker([savedCompanyLoc.lat, savedCompanyLoc.lng], { 
            icon: L.divIcon({ html: `<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:20px; background:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:3px solid #ffcf00;">?¢</div><div style="margin-top:4px; font-size:11px; font-weight:700; color:#d97706; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; white-space:nowrap;">?Œì‚¬</div></div>`, className: '', iconSize: [100, 60] }) 
        }).addTo(map);

        // ì§??„ì¹˜ ë§ˆì»¤ (?ˆì„ ê²½ìš°ë§?
        if (savedHomeLoc) {
            homeMarker = L.marker([savedHomeLoc.lat, savedHomeLoc.lng], { 
                icon: L.divIcon({ html: `<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:20px; background:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:3px solid #ef4444;">? </div><div style="margin-top:4px; font-size:11px; font-weight:700; color:#dc2626; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; white-space:nowrap;">ì§?/div></div>`, className: '', iconSize: [100, 60] }) 
            }).addTo(map);
        }

        // GPS ë¡??œì‘ ?„ì¹˜ ê²°ì • (pickerMode ?œì™¸)
        if (pickerMode) {
            // ?¼ì»¤ ëª¨ë“œ??ê²½ìš°: ê²€??ì¢Œí‘œ ?ëŠ” ?Œì‚¬ ?„ì¹˜
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
            // ?¼ë°˜ ëª¨ë“œ: GPS ?°ì„ , ?¤íŒ¨ ???Œì‚¬ ?„ì¹˜
            map.setView([isMobile ? centerLoc.lat - 0.0006 : centerLoc.lat, centerLoc.lng], 17);
            startGPS(false); // ì§€?„ë? GPSë¡??´ë™ (isMobile ?™ì¼?˜ê²Œ ?ìš©)
        }

        // ê²€??ëª¨ë“œ UI ?œì„±??        if (pickerMode) {
            document.getElementById('picker-crosshair').classList.add('active');
            document.getElementById('location-picker-ui').classList.add('active');
            document.getElementById('picker-title').innerText = pickerMode === 'home' ? '?  ì§??„ì¹˜ ì§€?? : '?¢ ?Œì‚¬ ?„ì¹˜ ì§€??;
            
            // ëª¨ë°”?¼ì—???¼ìª½ ?¨ë„???”ë©´??ê°€ë¦¬ì? ?Šë„ë¡??ë™ ?‘ê¸°
            document.getElementById('left-panel').classList.add('collapsed');
        }

        // ??ì§€??ë¹?ê³µê°„ ?´ë¦­ ??? íƒ ?´ì œ
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

            // SheetJSë¡?XLSX ?Œì‹±
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            // 1?? ?¤ë”, 2??: ?°ì´??            const headerMap = {
                'id': 'id', '?´ë¦„': 'name', 'ì§€??: 'region', 'ì£¼ì†Œ': 'address',
                'lat': 'lat', 'lng': 'lng', '?¤ëª…': 'description',
                'ê°€ê²?: 'price', '?ì—… ?œê°„': 'hours',
                '?¸ìŠ¤?€': 'instagram', 'ì¹´ì¹´??: 'kakaoChannel'
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
                    region:       r.region && String(r.region).trim() !== '' ? String(r.region).trim() : 'ë¯¸ì???,
                    address:      r.address ? String(r.address).trim() : '',
                    lat:          parseFloat(r.lat) || 0,
                    lng:          parseFloat(r.lng) || 0,
                    description:  r.description && String(r.description).trim() !== '' ? String(r.description).trim() : '',
                    price:        parseInt(r.price) || 0,
                    hours:        r.hours ? String(r.hours).trim() : '',
                    instagram:    (r.instagram && String(r.instagram).trim() !== '' && String(r.instagram).trim().toLowerCase() !== 'null') ? String(r.instagram).trim() : null,
                    kakaoChannel: (r.kakaoChannel && String(r.kakaoChannel).trim() !== '' && String(r.kakaoChannel).trim().toLowerCase() !== 'null') ? String(r.kakaoChannel).trim() : null
                }));

            // ì§€???µì…˜ ?™ì  ?ì„±
            const regions = [...new Set(restaurantsData.map(r => r.region))].filter(r => r && r !== 'ë¯¸ì???);
            const regionSelect = document.getElementById('regionFilter');
            regionSelect.innerHTML = '<option value="all">ì§€???„ì²´</option>'; // ì´ˆê¸°??            regions.forEach(rg => {
                const opt = document.createElement('option');
                opt.value = rg;
                opt.text = rg;
                regionSelect.appendChild(opt);
            });

            // ì§€??ë¯¸ì??•ì´ ?ˆìœ¼ë©?ë§??¤ì— ì¶”ê?
            if (restaurantsData.some(r => r.region === 'ë¯¸ì???)) {
                const opt = document.createElement('option');
                opt.value = 'ë¯¸ì???;
                opt.text = 'ë¯¸ì???;
                regionSelect.appendChild(opt);
            }

            filterData();

            // ?¤ë¥¸ ??—???ë‹¹ ?´ë¦­ ??ì§€????œ¼ë¡??„í™˜??ê²½ìš° ?ë™ ? íƒ
            if (window._pendingSelectId !== undefined) {
                const pendingId = window._pendingSelectId;
                delete window._pendingSelectId;
                setTimeout(() => window.selectRestaurant(pendingId), 100);
            }

            // ?¤ë¥¸ ??—???„ì¹˜ ?´ë™(GPS/Home) ??ì§€????œ¼ë¡??„í™˜??ê²½ìš°
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
            document.getElementById('restaurantCards').innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444; font-size: 0.9em; font-weight: 700;">?°ì´?°ë? ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??<br>?ˆë¡œê³ ì¹¨ ?´ì£¼?¸ìš”.</div>`;
        }
    }

    // ??ë§ˆì»¤ ?„ì´ì½??ì„± ?¨ìˆ˜ (? íƒ ?¬ë????°ë¼ ?¤ë¥¸ ?”ì??
    function createIcon(name, isSelected = false) {
        if (isSelected) {
            // ? íƒ??ë§ˆì»¤: ë¬¼ë°©???¤í???+ êµµì? ê¸€??            return L.divIcon({
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
            // ê¸°ë³¸ ë§ˆì»¤: ?¬í¬ ?´ëª¨ì§€ + ?‘ê³  ?‡ì? ê¸€??            return L.divIcon({
                html: `<div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="width:30px; height:30px; background:#fff; border:2.5px solid #3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px;">?´</div>
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
            const mD = !isD || (r.hours.includes('?ì‹') || /17:|18:|19:/.test(r.hours));
            return mQ && mR && mD;
        });

        document.getElementById('restaurantCards').innerHTML = filtered.map(r => {
            const isDinner = r.hours.includes('?ì‹') || /17:|18:|19:/.test(r.hours);
            return `
            <div class="restaurant-card" onclick="selectRestaurant(${r.id})">
                <div style="font-weight:700; font-size:0.95em; color:var(--text-primary);">${r.name}</div>
                <div style="font-size:0.8em; color:#64748b; margin-top:3px;">
                    ?’³ ${r.price.toLocaleString()}??
                    ${isDinner ? '<span class="dinner-badge">?Œ™ ?ì‹ ê°€??/span>' : ''}
                </div>
            </div>`;
        }).join('');

        // ??ë§ˆì»¤ ?¤ì‹œ ê·¸ë¦¬ê¸?(? íƒ ?íƒœ ? ì?)
        markerLayer.clearLayers();
        markerMap = {};
        filtered.forEach(r => {
            const isSelected = r.id === selectedMarkerId;
            const marker = L.marker([r.lat, r.lng], { 
                icon: createIcon(r.name, isSelected) 
            }).addTo(markerLayer);
            
            markerMap[r.id] = marker;
            
            marker.on('click', function(e) {
                L.DomEvent.stopPropagation(e); // ì§€???´ë¦­ ?´ë²¤???„íŒŒ ë°©ì?
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
        
        // ???´ì „ ? íƒ ë§ˆì»¤ ë³µêµ¬
        if (selectedMarkerId !== null && markerMap[selectedMarkerId]) {
            const prevR = restaurantsData.find(x => x.id === selectedMarkerId);
            if (prevR) {
                markerMap[selectedMarkerId].setIcon(createIcon(prevR.name, false));
            }
        }
        
        // ????ë§ˆì»¤ ? íƒ
        selectedMarkerId = id;
        if (markerMap[id]) {
            markerMap[id].setIcon(createIcon(r.name, true));
        }
        
        // ??ëª¨ë°”?¼ì—?œëŠ” ë§ˆì»¤ë¥??„ìª½???œì‹œ
        const isMobile = window.innerWidth <= 768;
        map.panTo([isMobile ? r.lat - 0.0006 : r.lat, r.lng]);
        
        document.getElementById('detailName').innerText = r.name;
        
        const detailDescEl = document.getElementById('detailDesc');
        detailDescEl.innerText = r.description || "";
        detailDescEl.style.display = r.description ? 'block' : 'none';
        
        let formattedHours = r.hours || "?•ë³´ ?†ìŒ";
        formattedHours = formattedHours.replace(/, /g, "<br>").replace(/,/g, "<br>");
        document.getElementById('detailHours').innerHTML = formattedHours;
        document.getElementById('detailPrice').innerText = `${r.price.toLocaleString()}??;

        // SNS ë²„íŠ¼ ?Œë”ë§?(?¸ìŠ¤?€ + ì¹´ì¹´?¤í†¡ ì±„ë„)
        let snsHtml = '';
        if (r.instagram) snsHtml += `<a href="${r.instagram}" target="_blank" class="insta-btn">?“¸ ?¸ìŠ¤?€ê·¸ë¨<\/a>`;
        if (r.kakaoChannel) snsHtml += `<a href="${r.kakaoChannel}" target="_blank" class="kakao-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-6.627 0-12 4.254-12 9.5 0 3.321 2.161 6.248 5.5 7.91l-1.13 4.144c-.066.241.02.5.213.655a.575.575 0 0 0 .341.111c.119 0 .237-.036.338-.107l4.908-3.414c.6.066 1.21.101 1.83.101 6.627 0 12-4.254 12-9.5S18.627 3 12 3z"/><\/svg> ì¹´í†¡ ì±„ë„<\/a>`;
        document.getElementById('snsArea').innerHTML = snsHtml;

        // ?œì¤„??ë¡œë“œ
        loadReviews(id);
        document.getElementById('reviewInput').value = '';
        document.getElementById('reviewCooldownMsg').innerHTML = '';
        document.getElementById('detail-panel').classList.add('open');
    }

    window.closeDetail = function() { 
        document.getElementById('detail-panel').classList.remove('open'); 
        
        // ?¨ë„???«ì„ ??? íƒ??ë§ˆì»¤ ?¤í??¼ë„ ì´ˆê¸°??        if (selectedMarkerId !== null) {
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
            b.style.background = 'var(--primary)';
            b.style.color = '#fff';
            b.style.borderColor = 'var(--primary)';
        } else {
            b.style.background = '';
            b.style.color = '';
            b.style.borderColor = '';
        }
        filterData();
    }
    
    // ??ì§€???Œë§ˆ ?¤ì • (ê¸°ë³¸/?¼ì´???¤í¬)
    window.setMapTheme = function(index) {
        currentThemeIndex = index;
        localStorage.setItem('woody_map_theme', currentThemeIndex); // ë¡œì»¬ ?¤í† ë¦¬ì????€??        
        const t = THEMES[currentThemeIndex];
        const b = document.getElementById('themeToggle');
        
        // ê¸°ì¡´ ?€???ˆì´???œê±°
        if (currentTileLayer) {
            map.removeLayer(currentTileLayer);
        }
        
        // ???€???ˆì´???ìš©
        currentTileLayer = L.tileLayer(t.url, {
            attribution: t.isStadia ? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            className: t.isStadia ? 'dark-map-filter' : ''
        }).addTo(map);
        
        // ë²„íŠ¼ ?¤í???ë°??ìŠ¤??ë³€ê²?        if (b) {
            b.innerHTML = t.name;
            b.style.background = t.bg;
            b.style.color = t.color;
            b.style.borderColor = (currentThemeIndex === 2) ? '#0f172a' : '#fff';
        }
    }
    
    // ??3??? ê? ?¨ìˆ˜
    window.toggleMapTheme = function() {
        window.setMapTheme((currentThemeIndex + 1) % 3);
    }
    
    // ?„ì¹˜ ì§€??ëª¨ë“œ ?€??    window.saveLocation = function() {
        if (!pickerMode) return;
        const c = map.getCenter();
        const saveKey = pickerMode === 'home' ? 'woody_home_loc' : 'woody_company_loc';
        localStorage.setItem(saveKey, JSON.stringify({lat: c.lat, lng: c.lng}));
        
        // 1. ë§ˆì»¤ ?”ë©´?ì„œ ì¦‰ì‹œ ?„ì¹˜ ?´ë™ ì²˜ë¦¬
        if (pickerMode === 'home') {
            savedHomeLoc = {lat: c.lat, lng: c.lng};
            if (homeMarker) {
                homeMarker.setLatLng([c.lat, c.lng]);
            } else {
                homeMarker = L.marker([c.lat, c.lng], { 
                    icon: L.divIcon({ html: `<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:20px; background:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:3px solid #ef4444;">? </div><div style="margin-top:4px; font-size:11px; font-weight:700; color:#dc2626; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; white-space:nowrap;">ì§?/div></div>`, className: '', iconSize: [100, 60] }) 
                }).addTo(map);
            }
        } else if (pickerMode === 'company') {
            savedCompanyLoc = {lat: c.lat, lng: c.lng};
            centerLoc = savedCompanyLoc;
            if (companyMarker) companyMarker.setLatLng([c.lat, c.lng]);
        }
        
        // 2. ?ˆë‚´ ëª¨ë‹¬ UI ë³€ê²?        const uiContainer = document.getElementById('location-picker-ui');
        const titleEl = document.getElementById('picker-title');
        const descEl = titleEl.nextElementSibling;
        titleEl.innerText = "?¤ì •???„ë£Œ ?˜ì—ˆ?µë‹ˆ?? ??;
        titleEl.style.color = "#10b981"; // ì´ˆë¡ë¹??±ê³µ??        descEl.innerText = pickerMode === 'home' ? "?´ì œ ì§??€?????„ì¹˜??ê³ ì •?©ë‹ˆ??" : "?´ì œ ?Œì‚¬ ?€?????„ì¹˜??ê³ ì •?©ë‹ˆ??";
        
        // ë²„íŠ¼ ?¨ê?
        const btns = document.querySelectorAll('#location-picker-ui .picker-btn');
        btns.forEach(b => b.style.display = 'none');
        
        // ?¬ë¡œ?¤í—¤??ì¦‰ì‹œ ?¨ê?
        document.getElementById('picker-crosshair').classList.remove('active');
        
        // ?íƒœ ì´ˆê¸°??ë°©ì? (5ì´????¤ì‹œ ë³µêµ¬?˜ê¸° ?„í•¨)
        // localStorage.removeItem('woody_location_picker_mode');
        
        // ê²€?‰ê²°ê³?ê¸°ì??ì? ?? œ (???´ìƒ ê³ ì •?˜ì? ?Šê²Œ)
        localStorage.removeItem('woody_picker_search_loc');
        
        // 3. ?½ê°„???œë ˆ????UI ì°?ë³µêµ¬ (?¤ìˆ˜ ?€ë¹?
        setTimeout(() => {
            document.getElementById('picker-crosshair').classList.add('active');
            
            // ?¥í›„ ì§„ì…???„í•´ ?ìƒ ë³µêµ¬
            titleEl.style.color = "var(--main-blue)";
            titleEl.innerText = pickerMode === 'home' ? '?  ì§??„ì¹˜ ì§€?? : '?¢ ?Œì‚¬ ?„ì¹˜ ì§€??;
            descEl.innerText = "ì§€?„ë? ?€ì§ì—¬ ì¤‘ì‹¬??ë§ì¶˜ ??n?„ë£Œë¥??ŒëŸ¬ì£¼ì„¸??";
            btns.forEach(b => b.style.display = 'inline-block');
        }, 3000);
    };

    // ?„ì¹˜ ì§€??ëª¨ë“œ ì·¨ì†Œ
    window.cancelLocationPicker = function() {
        // ?¤ì • ?”ë©´??'?ì£¼ ê°€???¥ì†Œ ?¤ì •' ??œ¼ë¡?ë³µê?
        localStorage.setItem('woody_setting_resume_screen', 'favorite-places');
        if (window.loadTab) {
            window.loadTab('contact'); // ?¤ì • ?”ë©´?¼ë¡œ ë³µêµ¬
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

    // ===== GPS ?„ì¬ ?„ì¹˜ =====
    function getDistanceKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    // ?„ì¬ GPS ì¢Œí‘œ ?€??(proximity ?°ì‚°??
    let currentGPSLat = null, currentGPSLng = null;

    // Home ë²„íŠ¼: GPS ?„ì¹˜???°ë¼ ì§??Œì‚¬ ì¤?ê°€ê¹Œìš´ ìª?ë°˜í™˜
    function getSmartHomeDest() {
        if (currentGPSLat === null) return savedCompanyLoc;
        const distHome = savedHomeLoc ? getDistanceKm(currentGPSLat, currentGPSLng, savedHomeLoc.lat, savedHomeLoc.lng) : Infinity;
        const distCompany = getDistanceKm(currentGPSLat, currentGPSLng, savedCompanyLoc.lat, savedCompanyLoc.lng);
        return distHome < distCompany ? savedHomeLoc : savedCompanyLoc;
    }

    // Home ë²„íŠ¼ UI ?…ë°?´íŠ¸
    function updateHomeBtn() {
        const btn = document.getElementById('home-btn');
        if (!btn) return;
        if (currentGPSLat === null) { btn.innerText = '? '; return; }
        const dest = getSmartHomeDest();
        btn.innerText = (savedHomeLoc && dest === savedHomeLoc) ? '? ' : '?¢';
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

    // ========== ?„ì¹˜ ë³´ì • ë¡œì§ (watchPosition ?œìš©) ==========
    let gpsWatchId = null;
    let gpsTimeoutId = null;

    function getAccurateLocation(onLocation, onComplete, onError, timeoutMs = 10000) {
        if (!navigator.geolocation) {
            if (onError) onError(new Error('GPS ë¯¸ì???));
            return;
        }

        if (gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
        if (gpsTimeoutId) clearTimeout(gpsTimeoutId);

        let bestAccuracy = 999999;
        let updateCount = 0;

        // ?œí•œ ?œê°„ ?´ì— ê°€???•í™•???„ì¹˜ë¥?ì°¾ê³  ê°ì‹œ ì¢…ë£Œ
        gpsTimeoutId = setTimeout(() => {
            if (gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
            if (onComplete) onComplete();
        }, timeoutMs);

        gpsWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                const acc = pos.coords.accuracy;
                // ?´ì „ë³´ë‹¤ ?•í™•?„ê? ?¥ìƒ?˜ì—ˆê±°ë‚˜ ì²?ì¸¡ì •?????„ì¹˜ ?…ë°?´íŠ¸
                if (acc < bestAccuracy) {
                    bestAccuracy = acc;
                    onLocation(pos.coords.latitude, pos.coords.longitude, updateCount === 0);
                    updateCount++;
                }

                // ?¤ì°¨ê°€ 50m ?´ë‚´ë©?ì¶©ë¶„???•í™•?˜ë?ë¡?ì¡°ê¸° ì¢…ë£Œ
                if (acc <= 50) {
                    clearTimeout(gpsTimeoutId);
                    navigator.geolocation.clearWatch(gpsWatchId);
                    if (onComplete) onComplete();
                }
            },
            (err) => {
                // ??ë²ˆë„ ?„ì¹˜ë¥?ê°€?¸ì˜¤ì§€ ëª»í•œ ?íƒœ?ì„œ ?ëŸ¬ê°€ ë°œìƒ??ê²½ìš°ë§??ëŸ¬ ì²˜ë¦¬
                if (updateCount === 0 && onError) {
                    clearTimeout(gpsTimeoutId);
                    navigator.geolocation.clearWatch(gpsWatchId);
                    onError(err);
                }
            },
            { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
        );
    }

    // ???„ì¹˜ë¡?ì§€???´ë™ + ë§ˆì»¤ ?œì‹œ (???œì‘ ???¸ì¶œ)
    function startGPS(panToLocation) {
        getAccurateLocation(
            (lat, lng, isFirst) => {
                placeGPSMarker(lat, lng);
                // panToLocation??ëª…ì‹œ?ìœ¼ë¡?falseê°€ ?„ë‹ˆê³?ì²??„ì¹˜ ê°±ì‹ ???Œë§Œ ì§€???´ë™
                // (?´í›„ ?•í™•???„ì¹˜ê°€ ?¡íˆë©?ë§ˆì»¤ë§??´ë™?˜ê³  ì§€?„ëŠ” ???€ì§ì„ -> ?¬ìš©??ë°©í•´ ë°©ì?)
                if (panToLocation !== false && isFirst) {
                    const isMobile = window.innerWidth <= 768;
                    map.setView([isMobile ? lat - 0.0006 : lat, lng], 17);
                }
            },
            () => {}, // ?„ë£Œ ??ë³„ë„ ?¡ì…˜ ?†ìŒ
            (err) => { console.warn('GPS ?¤ë¥˜:', err?.message); }
        );
    }

    // GPS ë²„íŠ¼ ?´ë¦­ ???„ìœ„ì¹˜ë¡œ ?´ë™
    window.moveToGPS = function() {
        const btn = document.getElementById('locate-btn');
        if (btn) btn.style.opacity = '0.5';
        
        getAccurateLocation(
            (lat, lng, isFirst) => {
                placeGPSMarker(lat, lng);
                // ë²„íŠ¼ ?´ë¦­ ?œì—???„ì¹˜ê°€ ê°±ì‹ ???Œë§ˆ?????•í™•??ê³³ìœ¼ë¡?ì§€?„ë? ?´ë™?´ì¤Œ
                const isMobile = window.innerWidth <= 768;
                map.setView([isMobile ? lat - 0.0006 : lat, lng], 17);
            },
            () => { 
                if (btn) btn.style.opacity = '1'; 
            },
            (err) => {
                console.warn('GPS ?¤ë¥˜:', err?.message);
                alert('?„ì¬ ?„ì¹˜ë¥?ê°€?¸ì˜¬ ???†ìŠµ?ˆë‹¤.\nWi-Fië¥?ì¼œì‹œê±°ë‚˜ ?„ì¹˜ ê¶Œí•œ???•ì¸?´ì£¼?¸ìš”.');
                if (btn) btn.style.opacity = '1';
            },
            12000 // ?˜ë™ ?´ë¦­ ?œì—??12ì´ˆê¹Œì§€ ?€ê¸°í•˜ë©?ìµœê³  ?•í™•??ì°¾ê¸°
        );
    };

    // ========== ?œì¤„???œìŠ¤??(?Œì´?´ë² ?´ìŠ¤ ?°ë™) ==========
    const COOLDOWN_KEY = 'woody_review_cooldown';
    const COOLDOWN_MS = 60000; // 1ë¶?ì¿¨í???    let currentDetailId = null;

    window.loadReviews = function(restaurantId) {
        currentDetailId = restaurantId;
        const listEl = document.getElementById('reviewList');
        listEl.innerHTML = '<div class="review-empty">ë¦¬ë·°ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤?.. ??/div>';
        
        if (unsubscribeReviews) { unsubscribeReviews(); }
        if (!db) { listEl.innerHTML = '<div class="review-empty">DB ?°ê²° ì§€??ì¤?..</div>'; return; }

        const q = window.fsQuery(
            window.fsCollection(db, `restaurants/${restaurantId}/reviews`), 
            window.fsOrderBy('createdAt', 'desc'), 
            window.fsLimit(20)
        );
        
        unsubscribeReviews = window.fsOnSnapshot(q, (snapshot) => {
            if (currentDetailId !== restaurantId) return; // ?¤ëŠ¦ê²????‘ë‹µ ë¬´ì‹œ
            
            if (snapshot.empty) {
                listEl.innerHTML = '<div class="review-empty">?„ì§ ?œì¤„?‰ì´ ?†ì–´?? ì²?ë²ˆì§¸ ?‰ê?ë¥??¨ê²¨ ì£¼ì„¸?? ?ï¸</div>';
                return;
            }
            
            let html = '';
            snapshot.forEach((doc) => {
                const rv = doc.data();
                const text = escapeHtml(rv.text || '');
                const nickname = escapeHtml(rv.nickname || '?µëª…');
                
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
            listEl.innerHTML = '<div class="review-empty">ë¦¬ë·°ë¥?ë¶ˆëŸ¬?¤ëŠ” ???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?˜¢</div>';
        });
    }

    window.submitReview = async function() {
        if (currentDetailId === null || !db) return;
        const input = document.getElementById('reviewInput');
        const nickInput = document.getElementById('reviewNickname');
        const text = input.value.trim();
        const nickname = nickInput.value.trim() || '?µëª…';
        
        if (!text) return;
        if (text.length > 50) { alert('?œì¤„?‰ì? 50???´ë‚´ë¡??‘ì„±??ì£¼ì„¸??'); return; }
        if (nickname.length > 10) { alert('?‰ë„¤?„ì? 10???´ë‚´ë¡??‘ì„±??ì£¼ì„¸??'); return; }

        const lastTime = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0');
        const now = Date.now();
        if (now - lastTime < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - lastTime)) / 1000);
            document.getElementById('reviewCooldownMsg').innerHTML = `<div class="review-cooldown-msg">??${remaining}ì´??„ì— ?¤ì‹œ ?‘ì„±?????ˆì–´??</div>`;
            return;
        }

        document.getElementById('reviewCooldownMsg').innerHTML = '<div style="font-size: 0.78em; color: var(--main-blue); margin-top: 4px;">?±ë¡ ì¤?.. ?ï¸</div>';
        
        try {
            await window.fsAddDoc(window.fsCollection(db, `restaurants/${currentDetailId}/reviews`), {
                text: text,
                nickname: nickname,
                createdAt: window.fsServerTimestamp()
            });
            
            localStorage.setItem(COOLDOWN_KEY, String(now));
            input.value = '';
            // ?‰ë„¤?„ì? ?¤ìŒ ?‘ì„± ?¸ì˜ë¥??„í•´ ì´ˆê¸°?”í•˜ì§€ ?ŠìŠµ?ˆë‹¤
            document.getElementById('reviewCooldownMsg').innerHTML = '';
        } catch (e) {
            console.error("Firebase addDoc error: ", e);
            document.getElementById('reviewCooldownMsg').innerHTML = `<div class="review-cooldown-msg">?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„??ì£¼ì„¸??</div>`;
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Enter ?¤ë¡œ ?œì¤„???±ë¡
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'reviewInput') {
            e.preventDefault();
            submitReview();
        }
    });

    init();
})();

