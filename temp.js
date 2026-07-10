
(function() {

    const NOTICES = [
        {
            id: 4,
            title: "v1.3 ?ÖÎç∞?¥Ìä∏: PC ?¨Ïö©??Í∞úÏÑ† Î∞??îÎ©¥ ÏµúÏ†Å????",
            date: "2026-07-05",
            version: "v1.3",
            preview: "PC ?òÍ≤Ω?êÏÑú???ùÎãπ Î™©Î°ù ?†Ï? Î∞??ïÎ≥¥ ?úÏãú Î∞©Ïãù??Í∞úÏÑ†?òÏóà?µÎãà??",
            changes: [
                { icon: "?íª", text: "PC ?òÍ≤Ω?êÏÑú ??ùÑ Î≥ÄÍ≤ΩÌï¥???ºÏ™Ω ?ùÎãπ Î™©Î°ù???†Ï??òÎèÑÎ°?Í∞úÏÑ†" },
                { icon: "?™ü", text: "ÏßÄ?????¥Ïô∏????óê???ùÎãπ ?¥Î¶≠ ??ÏßÄ???¥Îèô ?ÜÏù¥ ?ùÏóÖ?ºÎ°ú ?ÅÏÑ∏ ?ïÎ≥¥ ?úÍ≥µ" },
                { icon: "?ïí", text: "?ÅÏóÖ?úÍ∞Ñ ?úÏãúÎ•?Ï§ëÏãù/?ùÏãù?ºÎ°ú ?òÎàÑ??Î≥¥Í∏∞ ?ΩÍ≤å ?∏Î°ú ?ïÎ†¨" },
                { icon: "??, text: "?ùÎãπ ?ÅÏÑ∏ ?§Î™Ö???ÜÏùÑ Í≤ΩÏö∞ Î∂àÌïÑ?îÌïú Í≥µÎ∞±???úÍ±∞?òÏó¨ UIÎ•?ÍπîÎÅî?òÍ≤å ?ïÎèà" },
                { icon: "?óëÔ∏?, text: "?¨Ïö©?±ÏùÑ Í≥†Î†§?òÏó¨ Î∂àÌïÑ?îÌïú Í∞ÄÍ≤©Î≥Ñ ?ÑÌÑ∞ Í∏∞Îä• ?úÍ±∞" }
            ]
        },
        {
            id: 3,
            title: "v1.2 ?ÖÎç∞?¥Ìä∏: ???ÑÏπò?Ä ?êÏ£º Í∞Ä???•ÏÜå ÎßûÏ∂§ Í∏∞Îä• Í∞ïÌôî! ?è†",
            date: "2026-04-01",
            version: "v1.2",
            preview: "GPS Í∏∞Î∞ò ???ÑÏπò ?ïÏù∏ Î∞??êÏ£º Í∞Ä???•ÏÜå(Ïß??åÏÇ¨) ?§Ï†ï Í∏∞Îä•??Ï∂îÍ??òÏóà?µÎãà??",
            changes: [
                { icon: "?è†", text: "?êÏ£º Í∞Ä???•ÏÜå(Ïß??åÏÇ¨) ÏßÅÏ†ë ?§Ï†ï Î∞??Ä Í≥†Ï†ï Í∏∞Îä• Ï∂îÍ?" },
                { icon: "?éØ", text: "?ïÎ????ÑÏπò ÏßÄ?ïÏùÑ ?ÑÌïú ??ûê??ÎßàÏª§ Î∞?ÏßÄ???¥Îèô Î™®Îìú ?ÑÏûÖ" },
                { icon: "?è¢", text: "?ÑÏû¨ ?ÑÏπò???∞Îùº Ïß??åÏÇ¨Î°?Î≥Ä?òÎäî ?§Îßà??'?? Î≤ÑÌäº" },
                { icon: "?îµ", text: "?§ÏãúÍ∞?GPS Í∏∞Î∞ò ?ÑÏû¨ ?ÑÏπò ?ïÏù∏ Î∞??ÑÏö© ?¥Îèô Î≤ÑÌäº Ï∂îÍ?" },
                { icon: "?ôÔ∏è", text: "ÏßÄ???§ÌÇ® ?§Ï†ï Î©îÎâ¥Î•??§Ï†ï ?????úÏä§??Î©îÎâ¥Î°??µÌï©" }
            ]
        },
        {
            id: 2,
            title: "?¨Ïö© Í≤ΩÌóò Í∞úÏÑ† ?ÖÎç∞?¥Ìä∏ ??,
            date: "2026-04-01",
            version: "v1.1",
            preview: "?§Ï†ï ?îÎ©¥ ??UI/UXÍ∞Ä Í∞úÏÑ†?òÏóà?µÎãà??",
            changes: [
                { icon: "?é®", text: "???åÎßà ?ºÍ??±Ïóê ÎßûÏ∂ò ?§Ï†ï ???îÏûê??Í∞úÌé∏" },
                { icon: "?ìñ", text: "Í∏∞Îä• ?§Î™Ö???ÑÌïú ?¨Ïö© Î∞©Î≤ï ?àÎÇ¥ Î©îÎâ¥ Í≥†ÎèÑ?? },
                { icon: "??, text: "AI ?åÏ¶à ?ÅÏñë Î∂ÑÏÑù ?§Î™Ö?Ä Ï∂îÍ?" }
            ]
        },
        {
            id: 1,
            title: "Woody-Table ?úÎπÑ???úÏûë ?éâ",
            date: "2026-03-13",
            version: "v1.0",
            preview: "Woody-Table???§Ìîà?àÏäµ?àÎã§!",
            changes: [
                { icon: "?ó∫Ô∏?, text: "ÏßÄ??Í∏∞Î∞ò Íµ¨ÎÇ¥?ùÎãπ ?ïÎ≥¥ ?úÎπÑ???§Ìîà" },
                { icon: "?§ñ", text: "AI ?åÏ¶à Í∏∞Îä• - ?åÏãù ?¨ÏßÑ?ºÎ°ú ÏπºÎ°úÎ¶?Î∂ÑÏÑù" },
                { icon: "?é∞", text: "?êÏã¨ Î£∞Î†õ - ?§Îäò Î≠?Î®πÏùÑÏßÄ Í≥†Î? ?¥Í≤∞" },
                { icon: "?í¨", text: "?åÏãù?êÎ≥Ñ ?úÏ§Ñ???®Í∏∞Í∏?Í∏∞Îä•" },
            ]
        }
    ];

    const SCREENS = ['main', 'notice', 'notice-detail', 'inquiry', 'howto', 'system', 'favorite-places', 'locsearch'];

    window.showScreen = function(name) {
        SCREENS.forEach(s => {
            const el = document.getElementById(`screen-${s}`);
            if (!el) return;
            if (s === name) {
                el.style.cssText = '';
                if (s !== 'main') el.classList.add('active');
                else el.style.display = 'block';
            } else {
                if (s !== 'main') { el.classList.remove('active'); el.style.display = ''; }
                else el.style.display = 'none';
            }
        });

        if (name === 'notice') renderNoticeList();
        if (name === 'inquiry' && currentInqTab === 'list') loadInquiries();
        if (name === 'system') {
            updateMapThemeUI();
            updateAppThemeUI();
        }
    };

    function updateMapThemeUI() {
        const theme = parseInt(localStorage.getItem('woody_map_theme')) || 0;
        [0, 1, 2].forEach(i => document.getElementById(`skin-btn-${i}`).classList.remove('selected'));
        const activeBtn = document.getElementById(`skin-btn-${theme}`);
        if (activeBtn) activeBtn.classList.add('selected');
    }

    window.setGlobalMapTheme = function(index) {
        localStorage.setItem('woody_map_theme', index);
        if (window.setMapTheme) window.setMapTheme(index);
    // ===== ?ÑÏπò Í≤Ä???úÏä§??=====
    let targetLocMode = 'home';
    window.openLocationSearch = function(mode) {
        targetLocMode = mode;
        document.getElementById('locsearch-title').innerText = mode === 'home' ? '?è† Ïß??ÑÏπò ?§Ï†ï' : '?è¢ ?åÏÇ¨ ?ÑÏπò ?§Ï†ï';
        document.getElementById('loc-search-input').value = '';
        document.getElementById('loc-search-results').innerHTML = '';
        showScreen('locsearch');
    };

    window.searchLocation = async function() {
        const query = document.getElementById('loc-search-input').value.trim();
        if (!query) return;
        
        const resEl = document.getElementById('loc-search-results');
        resEl.innerHTML = '<div style="color:var(--settings-sub); font-size:0.85em; text-align:center;">Í≤Ä??Ï§?.. ??/div>';
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            
            if (!data || data.length === 0) {
                resEl.innerHTML = '<div style="color:#ef4444; font-size:0.85em; text-align:center;">Í≤Ä??Í≤∞Í≥ºÍ∞Ä ?ÜÏäµ?àÎã§.<br>OpenStreetMap Í∏∞Î∞ò?¥Î?Î°??úÍµ≠??Ï£ºÏÜå ?∏Ïãù??Î∂ÄÏ°±Ìï† ???àÏäµ?àÎã§.</div>';
                return;
            }
            
            resEl.innerHTML = data.slice(0, 5).map(item => `
                <div class="notice-item" style="padding:12px; margin-bottom:0;" onclick="selectSearchedLocation(${item.lat}, ${item.lon})">
                    <div class="notice-title" style="font-size:0.85em; margin-bottom:0;">${item.display_name}</div>
                </div>
            `).join('');
            
        } catch(e) {
            console.error(e);
            resEl.innerHTML = '<div style="color:#ef4444; font-size:0.85em; text-align:center;">Í≤Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.</div>';
        }
    };

    window.selectSearchedLocation = function(lat, lng) {
        localStorage.setItem('woody_location_picker_mode', targetLocMode);
        localStorage.setItem('woody_picker_search_loc', JSON.stringify({lat: parseFloat(lat), lng: parseFloat(lng)}));
        if (window.loadTab) window.loadTab('map');
    };

    window.openMapPickerDirectly = function() {
        localStorage.setItem('woody_location_picker_mode', targetLocMode);
        localStorage.removeItem('woody_picker_search_loc');
        if (window.loadTab) window.loadTab('map');
    };

    // ===== Í≥µÏ??¨Ìï≠ Î™©Î°ù ?åÎçî =====
    function renderNoticeList() {
        const container = document.getElementById('notice-list-content');
        if (!container) return;
        // ?†Ïßú Í∏∞Ï? ÏµúÏã†???ïÎ†¨
        const sortedNotices = NOTICES.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sortedNotices.map(n => `
            <div class="notice-item" onclick="showNoticeDetail(${n.id})">
                <div class="notice-meta">
                    <span class="notice-badge">${n.version}</span>
                    <span class="notice-date">${n.date}</span>
                </div>
                <div class="notice-title">${n.title}</div>
                <div class="notice-preview">${n.preview}</div>
            </div>
        `).join('');
    }

    window.showNoticeDetail = function(id) {
        const n = NOTICES.find(x => x.id === id);
        if (!n) return;

        const changesHtml = n.changes.map(c => `
            <div class="change-item">
                <span class="change-item-icon">${c.icon}</span>
                <span class="change-item-text">${c.text}</span>
            </div>
        `).join('');

        document.getElementById('notice-detail-body').innerHTML = `
            <div class="notice-detail-title">${n.title}</div>
            <div class="notice-detail-meta">
                <span class="notice-badge">${n.version}</span>
                <span class="notice-date">${n.date}</span>
            </div>
            <div class="notice-detail-body">${changesHtml}</div>
        `;
        showScreen('notice-detail');
    };

    // ===== Î¨∏Ïùò?òÍ∏∞ =====
    let selectedCategory = null;
    let currentInqTab = 'write';
    let allInquiries = [];
    let currentFilter = 'all';
    let unsubscribeInquiries = null;
    let db = null;

    const COOLDOWN_KEY = 'woody_inquiry_cooldown';
    const COOLDOWN_MS = 3 * 60 * 1000; // 3Î∂?

    const CAT_LABELS = {
        bug:        { label: '?êõ Î≤ÑÍ∑∏ ?úÎ≥¥',      badge: 'badge-bug' },
        restaurant: { label: '?çú ?åÏãù???ïÎ≥¥',    badge: 'badge-restaurant' },
        region:     { label: '?ìç ÏßÄ??Ï∂îÍ? ?îÏ≤≠', badge: 'badge-region' },
        feature:    { label: '??Í∏∞Îä• ?îÏ≤≠',    badge: 'badge-feature' },
    };

    // Firebase Ï¥àÍ∏∞??
    async function initFirebase() {
        try {
            const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js');
            const { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp }
                = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');

            const firebaseConfig = {
                apiKey: "AIzaSyAaMivo3ZBcwS5OjDjXmCo9kZo47t0rZBc",
                authDomain: "woody-table.firebaseapp.com",
                projectId: "woody-table",
                storageBucket: "woody-table.firebasestorage.app",
                messagingSenderId: "640333501525",
                appId: "1:640333501525:web:db00602be7d7e8742c30dc"
            };

            const existingApps = getApps();
            const app = existingApps.find(a => a.name === 'inquiry-app')
                || initializeApp(firebaseConfig, 'inquiry-app');
            db = getFirestore(app);

            window._inqFs = { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp };
        } catch (e) {
            console.error('Firebase init err (inquiry):', e);
        }
    }

    initFirebase();

    // Ïπ¥ÌÖåÍ≥†Î¶¨ ?†ÌÉù
    window.selectCategory = function(btn) {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedCategory = btn.dataset.cat;
    };

    // Í∏Ä?êÏàò Ïπ¥Ïö¥??
    window.updateCharCount = function() {
        const len = document.getElementById('inq-content').value.length;
        document.getElementById('char-count').textContent = len;
    };

    document.getElementById('inq-nickname').addEventListener('focus', function() {
        document.getElementById('screen-inquiry').scrollTo({ top: 0, behavior: 'smooth' });
    });

    const resumeScreen = localStorage.getItem('woody_setting_resume_screen');
    if (resumeScreen) {
        localStorage.removeItem('woody_setting_resume_screen');
        showScreen(resumeScreen);
    }

    // ???ÑÌôò
    window.switchInquiryTab = function(tab) {
        currentInqTab = tab;
        document.getElementById('tab-write').classList.toggle('active', tab === 'write');
        document.getElementById('tab-list').classList.toggle('active', tab === 'list');
        document.getElementById('inquiry-write-panel').style.display = tab === 'write' ? 'block' : 'none';
        document.getElementById('inquiry-list-panel').style.display = tab === 'list' ? 'block' : 'none';
        if (tab === 'list') loadInquiries();
    };

    // Î™©Î°ù ?ÑÌÑ∞ Ïπ?
    window.filterInquiries = function(chip) {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        renderInquiryList();
    };

    // Firebase Î™©Î°ù Î°úÎìú
    function loadInquiries() {
        const container = document.getElementById('inq-list-container');
        container.innerHTML = '<div class="inquiry-loading">Î∂àÎü¨?§Îäî Ï§?.. ??/div>';

        if (!db || !window._inqFs) {
            setTimeout(loadInquiries, 800);
            return;
        }

        if (unsubscribeInquiries) unsubscribeInquiries();

        const { collection, query, orderBy, limit, onSnapshot } = window._inqFs;
        const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'), limit(50));

        unsubscribeInquiries = onSnapshot(q, (snapshot) => {
            allInquiries = [];
            snapshot.forEach(doc => allInquiries.push({ id: doc.id, ...doc.data() }));
            renderInquiryList();
        }, (err) => {
            console.error('Inquiry fetch error:', err);
            container.innerHTML = '<div class="inquiry-empty">Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà?? ?ò¢</div>';
        });
    }

    function renderInquiryList() {
        const filtered = currentFilter === 'all'
            ? allInquiries
            : allInquiries.filter(i => i.category === currentFilter);

        document.getElementById('inq-list-count').textContent = `Ï¥?${filtered.length}Í±?;

        const container = document.getElementById('inq-list-container');
        if (filtered.length === 0) {
            container.innerHTML = '<div class="inquiry-empty">?ÑÏßÅ Î¨∏ÏùòÍ∞Ä ?ÜÏñ¥?? Ï≤?Î≤àÏß∏ Î¨∏ÏùòÎ•??®Í≤®Ï£ºÏÑ∏?? ?çÔ∏è</div>';
            return;
        }

        container.innerHTML = filtered.map(item => {
            const cat = CAT_LABELS[item.category] || { label: item.category, badge: '' };
            let dateStr = '';
            if (item.createdAt) {
                const d = item.createdAt.toDate();
                dateStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            }
            const nickname = escapeHtml(item.nickname || '?µÎ™Ö');
            const content = escapeHtml(item.content || '');
            return `
                <div class="inquiry-card">
                    <div class="inquiry-card-top">
                        <span class="category-badge ${cat.badge}">${cat.label}</span>
                        <span class="inquiry-nickname">${nickname}</span>
                        <span class="inquiry-date">${dateStr}</span>
                    </div>
                    <div class="inquiry-content">${content}</div>
                </div>
            `;
        }).join('');
    }

    // Í∏Ä ?±Î°ù
    window.submitInquiry = async function() {
        const msg = document.getElementById('inq-msg');

        if (!selectedCategory) { msg.textContent = 'Ïπ¥ÌÖåÍ≥†Î¶¨Î•??†ÌÉù??Ï£ºÏÑ∏??'; return; }
        const nickname = document.getElementById('inq-nickname').value.trim();
        const content = document.getElementById('inq-content').value.trim();
        if (!nickname) { msg.textContent = '?âÎÑ§?ÑÏùÑ ?ÖÎ†•??Ï£ºÏÑ∏??'; return; }
        if (!content) { msg.textContent = '?¥Ïö©???ÖÎ†•??Ï£ºÏÑ∏??'; return; }
        if (content.length > 200) { msg.textContent = '?¥Ïö©?Ä 200???¥ÎÇ¥Î°??ëÏÑ±??Ï£ºÏÑ∏??'; return; }

        // Ïø®Îã§??Ï≤¥ÌÅ¨
        const lastTime = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0');
        const now = Date.now();
        if (now - lastTime < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - lastTime)) / 1000);
            const m = remaining >= 60 ? `${Math.floor(remaining/60)}Î∂?${remaining%60}Ï¥? : `${remaining}Ï¥?;
            msg.textContent = `??${m} ?ÑÏóê ?§Ïãú ?ëÏÑ±?????àÏñ¥??`;
            return;
        }

        if (!db || !window._inqFs) { msg.textContent = 'DB ?∞Í≤∞ Ï§ëÏûÖ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??'; return; }

        const btn = document.getElementById('inq-submit-btn');
        btn.disabled = true;
        msg.textContent = '?±Î°ù Ï§?..';
        msg.className = 'cooldown-msg';

        try {
            const { collection, addDoc, serverTimestamp } = window._inqFs;
            await addDoc(collection(db, 'inquiries'), {
                category: selectedCategory,
                nickname,
                content,
                createdAt: serverTimestamp()
            });

            localStorage.setItem(COOLDOWN_KEY, String(now));
            document.getElementById('inq-content').value = '';
            updateCharCount();
            selectedCategory = null;
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));

            msg.textContent = '??Î¨∏ÏùòÍ∞Ä ?±Î°ù?òÏóà?µÎãà??';
            msg.className = 'cooldown-msg success-msg';
            setTimeout(() => { msg.textContent = ''; msg.className = 'cooldown-msg'; }, 3000);
        } catch (e) {
            console.error('Inquiry addDoc error:', e);
            msg.textContent = '?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??';
        } finally {
            btn.disabled = false;
        }
    };

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Enter ???úÏ∂ú Î∞©Ï? (textarea)
    document.getElementById('inq-content')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
    });

    function updateAppThemeUI() {
        const theme = localStorage.getItem('woody_app_theme') || 'default';
        document.getElementById('app-theme-default').classList.toggle('selected', theme === 'default');
        document.getElementById('app-theme-dark').classList.toggle('selected', theme === 'dark');
    }

    window.setGlobalAppTheme = function(theme) {
        localStorage.setItem('woody_app_theme', theme);
        if (window.applyAppTheme) {
            window.applyAppTheme();
        }
        updateAppThemeUI();
    };

    // Ï¥àÍ∏∞ ?îÎ©¥
    showScreen('main');
    updateAppThemeUI();
})();

