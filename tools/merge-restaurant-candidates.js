// tools/fetch-restaurants.js가 만든 tools/restaurant-candidates.csv 중
// "(참고)이미등록추정"이 비어있는(=신규) 행만 data/restaurants.xlsx 끝에 추가한다.
//
// 사용법: node tools/merge-restaurant-candidates.js
//
// 가격/영업시간/설명/인스타/카카오는 공공데이터에 없는 정보라 빈 칸으로 들어가고,
// 반드시 사람이 나중에 확인해서 채워야 한다.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(__dirname, 'restaurant-candidates.csv');
const XLSX_PATH = path.join(ROOT, 'data', 'restaurants.xlsx');

function parseCsvLine(line) {
    const out = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
            if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
            else cur += c;
        } else {
            if (c === '"') inQ = true;
            else if (c === ',') { out.push(cur); cur = ''; }
            else cur += c;
        }
    }
    out.push(cur);
    return out;
}

const round6 = s => {
    const n = parseFloat(s);
    return isNaN(n) ? '' : n.toFixed(6);
};

function main() {
    if (!fs.existsSync(CSV_PATH)) {
        throw new Error(`${CSV_PATH} 가 없습니다. 먼저 tools/fetch-restaurants.js를 실행하세요.`);
    }

    const csvRaw = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^﻿/, '');
    const lines = csvRaw.split('\n').filter(l => l.trim() !== '');
    const header = parseCsvLine(lines[0]);
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const candRows = lines.slice(1).map(parseCsvLine);
    const newOnes = candRows.filter(r => !r[idx['(참고)이미등록추정']]);

    const newDataRows = newOnes.map(r => ([
        '', // id: 기존 데이터도 비어있고, map-tab.html에서 행 순서 기반으로 자동 채번함
        r[idx['이름']],
        r[idx['지역']],
        r[idx['주소']],
        round6(r[idx['lat']]),
        round6(r[idx['lng']]),
        '', '', '', '', '' // 설명/가격/영업시간/인스타/카카오
    ]));

    const wb = XLSX.readFile(XLSX_PATH);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const existingRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headerRow = existingRows[0];
    const validExisting = existingRows.slice(1).filter(r => String(r[1] || '').trim() !== '');

    const merged = [headerRow, ...validExisting, ...newDataRows];
    const newSheet = XLSX.utils.aoa_to_sheet(merged);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newSheet, sheetName);
    XLSX.writeFile(newWb, XLSX_PATH);

    console.log(`기존 ${validExisting.length}행 + 신규 ${newDataRows.length}행 = 총 ${validExisting.length + newDataRows.length}행`);
}

main();
