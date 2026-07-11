const q = [out:json][timeout:60];
(
  relation["type"="route"]["route"~"subway|train|light_rail"]["network"~"수도권|서울|Seoul|인천|Incheon"](36.9,126.4,37.9,128.0);
  relation["type"="route"]["route"="subway"](36.9,126.4,37.9,128.0);
  relation["type"="route"]["route"="light_rail"](36.9,126.4,37.9,128.0);
)->.metro_rels;
(
  way(r.metro_rels)["railway"](36.9,126.4,37.9,128.0);
  way["railway"="subway"](36.9,126.4,37.9,128.0);
  way["railway"="light_rail"](36.9,126.4,37.9,128.0);
)->.metro_ways;
(
  node["railway"="station"]["subway"="yes"](36.9,126.4,37.9,128.0);
  node["railway"="station"]["light_rail"="yes"](36.9,126.4,37.9,128.0);
  node["railway"="halt"]["subway"="yes"](36.9,126.4,37.9,128.0);
  node["railway"="station"]["network"~"수도권|서울"](36.9,126.4,37.9,128.0);
  node(r.metro_rels)["railway"~"station|halt"](36.9,126.4,37.9,128.0);
)->.stations;
(
  .metro_ways;
  .stations;
);
out body geom;;
fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(q)
}).then(async r => {
  console.log(r.status);
  const text = await r.text();
  console.log(text.substring(0, 300));
}).catch(console.error);
