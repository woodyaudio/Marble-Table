// 기획서 12번 짝 스크립트: xlsx 반영이 끝난 정보 수정 제안(pendingEdits) 문서를
// Firestore에서 지움. export-pending-edits.js가 만든 각 candidate의 `path`
// (예: "restaurants/1234/pendingEdits/abc123")를 그대로 넘기면 됨.
//
// 사전 준비: export-pending-edits.js와 동일한 서비스 계정 키 필요
// (기본 경로: tools/serviceAccountKey.json)
//
// 사용법 (둘 중 하나):
//   1) 경로를 콤마로 직접 나열
//      node tools/clear-pending-edits.js --paths "restaurants/1234/pendingEdits/abc,restaurants/5/pendingEdits/xyz"
//
//   2) JSON 파일로 전달 (문자열 경로 배열, 또는 export 결과에서 골라낸
//      candidate 객체 배열 — 둘 다 지원)
//      node tools/clear-pending-edits.js --file tools/applied-paths.json
//
// ⚠️ 되돌릴 수 없는 삭제입니다. xlsx에 실제로 값을 반영하고 검증까지 마친
// 뒤에만 실행하세요.

const fs = require('fs');
const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        key: path.join(__dirname, 'serviceAccountKey.json'),
        paths: null,
        file: null,
    };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--key') opts.key = path.resolve(args[++i]);
        else if (args[i] === '--paths') opts.paths = args[++i];
        else if (args[i] === '--file') opts.file = path.resolve(args[++i]);
    }
    return opts;
}

function loadTargetPaths(opts) {
    if (opts.paths) {
        return opts.paths.split(',').map((p) => p.trim()).filter(Boolean);
    }
    if (opts.file) {
        if (!fs.existsSync(opts.file)) {
            throw new Error(`파일을 찾을 수 없습니다: ${opts.file}`);
        }
        const raw = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
        if (!Array.isArray(raw)) throw new Error('JSON 파일은 배열이어야 합니다.');
        return raw.map((item) => (typeof item === 'string' ? item : item.path)).filter(Boolean);
    }
    return [];
}

async function main() {
    const opts = parseArgs();
    const targetPaths = loadTargetPaths(opts);

    if (targetPaths.length === 0) {
        console.error('삭제할 문서 경로가 없습니다. --paths 또는 --file 옵션을 지정해주세요.');
        process.exit(1);
    }

    if (!fs.existsSync(opts.key)) {
        console.error(`서비스 계정 키가 없습니다: ${opts.key}`);
        process.exit(1);
    }

    const admin = require('firebase-admin');
    const serviceAccount = require(opts.key);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const db = admin.firestore();

    console.log(`${targetPaths.length}개 문서를 삭제합니다:`);
    targetPaths.forEach((p) => console.log(`  - ${p}`));

    // Firestore 배치 쓰기는 최대 500건 제한 — 넉넉히 400개씩 나눠 처리
    const BATCH_SIZE = 400;
    let deleted = 0;
    for (let i = 0; i < targetPaths.length; i += BATCH_SIZE) {
        const chunk = targetPaths.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach((p) => batch.delete(db.doc(p)));
        await batch.commit();
        deleted += chunk.length;
    }

    console.log(`\n${deleted}개 문서 삭제 완료.`);
    process.exit(0);
}

main().catch((e) => {
    console.error('삭제 실패:', e);
    process.exit(1);
});
