import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// === Extracted pure functions ===

function _formatStarCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function prettyPrintDaysAgo(days) {
  var str = '';
  var values = {
    ' year': 365,
    ' month': 30,
    ' day': 1
  };
  for (var x in values) {
    var amount = Math.floor(days / values[x]);
    if (amount >= 1) {
      str += amount + x + (amount > 1 ? 's' : '');
      if (x != ' day') {
        str += ' ';
      }
      days -= amount * values[x];
    }
  }
  return str;
}

function classifyScore(score) {
  var NO_HEAT = 50;
  var MILD    = 75;
  var MEDIUM  = 99;
  if (score < NO_HEAT) return 'no-heat';
  if (score < MILD) return 'mild';
  if (score < MEDIUM) return 'medium';
  return 'hot';
}

// CommentTracker.process extracted logic
function processCommentData(existingData, request) {
  var new_info = {
    id: request.id,
    expire: new Date().getTime() + 432000000
  };
  var info = existingData ? JSON.parse(existingData) : new_info;
  if (request.num) { info.num = request.num; }
  var last_comment_id = info.last_comment_id;
  if (request.last_comment_id)
    info.last_comment_id = request.last_comment_id;
  return { info: JSON.stringify(info), last_comment_id };
}

// === Tests ===

describe('_formatStarCount', () => {
  it('returns plain number below 1000', () => {
    assert.equal(_formatStarCount(0), '0');
    assert.equal(_formatStarCount(1), '1');
    assert.equal(_formatStarCount(999), '999');
  });
  it('formats thousands with k suffix', () => {
    assert.equal(_formatStarCount(1000), '1k');
    assert.equal(_formatStarCount(1500), '1.5k');
    assert.equal(_formatStarCount(9999), '10k');
    assert.equal(_formatStarCount(23400), '23.4k');
  });
  it('formats millions with M suffix', () => {
    assert.equal(_formatStarCount(1000000), '1M');
    assert.equal(_formatStarCount(1500000), '1.5M');
    assert.equal(_formatStarCount(10000000), '10M');
  });
});

describe('prettyPrintDaysAgo', () => {
  it('returns empty string for 0 days', () => {
    assert.equal(prettyPrintDaysAgo(0), '');
  });
  it('formats single day', () => {
    assert.equal(prettyPrintDaysAgo(1), '1 day');
  });
  it('formats plural days', () => {
    assert.equal(prettyPrintDaysAgo(5), '5 days');
  });
  it('formats months and days', () => {
    assert.equal(prettyPrintDaysAgo(45), '1 month 15 days');
  });
  it('formats years, months, and days', () => {
    assert.equal(prettyPrintDaysAgo(400), '1 year 1 month 5 days');
  });
  it('formats exactly one year', () => {
    assert.equal(prettyPrintDaysAgo(365), '1 year ');
  });
});

describe('classifyScore (getAndRateStories threshold logic)', () => {
  it('returns no-heat for scores below 50', () => {
    assert.equal(classifyScore(0), 'no-heat');
    assert.equal(classifyScore(49), 'no-heat');
  });
  it('returns mild for scores 50-74', () => {
    assert.equal(classifyScore(50), 'mild');
    assert.equal(classifyScore(74), 'mild');
  });
  it('returns medium for scores 75-98', () => {
    assert.equal(classifyScore(75), 'medium');
    assert.equal(classifyScore(98), 'medium');
  });
  it('returns hot for scores >= 99', () => {
    assert.equal(classifyScore(99), 'hot');
    assert.equal(classifyScore(500), 'hot');
  });
});

describe('CommentTracker.process logic', () => {
  it('creates new info when no existing data', () => {
    const result = processCommentData(null, { id: 123, num: 5, last_comment_id: 999 });
    const info = JSON.parse(result.info);
    assert.equal(info.id, 123);
    assert.equal(info.num, 5);
    assert.equal(info.last_comment_id, 999);
    assert.equal(result.last_comment_id, undefined);
    assert.ok(info.expire > Date.now());
  });
  it('preserves last_comment_id from existing data', () => {
    const existing = JSON.stringify({ id: 123, expire: Date.now() + 99999, last_comment_id: 500 });
    const result = processCommentData(existing, { id: 123, num: 10, last_comment_id: 800 });
    assert.equal(result.last_comment_id, 500);
    const info = JSON.parse(result.info);
    assert.equal(info.last_comment_id, 800);
    assert.equal(info.num, 10);
  });
  it('does not overwrite num when request.num is falsy', () => {
    const existing = JSON.stringify({ id: 123, expire: Date.now() + 99999, num: 42 });
    const result = processCommentData(existing, { id: 123, last_comment_id: 100 });
    const info = JSON.parse(result.info);
    assert.equal(info.num, 42);
  });
});

// === Linkify regex logic (extracted from js/linkify.js) ===

function linkifyText(text) {
  var noProtocolUrl =
    /(^|[\s(])(www\..+?\..+?)([.,;!?:)]*(?=\s|$))/g;
  var httpOrMailtoUrl =
    /(^|[\s(])((?:https?:\/\/|mailto:)\S+?)([.,;!?:)]*(?=\s|$))/g;
  var html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return html
    .replace(noProtocolUrl, '$1<a href="http://$2">$2</a>$3')
    .replace(httpOrMailtoUrl, '$1<a href="$2">$2</a>$3');
}

describe('linkifyText', () => {
  it('converts http URLs to links', () => {
    assert.equal(
      linkifyText('visit http://example.com today'),
      'visit <a href="http://example.com">http://example.com</a> today'
    );
  });
  it('converts https URLs to links', () => {
    assert.equal(
      linkifyText('see https://example.com/path'),
      'see <a href="https://example.com/path">https://example.com/path</a>'
    );
  });
  it('converts www URLs to links with http prefix', () => {
    assert.equal(
      linkifyText('go to www.example.com now'),
      'go to <a href="http://www.example.com">www.example.com</a> now'
    );
  });
  it('converts mailto URLs to links', () => {
    assert.equal(
      linkifyText('email mailto:test@example.com'),
      'email <a href="mailto:test@example.com">mailto:test@example.com</a>'
    );
  });
  it('leaves plain text unchanged', () => {
    assert.equal(linkifyText('no links here'), 'no links here');
  });
  it('handles URL at start of string', () => {
    assert.equal(
      linkifyText('http://example.com is great'),
      '<a href="http://example.com">http://example.com</a> is great'
    );
  });
  it('handles URL at end of string', () => {
    assert.equal(
      linkifyText('visit http://example.com'),
      'visit <a href="http://example.com">http://example.com</a>'
    );
  });
  it('escapes HTML entities in text', () => {
    assert.equal(
      linkifyText('a < b & c > d'),
      'a &lt; b &amp; c &gt; d'
    );
  });
});
