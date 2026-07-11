const fs = require('fs');

const bbox = '36.9,126.4,37.9,128.0';
// Query:
// 1. Get all routes that belong to the subway network.
// 2. Get their ways.
// 3. Get generic subway/light_rail ways.
// 4. Get stations.
const query = `[out:json][timeout:90];
(
  relation["route"~"subway|light_rail|train"](if: t["network"] ~ "수도권|서울|인천|분당|안산|1호선|4호선" || t["name"] ~ "신분당|수인|분당|경의|경춘|공항|경강|서해|신림|의정부|김포|용인|GTX|1호선|4호선")(${bbox});
  way(r);
  way["railway"~"subway|light_rail"](${bbox});
  node["railway"="station"]["subway"="yes"](${bbox});
  node["railway"="station"]["light_rail"="yes"](${bbox});
  node["railway"="halt"]["subway"="yes"](${bbox});
  node["railway"="station"]["network"~"수도권|서울|인천"](${bbox});
);
out body geom;`;

fetch('https://lz4.overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'WoodyTable/1.1' },
    body: 'data=' + encodeURIComponent(query)
}).then(r => r.json()).then(data => {
    // We need to merge relation tags into their ways so that getSubwayColor works correctly in map-tab.html
    const wayToRelationTags = {};
    for (const el of data.elements) {
        if (el.type === 'relation' && el.members) {
            for (const member of el.members) {
                if (member.type === 'way') {
                    wayToRelationTags[member.ref] = el.tags || {};
                }
            }
        }
    }

    const mergedElements = [];
    for (const el of data.elements) {
        if (el.type === 'way') {
            const relTags = wayToRelationTags[el.id];
            if (relTags) {
                el.tags = { ...relTags, ...(el.tags || {}) };
            }
            mergedElements.push(el);
        } else if (el.type === 'node') {
            mergedElements.push(el);
        }
    }

    data.elements = mergedElements;

    fs.writeFileSync('c:/Users/woody/Documents/AI_개발/Marble-Table/data/subway_raw.json', JSON.stringify(data));
    console.log('Saved to data/subway_raw.json with relation tags merged!');
}).catch(console.error);
