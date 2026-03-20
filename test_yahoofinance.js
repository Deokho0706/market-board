const yahooFinance = require('yahoo-finance2').default;

async function run() {
  try {
    const quote = await yahooFinance.quote('^GSPC');
    console.log("Success:", quote.regularMarketPrice);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
