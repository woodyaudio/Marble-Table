// 기획서 12번: 5,380곳에 흩어진 restaurants/{id}/pendingEdits 서브컬렉션
// (식당 정보 수정 제안, 11번 참고)을 한 번에 모아 사람이 보고 Claude에게
// 넘길 수 있는 JSON으로 저장하는 관리자 전용 스크립트.
//
// 사전 준비 (최초 1회):
//   Firebase 콘솔(console.firebase.google.com) → 프로젝트(woody-table) → 톱니바퀴
//   → 프로젝트 설정 → 서비스 계정 탭 → "새 비공개 키 생성" → JSON 다운로드 →
//   그 파일을 tools/serviceAccountKey.json 으로 저장(.gitignore의 tools/*.json
//   패턴에 이미 걸려 있어 git에는 올라가지 않음).
//
// ⚠️ 이 키는 Firestore 전체 읽기/쓰기/삭제 권한을 가짐. 절대 커밋하지 말고
// 로컬에만 보관할 것 — 유출되면 데이터를 임의로 지우거나 조작당할 수 있음.
//
// 설치 (최초 1회): npm install firebase-admin
//
// 사용법:
//   node tools/export-pending-edits.js [--key tools/serviceAccountKey.json] [--out tools/pending-edits-export.json]
//
// 출력 형태 (기획서 12번 예시와 동일):
//   [
//     { restaurantId: 1234, restaurantName: "OO식당", field: "menuUrl",
//       candidates: [
//         { path: "restaurants/1234/pendingEdits/abc123", value: "...", nickname: "익명", submittedAt: "..." }
//       ] }
//   ]
// candidates가 1개뿐이거나 전부 값이 같으면 충돌 아님(반영 후보), 값이 서로
// 다르면 충돌 — 어느 쪽이든 이 JSON을 그대로 Claude에게 전달하면 판정해줌.
// 반영 후 tools/clear-pending-edits.js로 해당 path들을 Firestore에서 지우면 됨.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'data', 'restaurants.xlsx');

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        key: path.join(__dirname, 'serviceAccountKey.json'),
        out: path.join(__dirname, 'pending-edits-export.json'),
    };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--key') opts.key = path.resolve(args[++i]);
        else if (args[i] === '--out') opts.out = path.resolve(args[++i]);
    }
    return opts;
}

// index.html의 getRestaurantsData()와 동일한 id 부여 규칙(이름/Dev_Test 필터
// 후 1-based 위치)을 그대로 재현해야 Firestore에 저장된 id와 이름이 정확히
// 맞물림. 노출여부로는 걸러내지 않음 — 앱에서 id를 매길 때도 노출여부 필터는
// id 부여 "이후"에 적용되므로, id 계산 자체는 노출여부와 무관해야 함.
function loadRestaurantNamesById() {
    const wb = XLSX.readFile(XLSX_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const header = rows[0];
    const idx = Object.fromEntries(header.map((h, i) => [String(h).trim(), i]));

    const names = new Map(); // id(number) -> name
    let position = 0;
    rows.slice(1).forEach((row) => {
        const rawName = String(row[idx['이름']] || '').trim();
        if (!rawName || rawName === 'Dev_Test') return;
        position += 1;
        const rawId = String(row[idx['id']] || '').trim();
        const id = parseInt(rawId, 10) || position;
        names.set(id, rawName);
    });
    return names;
}

async function main() {
    const opts = parseArgs();

    if (!fs.existsSync(opts.key)) {
        console.error(`서비스 계정 키가 없습니다: ${opts.key}`);
        console.error('Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후 위 경로에 저장해주세요.');
        process.exit(1);
    }

    const admin = require('firebase-admin');
    const serviceAccount = require(opts.key);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const db = admin.firestore();

    const namesById = loadRestaurantNamesById();

    console.log('pendingEdits 서브컬렉션 조회 중...');
    const snap = await db.collectionGroup('pendingEdits').get();
    console.log(`${snap.size}건의 제보를 찾음.`);

    // (restaurantId, field) 단위로 그룹핑
    const groups = new Map(); // key: `${restaurantId}::${field}` -> { restaurantId, field, candidates: [] }
    snap.forEach((doc) => {
        const data = doc.data();
        const restaurantId = parseInt(doc.ref.parent.parent.id, 10);
        const field = data.field;
        if (!field) return; // 잘못된 형태의 문서는 건너뜀

        const key = `${restaurantId}::${field}`;
        if (!groups.has(key)) groups.set(key, { restaurantId, field, candidates: [] });

        const submittedAt = data.submittedAt && data.submittedAt.toDate
            ? data.submittedAt.toDate().toISOString()
            : null;

        groups.get(key).candidates.push({
            path: doc.ref.path,
            value: data.value != null ? String(data.value) : '',
            nickname: data.nickname || null,
            submittedAt,
        });
    });

    const result = Array.from(groups.values())
        .map((g) => ({
            restaurantId: g.restaurantId,
            restaurantName: namesById.get(g.restaurantId) || '(이름 확인 필요)',
            field: g.field,
            candidates: g.candidates.sort((a, b) => (a.submittedAt || '').localeCompare(b.submittedAt || '')),
        }))
        .sort((a, b) => a.restaurantId - b.restaurantId);

    fs.writeFileSync(opts.out, JSON.stringify(result, null, 2), 'utf-8');

    const conflictCount = result.filter((g) => {
        const distinctValues = new Set(g.candidates.map((c) => c.value));
        return distinctValues.size > 1;
    }).length;

    console.log(`\n${result.length}개 그룹(식당×필드) → ${opts.out}에 저장함.`);
    console.log(`그중 값이 서로 다른(충돌) 그룹: ${conflictCount}개.`);
    console.log('이 JSON 파일을 그대로 Claude에게 전달하면 충돌 판정 및 반영 검토를 진행할 수 있습니다.');

    process.exit(0);
}

main().catch((e) => {
    console.error('내보내기 실패:', e);
    process.exit(1);
});
