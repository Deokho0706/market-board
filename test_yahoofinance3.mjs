import yf from 'yahoo-finance2';
const yahooFinance = new yf();

async function run() {
  try {
    const q = await yahooFinance.quote('^GSPC');
    console.log("Success:", q.regularMarketPrice);
  } catch(e) {
    console.error(e);
  }
}
run();
