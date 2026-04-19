import { chromium } from '@playwright/test';
import { SignJWT } from 'jose';
import { randomUUID } from 'crypto';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET;
const VITE_APP_ID = process.env.VITE_APP_ID || '';
const E2E_OPEN_ID = 'e2e-test-user-checkin-smoke';
const E2E_NAME = 'E2E Test User';
const OUT_DIR = '/home/ubuntu/continuary-screenshots/real-ui';

fs.mkdirSync(OUT_DIR, { recursive: true });

async function mintCookie() {
  const secretKey = new TextEncoder().encode(JWT_SECRET);
  const jti = randomUUID();
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return new SignJWT({ openId: E2E_OPEN_ID, appId: VITE_APP_ID, name: E2E_NAME })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(secretKey);
}

const pages = [
  { name: 'home',    url: 'http://localhost:3000/',          waitFor: 'Morning plan',     width: 1440, height: 900 },
  { name: 'projects', url: 'http://localhost:3000/projects', waitFor: 'Projects',         width: 1440, height: 900 },
  { name: 'compass', url: 'http://localhost:3000/compass',   waitFor: 'Weekly Compass',   width: 1440, height: 900 },
  { name: 'vault',   url: 'http://localhost:3000/vault',     waitFor: 'Vault',            width: 1440, height: 900 },
  { name: 'focus',   url: 'http://localhost:3000/focus',     waitFor: 'Focus',            width: 1440, height: 900 },
];

(async () => {
  const cookieValue = await mintCookie();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  
  for (const pg of pages) {
    const context = await browser.newContext({
      viewport: { width: pg.width, height: pg.height },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
    });
    await context.addCookies([{
      name: 'app_session_id',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }]);
    const page = await context.newPage();
    await page.goto(pg.url, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait for content to appear
    try {
      await page.getByText(pg.waitFor, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
    } catch(e) {
      console.log(`Warning: "${pg.waitFor}" not found on ${pg.url}, taking screenshot anyway`);
    }
    await page.waitForTimeout(1500); // let animations settle
    const path = `${OUT_DIR}/${pg.name}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`Saved: ${path}`);
    await context.close();
  }
  
  await browser.close();
  console.log('Done!');
})();
