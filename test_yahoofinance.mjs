import yahooFinance from 'yahoo-finance2';

async function run() {
  try {
    const quote = await yahooFinance.quote('^GSPC');
    console.log("Success:", quote.regularMarketPrice);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
