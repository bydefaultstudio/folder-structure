/* ─────────────────────────────
   TREE SHARE
   ─────────────────────────────
   Fragment codec for share and embed links (docs/tree-notation.md is
   authoritative). The URL fragment carries the structure itself:
   #t=<version char><base64url payload>[&theme=light|dark]. Version '1'
   is deflate-raw-compressed UTF-8 of the unicode-tree serialization;
   version '0' is the uncompressed fallback. Pure codec, no DOM, no
   model access. Loaded by both index.html and embed.html.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';

  var VERSION_COMPRESSED = '1';
  var VERSION_PLAIN = '0';

  //
  //------- Base64url -------//
  //

  function base64urlEncode(bytes) {
    var CHUNK = 0x8000;
    var parts = [];
    for (var i = 0; i < bytes.length; i += CHUNK) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
    }
    return btoa(parts.join(''))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  function base64urlDecode(str) {
    var base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) { base64 += '='; }
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  //
  //------- Deflate -------//
  //

  function compressBytes(bytes) {
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function toBytes(buffer) {
      return new Uint8Array(buffer);
    });
  }

  function decompressBytes(bytes) {
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function toBytes(buffer) {
      return new Uint8Array(buffer);
    });
  }

  //
  //------- Encode -------//
  //

  function encodeTree(text) {
    var bytes = new TextEncoder().encode(text);
    if (typeof CompressionStream !== 'function') {
      return Promise.resolve(VERSION_PLAIN + base64urlEncode(bytes));
    }
    return compressBytes(bytes).then(
      function handleCompressed(compressed) {
        return VERSION_COMPRESSED + base64urlEncode(compressed);
      },
      function handleCompressFail() {
        // deflate-raw unsupported despite CompressionStream existing.
        return VERSION_PLAIN + base64urlEncode(bytes);
      }
    );
  }

  //
  //------- Decode -------//
  //

  function parseFragment(hash) {
    var params = new URLSearchParams((hash || '').replace(/^#/, ''));
    var payload = params.get('t');
    if (!payload) { return null; }
    var theme = params.get('theme');
    return {
      payload: payload,
      theme: theme === 'light' || theme === 'dark' ? theme : null
    };
  }

  function decodePayload(payload) {
    return Promise.resolve(payload).then(function decodeNow(raw) {
      var version = raw.charAt(0);
      var data = base64urlDecode(raw.slice(1));
      if (version === VERSION_PLAIN) {
        return new TextDecoder().decode(data);
      }
      if (version === VERSION_COMPRESSED) {
        if (typeof DecompressionStream !== 'function') {
          throw new Error('Compressed links need a newer browser');
        }
        return decompressBytes(data).then(function handleDecompressed(bytes) {
          return new TextDecoder().decode(bytes);
        });
      }
      throw new Error('Unknown share link version: ' + version);
    });
  }

  function decodeFragment(hash) {
    var parsed = parseFragment(hash);
    if (!parsed) { return Promise.resolve(null); }
    return decodePayload(parsed.payload).then(function handleDecoded(text) {
      return { text: text, theme: parsed.theme };
    });
  }

  //
  //------- Init -------//
  //

  function initTreeShare() {
    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.share = {
      encodeTree: encodeTree,
      parseFragment: parseFragment,
      decodePayload: decodePayload,
      decodeFragment: decodeFragment
    };
    console.log('tree-share.js v' + VERSION + ' initialised');
  }

  initTreeShare();
})();
