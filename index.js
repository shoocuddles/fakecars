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
  const listings = [];

  // AutoTrader scraping
  try {
    await page.goto('https://www.autotrader.ca/cars/on/?rcp=10', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.result-item');

    const autoTraderListings = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.result-item'));
      return items.map(item => {
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

  // Facebook Marketplace scraping (limited by login)
  try {
    await page.goto('https://www.facebook.com/marketplace/ottawa/vehicles', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(2000);
    }

    const fbListings = await page.evaluate(() => {
      const cards = document.querySelectorAll('[role="article"]');
      const items = [];
      cards.forEach(card => {
        const title = card.querySelector('span')?.innerText || '';
        const priceMatch = title.match(/\$[\d,]+/);
        const price = priceMatch ? priceMatch[0] : '';
        const image = card.querySelector('img')?.src || '';
        const desc = card.innerText;

        const kmMatch = desc.match(/([\d,]+)\s?km/i);
        const yearMatch = desc.match(/(20\d{2}|201[7-9])/);
        const priceValue = parseInt(price.replace(/[^\d]/g, ''));
        const kmValue = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
        const yearValue = yearMatch ? parseInt(yearMatch[0]) : 0;

        if (priceValue <= 20000 && kmValue <= 150000 && yearValue >= 2018) {
          items.push({
            source: 'Facebook',
            title,
            price,
            location: 'Ottawa Area',
            description: desc,
            year: yearValue,
            kilometers: kmValue,
            photos: [image]
          });
        }
      });
      return items;
    });

    listings.push(...fbListings);
  } catch (err) {
    console.error('Facebook error:', err);
  }

  await browser.close();
  res.json({ status: "done", count: listings.length, listings });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper running on port ${PORT}`);
});
