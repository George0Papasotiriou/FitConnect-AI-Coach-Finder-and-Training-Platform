import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API RESPONSE:', response.url(), response.status());
    }
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  
  console.log('Typing credentials...');
  await page.type('input[type="email"]', 'admin@fitconnect.com');
  await page.type('input[type="password"]', 'admin123');
  
  console.log('Submitting...');
  await Promise.all([
    page.waitForNavigation({ timeout: 5000 }).catch(() => console.log('No navigation occurred')),
    page.click('button[type="submit"]')
  ]);
  
  console.log('Final URL:', page.url());
  await browser.close();
})();
