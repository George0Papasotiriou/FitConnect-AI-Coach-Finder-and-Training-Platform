import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('STATUS:', response.status(), 'URL:', response.url());
    }
  });

  await page.goto('http://localhost:5173/login');
  await page.type('input[type="email"]', 'admin@fitconnect.com');
  await page.type('input[type="password"]', 'admin123');
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
