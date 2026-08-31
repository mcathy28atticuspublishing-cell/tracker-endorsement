const { createClient } = require('@supabase/supabase-js');

const MAX_ROWS = 500;
const MAX_STRING_LEN = 4000;
const DEFAULT_TITLE = 'Endorsement Desk';

function clampString(v, max) {
  if (typeof v !== 'string') return '';
  return v.length > max ? v.slice(0, max) : v;
}

// Accepts whatever shape the client sends but strips anything that isn't a
// known field, so a malformed or hostile payload can't reach the database
// with unexpected columns or oversized values.
function sanitizeState(body) {
  if (!body || typeof body !== 'object') throw new Error('Body must be a JSON object');
  if (!Array.isArray(body.rows)) throw new Error('rows must be an array');
  if (body.rows.length > MAX_ROWS) throw new Error('Too many rows (max ' + MAX_ROWS + ')');

  const rows = body.rows.map(function (r, i) {
    if (!r || typeof r !== 'object') throw new Error('Row ' + i + ' is not an object');
    return {
      id: Number(r.id) || i + 1,
      date: clampString(r.date, 32) || null,
      author: clampString(r.author, 200),
      category: clampString(r.category, 100),
      task: clampString(r.task, 100),
      done: !!r.done,
      status: clampString(r.status, 50),
      due: clampString(r.due, 32) || null,
      due_note: clampString(r.dueNote, 200),
      qa: !!r.qa,
      platform: clampString(r.platform, 50),
      creatives: clampString(r.creatives, 100),
      publicist: clampString(r.publicist, 100),
      note: clampString(r.note, MAX_STRING_LEN)
    };
  });

  return { title: clampString(body.title, 200) || DEFAULT_TITLE, rows: rows };
}

function rowFromDb(r) {
  return {
    id: r.id,
    date: r.date,
    author: r.author,
    category: r.category,
    task: r.task,
    done: r.done,
    status: r.status,
    due: r.due,
    dueNote: r.due_note,
    qa: r.qa,
    platform: r.platform,
    creatives: r.creatives,
    publicist: r.publicist,
    note: r.note
  };
}

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars — attach the Supabase ' +
      'integration to this project in Vercel (Storage tab) and redeploy.'
    );
  }
  return createClient(url, key);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  let supabase;
  try {
    supabase = getClient();
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  if (req.method === 'GET') {
    const [metaRes, rowsRes] = await Promise.all([
      supabase.from('tracker_meta').select('title').eq('id', 'singleton').maybeSingle(),
      supabase.from('endorsement_rows').select('*').order('id', { ascending: true })
    ]);
    if (metaRes.error) { res.status(500).json({ error: metaRes.error.message }); return; }
    if (rowsRes.error) { res.status(500).json({ error: rowsRes.error.message }); return; }
    res.status(200).json({
      title: (metaRes.data && metaRes.data.title) || DEFAULT_TITLE,
      rows: rowsRes.data.map(rowFromDb)
    });
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

    // Client always sends the full table, so a save is a full replace:
    // upsert the title, then swap the row set (delete-all + bulk-insert;
    // fine for a single-writer team tool of this size).
    const metaUpsert = await supabase
      .from('tracker_meta')
      .upsert({ id: 'singleton', title: sanitized.title });
    if (metaUpsert.error) { res.status(500).json({ error: metaUpsert.error.message }); return; }

    const del = await supabase.from('endorsement_rows').delete().gte('id', 0);
    if (del.error) { res.status(500).json({ error: del.error.message }); return; }

    if (sanitized.rows.length) {
      const ins = await supabase.from('endorsement_rows').insert(sanitized.rows);
      if (ins.error) { res.status(500).json({ error: ins.error.message }); return; }
    }

    res.status(200).json(sanitized);
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
};
