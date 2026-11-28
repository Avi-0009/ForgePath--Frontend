import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Use only a local development instance. Never store credentials, cookies, screenshots or page HTML.
const base = new URL(process.env.FORGEPATH_AUDIT_URL || 'https://localhost:5173');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || !['http:', 'https:'].includes(base.protocol)) {
  throw new Error('FORGEPATH_AUDIT_URL must point to a local ForgePath development server.');
}
const routes = ['/', '/tasks', '/repositories', '/runs', '/intel', '/investigation', '/patch-review', '/test-lab', '/approvals', '/settings', '/profile', '/workspace'];
const sizes = [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];
const rows = [];
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: sizes[1] });
const page = await context.newPage();
const cli = createInterface({ input: stdin, output: stdout });
const check = async (name, callback) => {
  try {
    const detail = await callback();
    rows.push({ name, status: 'pass', ...(detail ? { detail } : {}) });
    console.log(`PASS ${name}`);
  } catch (error) {
    // Keep error messages short: Playwright errors can include page content.
    const detail = String(error?.message ?? error);
    rows.push({ name, status: 'fail', detail });
    console.error(`FAIL ${name}: ${detail}`);
  }
};
const skip = (name, detail) => { rows.push({ name, status: 'skip', detail }); console.log(`SKIP ${name}: ${detail}`); };
const go = async (route, protectedRoute = true) => {
  await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded' });
  if (protectedRoute) {
    await page.locator('#forgepath-main-content').waitFor({ timeout: 15000 });
    assert.equal(new URL(page.url()).pathname, route, 'Protected route did not open');
  } else {
    await page.getByRole('main').waitFor({ timeout: 15000 });
  }
};
const reflow = async () => {
  const dims = await page.evaluate(() => {
    const root = document.documentElement;
    const main = document.querySelector('#forgepath-main-content');
    return {
      root: root.scrollWidth - root.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });
  assert.ok(dims.root <= 1 && dims.main <= 1, `Horizontal overflow: document ${dims.root}px, main ${dims.main}px`);
};
const axe = async () => {
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  // Report rule IDs and count only; selectors/HTML can contain private project names.
  const violations = report.violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    count: nodes.length,
    elements: nodes.map((node) => ({
      target: node.target,
      reason: node.failureSummary,
    })),
  }));
  if (violations.length) throw new Error(JSON.stringify(violations));
};
const focusIs = async (locator) => assert.ok(await locator.evaluate((element) => document.activeElement === element), 'Expected focus target is not focused');
const focusIn = async (locator) => assert.ok(await locator.evaluate((element) => element.contains(document.activeElement)), 'Focus escaped modal');
let runRequests = 0;
page.on('request', (request) => { if (request.method() === 'POST' && /\/projects\/[^/]+\/tests\/run\/?$/.test(new URL(request.url()).pathname)) runRequests++; });
// Block accidental execution, even if the app has a regression.
await page.route('**/projects/*/tests/run*', async (route) => {
  if (route.request().method() === 'POST') await route.abort(); else await route.continue();
});

try {
  await go('/auth', false);
  await check('mobile auth: one labelled login form', async () => {
    assert.equal(await page.getByLabel('Username or Email', { exact: true }).count(), 1);
    const activeForm = page.locator('[data-auth-active="true"]');

    assert.equal(
      await activeForm.getByLabel('Password', { exact: true }).count(),
      1
    );

    assert.equal(
      await page.locator('#signup-password').isVisible(),
      false
    );
    await page.getByRole('button', { name: 'Sign up', exact: true }).click();
    assert.equal(await page.locator('#login-identifier').isVisible(), false);
    assert.equal(await page.locator('#login-identifier').count(), 1);
    await focusIs(page.getByLabel('Full name', { exact: true }));
    await reflow();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await focusIs(page.getByLabel('Username or Email', { exact: true }));
  });
  for (const size of sizes) {
    await page.setViewportSize(size);
    await check(`auth ${size.width}px reflow and WCAG scan`, async () => { await reflow(); await axe(); });
  }
  await page.setViewportSize(sizes[1]);
  await page.goto(new URL('/forgot-password', base).href);
  await check('forgot password email label and reflow', async () => {
    assert.equal(await page.getByLabel('Email Address', { exact: true }).count(), 1);
    await reflow(); await axe();
  });
  await page.goto(new URL('/auth', base).href);
  console.log('\nSign into ForgePath in the opened browser using a test account. Do not enter credentials in this terminal.');
  await cli.question('When the dashboard is visible, press Enter here: ');
  await page.locator('#forgepath-main-content').waitFor({ timeout: 15000 });
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const route of routes) {
      const name = `${route} @ ${size.width}x${size.height}`;
      await check(`${name} reflow`, async () => { await go(route); await reflow(); });
      await check(`${name} WCAG scan`, async () => { assert.equal(new URL(page.url()).pathname, route); await axe(); });
    }
  }
  await page.setViewportSize(sizes[1]);
  await go('/');
  await check('skip link targets the main region', async () => {
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await page.keyboard.press('Tab');
    await focusIs(skipLink);
    await page.keyboard.press('Enter');
    await focusIs(page.locator('#forgepath-main-content'));
  });
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await check('mobile menu: closed links are hidden; opening focuses close; Escape restores focus', async () => {
    assert.equal(await page.getByRole('navigation', { name: 'Primary navigation' }).count(), 0);
    await menu.click();
    const drawer = page.getByRole('dialog', { name: 'Main navigation' });
    await focusIs(drawer.getByRole('button', { name: 'Close navigation' }));
    for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); await focusIn(drawer); }
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'detached' });
    await page.waitForTimeout(100);
    await focusIs(menu);
  });
  await check('mobile menu closes on navigation and focuses main content', async () => {
    await menu.click();
    await page.getByRole('dialog', { name: 'Main navigation' }).getByRole('link', { name: 'Test lab', exact: true }).click();
    await page.waitForURL('**/test-lab');
    await page.getByRole('dialog', { name: 'Main navigation' }).waitFor({ state: 'detached' });
    await focusIs(page.locator('#forgepath-main-content'));
  });
  await check('mobile menu closes when resized to desktop', async () => {
    await menu.click();
    await page.setViewportSize(sizes[3]);
    await page.getByRole('dialog', { name: 'Main navigation' }).waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('navigation', { name: 'Primary navigation' }).count(), 1);
  });
  await check('header help Escape returns focus', async () => {
    const help = page.getByRole('button', { name: 'Help', exact: true });
    await help.click();
    await focusIs(page.getByRole('button', { name: 'Close panel' }));
    await page.keyboard.press('Escape');
    await focusIs(help);
  });
  await go('/test-lab');
  await page.setViewportSize({ width: 320, height: 420 });
  const run = page.getByRole('button', { name: 'Run tests', exact: true });
  await run.waitFor({ timeout: 10000 });
  try { await page.waitForFunction(() => !document.querySelector('#forgepath-run-tests')?.disabled, undefined, { timeout: 8000 }); } catch { /* no ready project */ }
  if (!(await run.isEnabled())) skip('Test Lab approval focus and cancel', 'No ready project / runner unavailable. Select a sample project and repeat manually.');
  else await check('Test Lab approval: safe focus, contained Tab, Escape, no execution', async () => {
    await run.click();
    const modal = page.getByRole('alertdialog', { name: 'Authorize test execution?' });
    await modal.waitFor({ timeout: 15000 });
    await focusIs(modal.getByRole('button', { name: 'Cancel', exact: true }));
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); await focusIn(modal); }
    await page.keyboard.press('Shift+Tab'); await focusIn(modal);
    await page.keyboard.press('Escape'); await modal.waitFor({ state: 'detached' });
    await page.waitForTimeout(100); await focusIs(run);
    await run.click(); await modal.waitFor();
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await modal.waitFor({ state: 'detached' });
    assert.equal(runRequests, 0, 'Unexpected execution request');
  });
  await check('no test execution POST sent by this audit', async () => assert.equal(runRequests, 0));
} finally {
  cli.close();
  await browser.close();
  await writeFile(new URL('./audit-results.json', import.meta.url), JSON.stringify(rows, null, 2));
  const counts = Object.fromEntries(['pass','fail','skip'].map((status) => [status, rows.filter((row) => row.status === status).length]));
  console.log('Audit results:', counts, 'See audit-results.json.');
  if (counts.fail || counts.skip) process.exitCode = 1;
}
