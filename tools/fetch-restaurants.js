// 공공데이터포털 "소상공인시장진흥공단_상가(상권)정보" API로
// 특정 좌표 반경 내 "구내식당·뷔페"(업종중분류코드 I207) 상가를 조회해서
// data/restaurants.xlsx에 아직 없는 곳만 후보 CSV로 저장하는 일회성 수집 스크립트.
//
// 사용법:
//   node tools/fetch-restaurants.js [--lat 37.479932] [--lng 126.895215] [--radius 3000]
//
// tools/.env 파일에 DATA_GO_KR_KEY=발급받은인증키(Encoding 버전) 가 있어야 함.
// (tools/.env, tools/*.csv 는 .gitignore에 등록되어 있어 git에는 올라가지 않음)
//
// 출력: tools/restaurant-candidates.csv
//   → 엑셀로 열어서 진짜 구내식당/한식뷔페 맞는지 검토하고,
//     가격/영업시간/인스타/카카오 등을 채운 뒤 data/restaurants.xlsx에 옮겨 붙이면 됨.
//
// 참고: 이 API는 이름/주소/좌표까지만 제공. 가격·영업시간·SNS 계정 같은 정보는
// 어떤 공공데이터에도 없어서 자동화가 안 되고, 반드시 수동 확인이 필요함.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const BASE_URL = 'http://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius';
const CAFETERIA_MCLS_CD = 'I207'; // 상권업종중분류: 구내식당·뷔페

function loadServiceKey() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        throw new Error('tools/.env 파일이 없습니다. DATA_GO_KR_KEY=발급받은키 형태로 만들어주세요.');
    }
    const raw = fs.readFileSync(envPath, 'utf-8');
    const match = raw.match(/DATA_GO_KR_KEY=(.+)/);
    if (!match) throw new Error('tools/.env에 DATA_GO_KR_KEY 항목이 없습니다.');
    return match[1].trim();
}

function parseArgs() {
    const args = process.argv.slice(2);
    // 기본값: map-tab.html의 defaultCompanyLoc과 동일 (가산디지털단지 근처)
    const opts = { lat: 37.479932, lng: 126.895215, radius: 3000 };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--lat') opts.lat = parseFloat(args[++i]);
        else if (args[i] === '--lng') opts.lng = parseFloat(args[++i]);
        else if (args[i] === '--radius') opts.radius = parseInt(args[++i], 10);
    }
    return opts;
}

// 기존 data/restaurants.xlsx에 이미 있는 장소 목록 (이름 + 좌표)
// "이름만" 비교하면 같은 위탁급식 브랜드(예: 웰스토리)가 다른 회사/다른 지역에
// 입점한 별개의 지점까지 중복으로 오인할 수 있어서, 이름이 같으면서 동시에
// 물리적으로 가까운(약 150m 이내) 경우에만 "이미 등록된 곳"으로 판단한다.
function loadExistingPlaces() {
    const xlsxPath = path.join(__dirname, '..', 'data', 'restaurants.xlsx');
    if (!fs.existsSync(xlsxPath)) return [];
    const wb = XLSX.readFile(xlsxPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const header = rows[0];
    const col = name => header.findIndex(h => String(h).trim() === name);
    const nameCol = col('이름'), latCol = col('lat'), lngCol = col('lng');
    if (nameCol === -1) return [];
    return rows.slice(1)
        .filter(r => String(r[nameCol] || '').trim() !== '')
        .map(r => ({
            name: String(r[nameCol]).trim().replace(/\s+/g, ''),
            lat: parseFloat(r[latCol]),
            lng: parseFloat(r[lngCol])
        }));
}

// 두 좌표 사이 거리(m), 소규모 거리라 단순 평면 근사로 충분
function distMeters(lat1, lng1, lat2, lng2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLng = (lng2 - lng1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.hypot(dLat, dLng);
}

const DUP_DISTANCE_M = 150;

function isDuplicate(existingPlaces, name, lat, lng) {
    const normName = name.replace(/\s+/g, '');
    return existingPlaces.some(p =>
        p.name === normName &&
        !isNaN(lat) && !isNaN(lng) && !isNaN(p.lat) && !isNaN(p.lng) &&
        distMeters(p.lat, p.lng, lat, lng) <= DUP_DISTANCE_M
    );
}

async function fetchPage(serviceKey, cx, cy, radius, pageNo) {
    // serviceKey는 이미 percent-encoding된 "Encoding" 키라서 재인코딩하지 않고 그대로 붙임
    const url = `${BASE_URL}?serviceKey=${serviceKey}`
        + `&cx=${cx}&cy=${cy}&radius=${radius}&indsMclsCd=${CAFETERIA_MCLS_CD}`
        + `&type=json&numOfRows=500&pageNo=${pageNo}`;

    const res = await fetch(url);
    const text = await res.text();

    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        throw new Error(
            `응답을 JSON으로 파싱하지 못했습니다 (XML로 응답했을 가능성).\n` +
            `HTTP ${res.status}, 응답 앞부분:\n${text.slice(0, 500)}`
        );
    }

    if (json.header && json.header.resultCode !== '00') {
        throw new Error(`API 오류: ${json.header.resultCode} ${json.header.resultMsg}`);
    }

    const body = json && json.body;
    if (!body) throw new Error(`예상과 다른 응답 구조입니다: ${JSON.stringify(json).slice(0, 500)}`);
    return body;
}

async function fetchAll(serviceKey, cx, cy, radius) {
    let all = [];
    let pageNo = 1;
    while (true) {
        const body = await fetchPage(serviceKey, cx, cy, radius, pageNo);
        // type=json 요청 시 body.items는 곧바로 배열 (XML 변환 라이브러리 문서의 items.item 구조와 다름)
        const items = Array.isArray(body.items) ? body.items : [];
        all = all.concat(items);

        const totalCount = parseInt(body.totalCount || String(all.length), 10);
        if (items.length === 0 || all.length >= totalCount || pageNo > 50) break;
        pageNo++;
    }
    return all;
}

function toCsvValue(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
    const serviceKey = loadServiceKey();
    const { lat, lng, radius } = parseArgs();
    const existingPlaces = loadExistingPlaces();
    console.log(`기존 data/restaurants.xlsx에 등록된 장소 ${existingPlaces.length}개 로드`);

    console.log(`(${lat}, ${lng}) 반경 ${radius}m 내 구내식당·뷔페(I207) 조회 중...`);
    const items = await fetchAll(serviceKey, lng, lat, radius); // cx=경도(lng), cy=위도(lat)
    console.log(`총 ${items.length}건 수신`);

    const rowsAll = items.map(it => {
        const name = it.bizesNm || '';
        const isDup = isDuplicate(existingPlaces, name, it.lat, it.lon);
        return {
            이름: name,
            지역: it.signguNm || '', // 시군구명 (예: 구로구) - 기존 표기와 다를 수 있어 검토 필요
            주소: it.rdnmAdr || it.lnoAdr || '',
            lat: it.lat || '',
            lng: it.lon || '',
            설명: '', 가격: '', '영업 시간': '', 인스타: '', 카카오: '',
            '(참고)이미등록추정': isDup ? 'O' : ''
        };
    });

    const newCount = rowsAll.filter(r => !r['(참고)이미등록추정']).length;
    console.log(`신규 후보: ${newCount}건 / 이미 등록된 듯한 후보: ${rowsAll.length - newCount}건 (이름 일치 + ${DUP_DISTANCE_M}m 이내 근접 기준, CSV에 표시만 하고 제외는 안 함)`);

    const header = ['이름', '지역', '주소', 'lat', 'lng', '설명', '가격', '영업 시간', '인스타', '카카오', '(참고)이미등록추정'];
    const csv = [header, ...rowsAll.map(r => header.map(h => toCsvValue(r[h])))]
        .map(r => r.join(','))
        .join('\n');

    const outPath = path.join(__dirname, 'restaurant-candidates.csv');
    fs.writeFileSync(outPath, '﻿' + csv, 'utf-8'); // BOM: 엑셀에서 한글 깨짐 방지

    console.log(`\n✅ ${outPath} 에 저장했습니다.`);
    console.log('엑셀로 열어서 (참고)이미등록추정=O 인 행은 걸러내고,');
    console.log('나머지는 가격/영업시간/인스타/카카오 등을 채운 뒤 data/restaurants.xlsx로 옮겨주세요.');
}

main().catch(e => {
    console.error('오류:', e.message);
    process.exit(1);
});
