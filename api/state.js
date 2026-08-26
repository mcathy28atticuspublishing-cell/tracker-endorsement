const { kv } = require('@vercel/kv');

const STATE_KEY = 'endorsement-desk:state';
const MAX_ROWS = 500;
const MAX_STRING_LEN = 4000;

const SEED_STATE = {
  title: 'Social Media Endorsement Desk',
  rows: [
    { id: 1, date: '2026-08-27', author: 'Patricia Schoeler', category: 'MONTH 1', task: 'For Designs', done: true, status: 'DONE', due: '2026-08-27', dueNote: '', qa: true, platform: 'FACEBOOK', creatives: 'JED', publicist: 'Kortney', note: '' },
    { id: 2, date: '2026-08-27', author: 'Marty Tilley', category: 'MONTH 1', task: 'For Designs', done: true, status: 'DONE', due: '2026-08-06', dueNote: '', qa: true, platform: 'FACEBOOK', creatives: 'JED', publicist: 'Ethan', note: '' },
    { id: 3, date: '2026-08-27', author: 'Frank lutz', category: 'PROPOSAL', task: 'For Changes', done: true, status: 'DONE', due: '2026-08-20', dueNote: '', qa: true, platform: 'FACEBOOK', creatives: 'CATH', publicist: 'Kortney', note: '' }
  ]
};

function clampString(v, max) {
  if (typeof v !== 'string') return '';
  return v.length > max ? v.slice(0, max) : v;
}

// Accepts whatever shape the client sends but strips anything that isn't a
// known field, so a malformed or hostile payload can't grow unbounded keys
// into the stored JSON blob.
function sanitizeState(body) {
  if (!body || typeof body !== 'object') throw new Error('Body must be a JSON object');
  if (!Array.isArray(body.rows)) throw new Error('rows must be an array');
  if (body.rows.length > MAX_ROWS) throw new Error('Too many rows (max ' + MAX_ROWS + ')');

  const rows = body.rows.map(function (r, i) {
    if (!r || typeof r !== 'object') throw new Error('Row ' + i + ' is not an object');
    return {
      id: Number(r.id) || i + 1,
      date: clampString(r.date, 32),
      author: clampString(r.author, 200),
      category: clampString(r.category, 100),
      task: clampString(r.task, 100),
      done: !!r.done,
      status: clampString(r.status, 50),
      due: clampString(r.due, 32),
      dueNote: clampString(r.dueNote, 200),
      qa: !!r.qa,
      platform: clampString(r.platform, 50),
      creatives: clampString(r.creatives, 100),
      publicist: clampString(r.publicist, 100),
      note: clampString(r.note, MAX_STRING_LEN)
    };
  });

  return { title: clampString(body.title, 200) || 'Endorsement Desk', rows: rows };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const state = (await kv.get(STATE_KEY)) || SEED_STATE;
    res.status(200).json(state);
    return;
  }

  if (req.method === 'POST') {
    let sanitized;
    try {
      sanitized = sanitizeState(req.body);
    } catch (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    await kv.set(STATE_KEY, sanitized);
    res.status(200).json(sanitized);
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
};
