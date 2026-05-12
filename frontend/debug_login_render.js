import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'admin@fitconnect.com');
  await page.type('input[type="password"]', 'admin123');
  
  await Promise.all([
    page.waitForNavigation({ timeout: 5000 }),
    page.click('button[type="submit"]')
  ]);
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Final URL:', page.url());
  const rootHtml = await page.$eval('#root', el => el.innerHTML);
  console.log('Root HTML length:', rootHtml.length);
  if (rootHtml.length < 100) console.log('Root HTML:', rootHtml);
  
  await browser.close();
})();
