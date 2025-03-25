const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Placeholder: Scrape AutoTrader
  await page.goto('https://www.autotrader.ca/cars/on/?rcp=10');
  await page.waitForSelector('.result-item');

  const listings = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.result-item'));
    return items.map(item => {
      const title = item.querySelector('h2')?.innerText || '';
      const price = item.querySelector('.price-amount')?.innerText || '';
      const location = item.querySelector('.sellerLocation')?.innerText || '';
      const image = item.querySelector('img')?.src || '';
      return { title, price, location, photos: [image] };
    });
  });

  await browser.close();
  res.json({ source: 'AutoTrader', listings });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper running on port ${PORT}`);
});
