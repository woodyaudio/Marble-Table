const https = require('https');
const fs = require('fs');
const path = require('path');

// 공항철도(인천국제공항철도) bbox
// 서울역(37.555, 126.972) ~ 인천공항2터미널(37.469, 126.411)
// bbox: (37.3, 126.3, 37.7, 127.1)
const query = `[out:json][timeout:90];
(
  way["railway"]["name"~"\\uacf5\\ud56d"][bbox:37.3,126.3,37.7,127.1];
  way["railway"]["name"~"Airport"][bbox:37.3,126.3,37.7,127.1];
  node["railway"~"station|halt"]["name"]["bbox:37.3,126.3,37.7,127.1"];
);
out body geom;`;

// bbox를 URL 파라미터로 직접 지정하는 방식
const query2 = `[out:json][timeout:90];
(
  way["railway"~"rail|light_rail"]["service"!="yard"]["service"!="siding"]["service"!="crossover"]["service"!="headshunt"](37.3,126.3,37.7,127.1);
  node["railway"~"station|halt"](37.3,126.3,37.7,127.1);
);
out body geom;`;

const url = 'https://overpass-api.de/api/interpreter';

function postRequest(url, body) {
  return new Promise((resolve, reject) => {
    const postData = 'data=' + encodeURIComponent(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'MarbleTableApp/1.0'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('공항철도 구간(인천공항 포함 bbox) 데이터 수집 중...');
  
  const res = await postRequest(url, query2);
  console.log('HTTP 상태:', res.status);
  
  if (res.body.startsWith('<')) {
    console.error('에러 응답:', res.body.substring(0, 300));
    return;
  }

  const newData = JSON.parse(res.body);
  console.log('수신된 요소 수:', newData.elements.length);

  const ways = newData.elements.filter(e => e.type === 'way' && e.geometry && e.tags && e.tags.railway);
  const stations = newData.elements.filter(e => e.type === 'node' && e.tags && (e.tags.railway === 'station' || e.tags.railway === 'halt'));
  console.log('railway way 수:', ways.length);
  console.log('역 수:', stations.length);

  const names = [...new Set(ways.map(e => e.tags.name || '').filter(Boolean))];
  console.log('포함된 노선명 일부:', names.slice(0, 20).join(', '));

  // 기존 subway_raw.json 병합
  const existingPath = path.join(__dirname, 'data', 'subway_raw.json');
  const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
  console.log('기존 요소 수:', existing.elements.length);

  const existingIds = new Set(existing.elements.map(e => e.id));
  const newElements = newData.elements.filter(e => !existingIds.has(e.id));
  console.log('새로 추가될 요소 수:', newElements.length);

  existing.elements = existing.elements.concat(newElements);
  fs.writeFileSync(existingPath, JSON.stringify(existing));
  console.log('subway_raw.json 병합 완료! 최종 요소 수:', existing.elements.length);
}

main().catch(console.error);
