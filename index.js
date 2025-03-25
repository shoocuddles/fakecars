const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
  console.log("Scrape route hit");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const listings = [];

  try {
    await page.goto('https://www.autotrader.ca/cars/on/?rcp=10', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.result-item', { timeout: 10000 });

    const autoTraderListings = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.result-item'));
      return items.slice(0, 5).map(item => {
        const title = item.querySelector('h2')?.innerText || '';
        const price = item.querySelector('.price-amount')?.innerText || '';
        const location = item.querySelector('.sellerLocation')?.innerText || '';
        const image = item.querySelector('img')?.src || '';
        return {
          source: 'AutoTrader',
          title,
          price,
          location,
          photos: [image]
        };
      });
    });

    listings.push(...autoTraderListings);
  } catch (err) {
    console.error('AutoTrader error:', err);
  }

  await browser.close();
  console.log("Sending response with", listings.length, "listings");
  res.json({ status: "done", count: listings.length, listings });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper running on port ${PORT}`);
});
