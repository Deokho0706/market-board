const fs = require('fs');

async function run() {
  try {
    const r = await fetch('https://gamma-api.polymarket.com/events?slug=how-many-fed-rate-cuts-in-2026').then(res=>res.json());
    fs.writeFileSync('poly_event_result.json', JSON.stringify(r, null, 2));
    console.log("Done");
  } catch(e) {
    console.error(e);
  }
}
run();
