// Analytics hostname guard (global convention): local/test environments must never
// inject GA4/GTM or Clarity. These cases pin the decision table.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldInjectAnalytics } from '../src/site/analytics.mjs';

const blocked = (host, protocol = 'https:') => {
  assert.equal(shouldInjectAnalytics(host, protocol), false, host);
};
const allowed = (host, protocol = 'https:') => {
  assert.equal(shouldInjectAnalytics(host, protocol), true, host);
};

test('file: protocol never injects', () => {
  blocked('7deadlysinstest.one', 'file:');
  blocked('', 'file:');
});

test('localhost variants never inject', () => {
  blocked('localhost');
  blocked('LOCALHOST');
  blocked('app.localhost');
  blocked('127.0.0.1');
  blocked('0.0.0.0');
  blocked('::1');
  blocked('[::1]');
});

test('dev TLDs and empty hostnames never inject', () => {
  blocked('preview.local');
  blocked('shop.test');
  blocked('demo.example');
  blocked('x.invalid');
  blocked('');
  blocked(null);
});

test('private, reserved and CGNAT IPv4 ranges never inject', () => {
  blocked('10.1.2.3');
  blocked('10.0.0.1');
  blocked('127.0.0.5');
  blocked('0.1.2.3');
  blocked('172.16.0.1');
  blocked('172.31.255.255');
  blocked('192.168.1.50');
  blocked('169.254.10.10');
  blocked('100.64.0.9');
  blocked('100.127.255.1');
  blocked('224.0.0.1');
  blocked('255.255.255.255');
});

test('public IPv4 addresses inject', () => {
  allowed('7deadlysinstest.one');
  allowed('www.7deadlysinstest.one');
  allowed('142.250.72.14');
  allowed('172.32.0.1'); // just outside the 172.16/12 range
  allowed('100.63.1.1'); // just outside CGNAT
  allowed('11.0.0.1');
});

test('IPv6 loopback, unique-local and link-local never inject', () => {
  blocked('::1');
  blocked('fc00::5');
  blocked('fd12:3456:789a::1');
  blocked('fe80::1');
  blocked('febf::a');
  blocked('::ffff:127.0.0.1'); // IPv4-mapped loopback
  blocked('::ffff:192.168.0.2');
});

test('global IPv6 addresses inject', () => {
  allowed('2606:4700:4700::1111');
  allowed('fec0::1'); // deprecated site-local is not in the blocked set
  allowed('2001:db8::1'.replace('2001:db8', '2607:f8b0')); // real global
});
