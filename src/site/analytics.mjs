// Analytics injection guard (global convention: local/test environments must never
// inject tracking scripts or fire any external request).
//
// The guard is a pure function so it can be unit-tested; the inline page snippet is
// generated from the serialized function sources in build output, so the exact logic
// that ships in the HTML is the logic covered by the tests.
//
// Blocked (no injection, no request): file: protocol, localhost / *.localhost,
// 127.0.0.1 / 0.0.0.0 / ::1, *.local / .test / .example / .invalid,
// private/reserved IPv4 ranges (10/8, 127/8, 0/8, 172.16/12, 192.168/16,
// 169.254/16 link-local, 100.64/10 CGNAT, 224/4+), IPv6 ::1, ULA fc00::/7,
// link-local fe80::/10, and IPv4-mapped IPv6 equivalents.

export function shouldInjectAnalytics(hostname, protocol) {
  try {
    if (protocol === 'file:') return false;
    var host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) return false;
    if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return false;

    var blockedSuffixes = ['.localhost', '.local', '.test', '.example', '.invalid'];
    for (var i = 0; i < blockedSuffixes.length; i++) {
      if (host.slice(-blockedSuffixes[i].length) === blockedSuffixes[i]) return false;
    }

    if (host.indexOf(':') !== -1) {
      // IPv4-mapped IPv6 (::ffff:a.b.c.d) — judge by the embedded IPv4 address.
      var mapped = host.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
      if (mapped) return shouldInjectAnalytics(mapped[1], protocol);
      if (host === '::1') return false;
      // fc00::/7 unique-local (fc00–fdff)
      if (/^f[cd][0-9a-f]{0,3}:/.test(host)) return false;
      // fe80::/10 link-local (fe80–febf)
      if (/^fe[89ab][0-9a-f]?:/.test(host)) return false;
      return true;
    }

    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      var octets = host.split('.');
      var a = +octets[0];
      var b = +octets[1];
      if (a === 0 || a === 10 || a === 127) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 169 && b === 254) return false;
      if (a === 100 && b >= 64 && b <= 127) return false;
      if (a >= 224) return false;
      return true;
    }

    return true;
  } catch (e) {
    return false; // when in doubt, never inject
  }
}

// DOM side effects, kept free of outer identifiers so the function source can be
// serialized straight into the page snippet. GA4 (GTM container) and Clarity are
// wired exactly as supplied by the site owner.
export function injectAnalytics(shouldInject) {
  if (!shouldInject(location.hostname, location.protocol)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  var gtm = document.createElement('script');
  gtm.async = true;
  gtm.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-5BJNNX6D';
  document.head.appendChild(gtm);

  (function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', 'zh3lif409a');
}

// Inline head snippet: runs the guard at page runtime; blocked environments never
// create dataLayer, never append a script tag, never hit the network.
export const ANALYTICS_SNIPPET =
  '<script>try{(' +
  injectAnalytics.toString() +
  ')(' +
  shouldInjectAnalytics.toString() +
  ')}catch(e){}</script>';
