const fs = require('fs');

const bbox = '36.9,126.4,37.9,128.0';
const query = `[out:json][timeout:60];
(
  way["railway"="subway"](${bbox});
  way["railway"="light_rail"](${bbox});
  way["railway"="rail"]["service"="commuter"](${bbox});
  way["railway"="rail"]["network"~"수도권|서울"](${bbox});
  node["railway"="station"]["subway"="yes"](${bbox});
  node["railway"="station"]["light_rail"="yes"](${bbox});
  node["railway"="halt"]["subway"="yes"](${bbox});
  node["railway"="station"]["network"~"수도권|서울"](${bbox});
);
out body geom;`;

fetch('https://lz4.overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WoodyTable/1.0'
    },
    body: 'data=' + encodeURIComponent(query)
}).then(r => r.json()).then(data => {
    fs.writeFileSync('c:/Users/woody/Documents/AI_개발/Marble-Table/data/subway_raw.json', JSON.stringify(data));
    console.log('Saved to data/subway_raw.json');
}).catch(console.error);
