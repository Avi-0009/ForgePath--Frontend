import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('protected shell provides a skip link, route focus, desktop-only nav and native mobile drawer', () => {
  const shell = read('src/layouts/AppLayout.tsx');
  assert.match(shell, /href="#forgepath-main-content"/);
  assert.match(shell, /id="forgepath-main-content" tabIndex=\{-1\}/);
  assert.match(shell, /main\.focus\(/);
  assert.match(shell, /hidden h-full shrink-0 md:flex/);
  assert.match(shell, /<NativeModal drawer/);
  assert.match(shell, /matchMedia\("\(min-width: 48rem\)"\)/);
});

test('shared native modal uses the browser top layer and explicitly cancels on Escape', () => {
  const modal = read('src/components/accessibility/NativeModal.tsx');
  assert.match(modal, /dialog\.showModal\(\)/);
  assert.match(modal, /dialog\.close\(\)/);
  assert.match(modal, /event\.preventDefault\(\); onCancel\(\)/);
  assert.match(modal, /data-safe-focus/);
  assert.match(modal, /returnFocusId/);
  for (const [path, name] of [
    ['src/pages/TestLabPage.tsx', 'test-consent-title'],
    ['src/pages/ApprovalsPage.tsx', 'decision-title'],
    ['src/pages/PatchReviewPage.tsx', 'reject-patch-title'],
    ['src/components/engineering/ProjectWorkflowQueue.tsx', 'project-decision-title'],
  ]) {
    const source = read(path);
    assert.ok(source.includes(`<NativeModal alert labelledBy="${name}"`), path);
    assert.match(source, /data-safe-focus/);
    assert.doesNotMatch(source, /role="alertdialog"/);
  }
});

test('test execution still requires an explicit approved snapshot and cancellation is non-executing', () => {
  const lab = read('src/pages/TestLabPage.tsx');
  assert.match(lab, /onCancel=\{\(\) => setConfirm\(null\)\}/);
  assert.match(lab, /if \(!token \|\| !confirm \|\| running \|\| preparing \|\| !confirm\.isCurrent\(\)\) return/);
  assert.match(lab, /approved\.snapshot\.snapshot_id/);
  assert.match(lab, /onClick=\{\(\) => void runTests\(\)\}/);
});

test('auth has one instance per form with associated labels, reset and profile controls', () => {
  const auth = read('src/pages/AuthPage.tsx');
  for (const component of ['LoginForm', 'SignupForm']) assert.equal(auth.split(`<${component} `).length - 1, 1);
  for (const [file, ids] of [
    ['src/components/auth/LoginForm.tsx', ['login-identifier','login-password']],
    ['src/components/auth/SignupForm.tsx', ['signup-full-name','signup-username','signup-email','signup-password']],
    ['src/pages/ForgotPasswordPage.tsx', ['reset-email','reset-otp','reset-password']],
    ['src/pages/ProfilePage.tsx', ['profile-full-name','profile-username','profile-email','profile-otp']],
  ]) {
    const source = read(file);
    for (const id of ids) {
      assert.equal(source.split(`htmlFor="${id}"`).length - 1, 1, `${file}: label ${id}`);
      assert.equal(source.split(`id="${id}"`).length - 1, 1, `${file}: input ${id}`);
    }
    assert.doesNotMatch(source, /form-label hidden/);
  }
});

const luminance = (hex) => {
  const rgb = hex.match(/[a-f\d]{2}/gi).map((pair) => parseInt(pair, 16) / 255);
  const linear = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};

test('muted text theme tokens meet 4.5:1 contrast on common dark surfaces', () => {
  const theme = read('src/index.css');
  const color = (token) => {
    const match = theme.match(new RegExp(`--color-${token}: #([0-9a-f]{6});`, 'i'));
    assert.ok(match, token);
    return luminance(match[1]);
  };
  for (const fg of ['app-muted','app-dim','app-dim2','app-text-faint','app-table-head']) {
    for (const bg of ['app-bg','app-panel','app-panel2','app-panel3','app-btn-hover']) {
      const l1 = color(fg), l2 = color(bg);
      assert.ok((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05) >= 4.5, `${fg} on ${bg}`);
    }
  }
});

test('styles expose focus, reduced motion and viewport-bounded dialogs', () => {
  const css = read('src/responsive-accessibility.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /forced-colors: active/);
  assert.match(css, /max-height: calc\(100dvh - 2rem\)/);
  assert.match(css, /::backdrop/);
  assert.match(read('src/index.css'), /@import "\.\/responsive-accessibility\.css"/);
});
