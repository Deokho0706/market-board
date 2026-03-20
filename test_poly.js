async function test() {
  try {
    const res = await fetch('https://gamma-api.polymarket.com/markets?search=recession&limit=5');
    const data = await res.json();
    console.log(data.map(m => m.question));
  } catch(e) {
    console.error(e);
  }
}
test();
test();
