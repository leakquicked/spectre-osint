const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function normalizeDomain(');
const end = html.indexOf('\nfunction loading(', start);
assert.notEqual(start, -1, 'domain/IP validation helpers must exist');
assert.notEqual(end, -1, 'validation helper boundary must exist');
const sandbox = { URL, module: { exports: {} } };
vm.runInNewContext(html.slice(start, end) + '\nmodule.exports = { normalizeDomain, validDomain, isPublicIP };', sandbox);
const { normalizeDomain, validDomain, isPublicIP } = sandbox.module.exports;

test('normalizes ordinary and internationalized domains', () => {
  assert.equal(normalizeDomain('Example.COM'), 'example.com');
  assert.equal(normalizeDomain('пример.рф'), 'xn--e1afmkfd.xn--p1ai');
  assert.equal(validDomain('sub.example.com'), true);
});
test('rejects URLs, credentials, ports, paths and malformed domains', () => {
  for (const value of ['https://example.com', 'user@example.com', 'example.com:443', 'example.com/path', '-bad.example', 'a..example.com', 'localhost', '']) {
    assert.equal(validDomain(value), false, value);
  }
});
test('accepts public IPv4 and IPv6 addresses', () => {
  assert.equal(isPublicIP('1.1.1.1'), true);
  assert.equal(isPublicIP('8.8.8.8'), true);
  assert.equal(isPublicIP('2001:4860:4860::8888'), true);
});
test('rejects private, local, reserved and malformed IPv4 addresses', () => {
  for (const value of ['10.0.0.1', '127.0.0.1', '192.168.1.1', '172.16.0.1', '169.254.1.1', '100.64.0.1', '192.0.0.1', '192.0.2.1', '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '256.1.1.1', '1.2.3']) {
    assert.equal(isPublicIP(value), false, value);
  }
});
test('rejects local, documentation, transition and malformed IPv6 addresses', () => {
  for (const value of ['::', '::1', 'fc00::1', 'fd00::1', 'fe80::1', 'ff02::1', '2001:db8::1', '2002::1', '2001:0::1', '2001:10::1', '2001:::1', 'not-an-ip']) {
    assert.equal(isPublicIP(value), false, value);
  }
});
test('browser security policy limits outbound connections to documented providers', () => {
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /https:\/\/rdap\.org/);
  assert.match(html, /https:\/\/ipwho\.is/);
  assert.match(html, /https:\/\/cloudflare-dns\.com/);
  assert.match(html, /strict-origin-when-cross-origin/);
  assert.ok(html.includes(`data-del="'+esc(x.id)+'"`));
});
