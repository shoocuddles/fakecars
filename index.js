const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

const urls = [
  "https://www.autotrader.ca/cars/on/?rcp=15&rcs=0&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=Coupe%2CHatchback%2CSedan&hprc=True&wcp=True&inMarket=advancedSearch",
  "https://www.autotrader.ca/cars/on/?rcp=15&rcs=0&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=Minivan&hprc=True&wcp=True&inMarket=advancedSearch",
  "https://www.autotrader.ca/cars/on/?rcp=15&rcs=0&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=SUV&hprc=True&wcp=True&inMarket=advancedSearch",
  "https://www.autotrader.ca/cars/on/?rcp=15&rcs=0&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=Truck&hprc=True&wcp=True&inMarket=advancedSearch"
];

app.get('/scrape', async (req, res) => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const listings = [];

  for (const url of urls) {
    try {
      console.log("Navigating to:", url);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 5000));

      const data = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a.inner-link'));
        return anchors.map(anchor => {
          const title = anchor.querySelector('.title-with-trim')?.innerText.trim() || '';
          const price = anchor.querySelector('.price-amount')?.innerText.trim() || '';
          const location = anchor.querySelector('.proximity-text')?.innerText.trim() || '';
          const imageNodes = anchor.querySelectorAll('.image-gallery img');
          const photos = Array.from(imageNodes).map(img => img.src).filter(Boolean);

          return {
            source: 'AutoTrader',
            title,
            price,
            location,
            photos
          };
        });
      });

      listings.push(...data);
    } catch (err) {
      console.error(`Error scraping ${url}:`, err);
    }
  }

  await browser.close();
  res.json({ status: "done", count: listings.length, listings });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper running on port ${PORT}`);
});
