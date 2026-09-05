// 수도권(서울/인천/경기) 전체를 좌표 격자로 기계적으로 훑어서
// "구내식당·뷔페"(I207) 커버리지 공백을 조사하고, 신규 후보를 뽑는 스크립트.
//
// 기존 tools/fetch-restaurants.js는 사람이 고른 랜드마크 좌표 중심의 반경 검색이라,
// 원과 원 사이 빈 공간은 "실제로 없는 곳"인지 "그냥 안 찾아본 곳"인지 구분이 안 됐음.
// 이 스크립트는 그 편향을 없애기 위해 특정 지점을 고르지 않고, 격자를 기계적으로
// 생성해서 빠짐없이 훑는다.
//
// 사용법: node tools/grid-sweep-restaurants.js
//
// 출력:
//   tools/grid-sweep-report.json  — 격자별 결과 수(공백 조사용)
//   tools/grid-sweep-candidates.csv — 기존 data/restaurants.xlsx에 없는 신규 후보

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const BASE_URL = 'http://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius';
const CAFETERIA_MCLS_CD = 'I207';

// 수도권 대략적인 경계 (서울/인천/경기 전체를 넉넉히 덮는 사각형)
const BOUNDS = { latMin: 36.85, latMax: 38.30, lngMin: 126.30, lngMax: 127.85 };
const GRID_SPACING_M = 5000; // 격자 간격 5km
const RADIUS_M = 4000;       // 반경 4km (간격보다 커서 원끼리 겹치게 = 빈틈 없음)

function loadServiceKey() {
    const envPath = path.join(__dirname, '.env');
    const raw = fs.readFileSync(envPath, 'utf-8');
    return raw.match(/DATA_GO_KR_KEY=(.+)/)[1].trim();
}

function buildGrid() {
    const points = [];
    const latStepDeg = GRID_SPACING_M / 111320;
    for (let lat = BOUNDS.latMin; lat <= BOUNDS.latMax; lat += latStepDeg) {
        const lngStepDeg = GRID_SPACING_M / (111320 * Math.cos(lat * Math.PI / 180));
        for (let lng = BOUNDS.lngMin; lng <= BOUNDS.lngMax; lng += lngStepDeg) {
            points.push({ lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) });
        }
    }
    return points;
}

async function fetchPage(serviceKey, cx, cy, radius, pageNo) {
    const url = `${BASE_URL}?serviceKey=${serviceKey}`
        + `&cx=${cx}&cy=${cy}&radius=${radius}&indsMclsCd=${CAFETERIA_MCLS_CD}`
        + `&type=json&numOfRows=500&pageNo=${pageNo}`;
    const res = await fetch(url);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch (e) { throw new Error(`JSON 파싱 실패 (${cx},${cy}): ${text.slice(0, 200)}`); }
    if (json.header && json.header.resultCode !== '00') {
        throw new Error(`API 오류(${cx},${cy}): ${json.header.resultCode} ${json.header.resultMsg}`);
    }
    return json.body || {};
}

async function fetchAllAtPoint(serviceKey, cx, cy, radius) {
    let all = [];
    let pageNo = 1;
    while (true) {
        const body = await fetchPage(serviceKey, cx, cy, radius, pageNo);
        const items = Array.isArray(body.items) ? body.items : [];
        all = all.concat(items);
        const totalCount = parseInt(body.totalCount || String(all.length), 10);
        if (items.length === 0 || all.length >= totalCount || pageNo > 10) break;
        pageNo++;
    }
    return all;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadExistingPlaces() {
    const xlsxPath = path.join(__dirname, '..', 'data', 'restaurants.xlsx');
    const wb = XLSX.readFile(xlsxPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const header = rows[0];
    const col = name => header.findIndex(h => String(h).trim() === name);
    const nameCol = col('이름'), latCol = col('lat'), lngCol = col('lng');
    return rows.slice(1)
        .filter(r => String(r[nameCol] || '').trim() !== '')
        .map(r => ({
            name: String(r[nameCol]).trim().replace(/\s+/g, ''),
            lat: parseFloat(r[latCol]),
            lng: parseFloat(r[lngCol])
        }));
}

function distMeters(lat1, lng1, lat2, lng2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLng = (lng2 - lng1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.hypot(dLat, dLng);
}
const DUP_DISTANCE_M = 150;
function isDuplicate(existingPlaces, name, lat, lng) {
    const normName = name.replace(/\s+/g, '');
    return existingPlaces.some(p =>
        p.name === normName && !isNaN(lat) && !isNaN(lng) && !isNaN(p.lat) && !isNaN(p.lng) &&
        distMeters(p.lat, p.lng, lat, lng) <= DUP_DISTANCE_M
    );
}

function toCsvValue(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
    const serviceKey = loadServiceKey();
    const grid = buildGrid();
    console.log(`격자점 ${grid.length}개 생성 (간격 ${GRID_SPACING_M}m, 반경 ${RADIUS_M}m)`);
    console.log(`예상 API 호출: 약 ${grid.length}건 (하루 한도 10,000건 중 약 ${(grid.length/100).toFixed(1)}%)`);

    const byId = new Map(); // bizesId 기준 전역 중복 제거 (겹치는 원들에서 같은 가게가 여러 번 나오는 것 방지)
    const perCellCount = []; // 공백 조사용 격자별 결과 수

    for (let i = 0; i < grid.length; i++) {
        const { lat, lng } = grid[i];
        try {
            const items = await fetchAllAtPoint(serviceKey, lng, lat, RADIUS_M); // cx=lng, cy=lat
            perCellCount.push({ lat, lng, count: items.length });
            for (const it of items) {
                if (it.bizesId && !byId.has(it.bizesId)) byId.set(it.bizesId, it);
            }
        } catch (e) {
            console.warn(`격자 (${lat},${lng}) 실패: ${e.message}`);
            perCellCount.push({ lat, lng, count: null, error: e.message });
        }
        if ((i + 1) % 50 === 0) console.log(`  진행: ${i + 1}/${grid.length}, 누적 고유 업체: ${byId.size}`);
        await sleep(150); // API 부담 줄이기용 딜레이
    }

    console.log(`\n격자 스윕 완료. 전체 고유 업체(구내식당·뷔페): ${byId.size}건`);

    // 공백(결과 0건) 지점 통계
    const emptyCells = perCellCount.filter(c => c.count === 0).length;
    const errorCells = perCellCount.filter(c => c.count === null).length;
    console.log(`격자 중 결과 0건: ${emptyCells}개 / 조회 실패: ${errorCells}개 / 전체 ${grid.length}개`);

    fs.writeFileSync(
        path.join(__dirname, 'grid-sweep-report.json'),
        JSON.stringify({ gridSpacingM: GRID_SPACING_M, radiusM: RADIUS_M, cells: perCellCount }, null, 2)
    );

    // 기존 데이터와 대조
    const existingPlaces = loadExistingPlaces();
    console.log(`기존 data/restaurants.xlsx 장소 ${existingPlaces.length}개와 대조 중...`);

    const allItems = Array.from(byId.values());
    const rows = allItems.map(it => {
        const name = it.bizesNm || '';
        const isDup = isDuplicate(existingPlaces, name, it.lat, it.lon);
        return {
            이름: name, 지역: it.signguNm || '', 주소: it.rdnmAdr || it.lnoAdr || '',
            lat: it.lat || '', lng: it.lon || '',
            설명: '', 가격: '', '영업 시간': '', 인스타: '', 카카오: '',
            '(참고)이미등록추정': isDup ? 'O' : ''
        };
    });

    const newCount = rows.filter(r => !r['(참고)이미등록추정']).length;
    console.log(`신규 후보: ${newCount}건 / 이미 등록된 듯한 후보: ${rows.length - newCount}건`);

    const header = ['이름', '지역', '주소', 'lat', 'lng', '설명', '가격', '영업 시간', '인스타', '카카오', '(참고)이미등록추정'];
    const csv = [header, ...rows.map(r => header.map(h => toCsvValue(r[h])))].map(r => r.join(',')).join('\n');
    fs.writeFileSync(path.join(__dirname, 'grid-sweep-candidates.csv'), '﻿' + csv, 'utf-8');

    console.log(`\n✅ tools/grid-sweep-candidates.csv (신규 후보), tools/grid-sweep-report.json (격자별 결과 수) 저장 완료`);
}

main().catch(e => { console.error('오류:', e.message); process.exit(1); });
