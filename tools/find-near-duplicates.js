// data/restaurants.xlsx에서 "주소도 거의 같고 이름도 거의 같은" 근접 중복 후보를 찾는다.
// 완전히 동일한 행(56건)은 이전에 이미 제거했으므로, 이번엔 문자열이 100% 같지는
// 않지만(공백/괄호/층수 표기 차이 등) 사실상 같은 식당으로 보이는 행을 잡아낸다.
//
// 판정 기준:
//   1) 정규화한 주소가 완전히 같은 행끼리 묶고, 그중 이름도 정규화 후 같거나
//      한쪽이 다른쪽을 포함하면 중복 후보로 판정.
//   2) 주소 문자열이 달라도, 좌표가 50m 이내로 가깝고 이름이 (1)과 같은 기준으로
//      비슷하면 중복 후보로 판정(주소 표기만 살짝 다른 경우 대비).
//
// 사용법: node tools/find-near-duplicates.js           → 리포트만 출력(파일 변경 없음)
//        node tools/find-near-duplicates.js --apply    → 각 그룹에서 "가장 정보가
//        풍부한 1건"만 남기고 나머지는 행을 지우지 않은 채 노출여부만
//        "비공개(중복)"으로 바꿔 화면에서만 사라지게 함.
//
// ⚠️ 행을 실제로 삭제하지 않는 이유: id가 엑셀 "행 위치" 기반으로 자동 부여되고
// (map-tab.html 등), 즐겨찾기·한줄평·인기도가 이 id로 Firestore에 저장돼 있음.
// 행을 지우면 그 뒤에 있는 모든 식당의 id가 밀려서 기존 사용자 데이터가 엉뚱한
// 식당 것으로 뒤바뀔 수 있음. 노출여부 컬럼 값만 바꾸면 행 위치가 그대로라 안전함
// (기획서 02번 "id 안정성" 원칙과 동일).

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'data', 'restaurants.xlsx');
const DIST_THRESHOLD_M = 50; // 좌표만으로 "같은 자리"로 볼 최대 거리(미터)

function normName(s) {
    return String(s || '')
        .replace(/\s+/g, '')
        .replace(/[()（）·\-_.,]/g, '')
        .toLowerCase();
}
function normAddr(s) {
    return String(s || '')
        .replace(/\s+/g, '')
        .toLowerCase();
}
function nameSimilar(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    // 한쪽이 다른쪽을 포함(예: "굿푸드" vs "굿푸드구로점")
    if (a.includes(b) || b.includes(a)) return true;
    return false;
}
function getDistanceM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// 정보가 얼마나 채워져 있는지 점수화 — 그룹에서 남길 1건을 고르는 기준
function richness(r) {
    let score = 0;
    if (r.price) score++;
    if (r.hours) score++;
    if (r.description) score++;
    if (r.instagram) score++;
    if (r.kakao) score++;
    if (r.visibility) score++;
    return score;
}

function main() {
    const apply = process.argv.includes('--apply');

    const wb = XLSX.readFile(XLSX_PATH);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const header = rows[0];
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));

    const data = rows.slice(1).map((row, i) => ({
        rowIndex: i, // 0-based, data 배열 내 위치
        raw: row,
        name: String(row[idx['이름']] || '').trim(),
        addr: String(row[idx['주소']] || '').trim(),
        lat: parseFloat(row[idx['lat']]) || 0,
        lng: parseFloat(row[idx['lng']]) || 0,
        price: row[idx['가격']],
        hours: String(row[idx['영업 시간']] || '').trim(),
        description: String(row[idx['설명']] || '').trim(),
        instagram: String(row[idx['인스타']] || '').trim(),
        kakao: String(row[idx['카카오']] || '').trim(),
        visibility: String(row[idx['노출여부']] || '').trim(),
    })).filter(r => r.name && r.name !== 'Dev_Test');

    // ---------- 1) 주소 완전 일치 그룹 ----------
    const byAddr = new Map();
    data.forEach(r => {
        const key = normAddr(r.addr);
        if (!key) return;
        if (!byAddr.has(key)) byAddr.set(key, []);
        byAddr.get(key).push(r);
    });

    const groups = [];
    const grouped = new Set(); // rowIndex가 이미 어느 그룹에 속했는지 표시

    byAddr.forEach(list => {
        if (list.length < 2) return;
        // 같은 주소 안에서 이름 유사한 것끼리 서브그룹
        const used = new Set();
        for (let i = 0; i < list.length; i++) {
            if (used.has(i)) continue;
            const cluster = [list[i]];
            used.add(i);
            for (let j = i + 1; j < list.length; j++) {
                if (used.has(j)) continue;
                if (nameSimilar(normName(list[i].name), normName(list[j].name))) {
                    cluster.push(list[j]);
                    used.add(j);
                }
            }
            if (cluster.length > 1) {
                groups.push(cluster);
                cluster.forEach(r => grouped.add(r.rowIndex));
            }
        }
    });

    // ---------- 2) 주소 문자열은 다르지만 좌표가 50m 이내 + 이름 유사 ----------
    // 좌표를 대략 0.0009도(≈100m) 격자로 나눠 인접 격자끼리만 비교(O(n^2) 방지)
    const GRID = 0.0009;
    const buckets = new Map();
    const remaining = data.filter(r => !grouped.has(r.rowIndex) && r.lat && r.lng);
    remaining.forEach(r => {
        const gx = Math.round(r.lat / GRID);
        const gy = Math.round(r.lng / GRID);
        const key = `${gx}_${gy}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(r);
    });

    const usedIdx2 = new Set();
    remaining.forEach(r => {
        if (usedIdx2.has(r.rowIndex) || grouped.has(r.rowIndex)) return;
        const gx = Math.round(r.lat / GRID);
        const gy = Math.round(r.lng / GRID);
        const candidates = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const list = buckets.get(`${gx + dx}_${gy + dy}`);
                if (list) candidates.push(...list);
            }
        }
        const cluster = [r];
        candidates.forEach(c => {
            if (c.rowIndex === r.rowIndex) return;
            if (grouped.has(c.rowIndex) || usedIdx2.has(c.rowIndex)) return;
            const d = getDistanceM(r.lat, r.lng, c.lat, c.lng);
            if (d <= DIST_THRESHOLD_M && nameSimilar(normName(r.name), normName(c.name))) {
                cluster.push(c);
            }
        });
        if (cluster.length > 1) {
            groups.push(cluster);
            cluster.forEach(x => { grouped.add(x.rowIndex); usedIdx2.add(x.rowIndex); });
        }
    });

    // ---------- 리포트 ----------
    console.log(`총 ${data.length}행 중 근접 중복 후보 그룹 ${groups.length}개 발견 (총 ${groups.reduce((s, g) => s + g.length, 0)}행 관련)\n`);
    groups.forEach((g, gi) => {
        console.log(`[그룹 ${gi + 1}]`);
        g.forEach(r => {
            console.log(`  - "${r.name}" | ${r.addr} | (${r.lat}, ${r.lng}) | 정보점수=${richness(r)}`);
        });
    });

    if (!apply) {
        console.log(`\n(리포트만 출력함 — 실제로 반영하려면 node tools/find-near-duplicates.js --apply)`);
        return;
    }

    // ---------- 각 그룹에서 1건만 "노출" 상태로 남기고 나머지는 비공개 처리 ----------
    // 행 자체는 지우지 않음(순서·id 보존) — 노출여부 컬럼만 "비공개(중복)"으로 바꿔
    // 화면에서만 사라지게 함. 이미 이 값을 인식하는 기존 필터(.startsWith('비공개'))
    // 를 그대로 타므로 앱 코드는 전혀 안 건드려도 됨.
    const visColIdx = idx['노출여부'];
    let hiddenCount = 0;
    groups.forEach(g => {
        // 정보점수 높은 순 → 같으면 원래 순서(먼저 나온 행) 우선
        const sorted = [...g].sort((a, b) => richness(b) - richness(a) || a.rowIndex - b.rowIndex);
        sorted.slice(1).forEach(r => {
            r.raw[visColIdx] = '비공개(중복)';
            hiddenCount++;
        });
    });

    const merged = [header, ...data.map(r => r.raw)];
    const newSheet = XLSX.utils.aoa_to_sheet(merged);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newSheet, sheetName);
    XLSX.writeFile(newWb, XLSX_PATH);

    console.log(`\n${hiddenCount}행을 "비공개(중복)"으로 표시함. 행 자체는 그대로 유지(총 ${data.length}행, id 안 밀림).`);
}

main();
