// Netlify Function: exchange a pass code for the shared Supabase connection details.
// Secrets live in Netlify env vars, never in the app:
//   SYNC_PASSCODE         - FULL access pass code (read + write)
//   SYNC_PASSCODE_READ    - READ-ONLY pass code (view only)
//   SHARED_SUPABASE_URL   - your Supabase project URL
//   SHARED_SUPABASE_KEY   - your Supabase anon / publishable key (public-safe)
//   SHARED_SYNC_CODE      - optional shared namespace (default "shared")

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "POST only" }) };

  const full = process.env.SYNC_PASSCODE;
  const read = process.env.SYNC_PASSCODE_READ;
  if (!full && !read)
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Pass-code sync is not set up on this site yet." }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Bad request." }) }; }

  const given = (body.passcode || "").toString().trim();
  let mode = null;
  if (full && given === full) mode = "full";
  else if (read && given === read) mode = "read";
  if (!mode)
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "That pass code isn't right." }) };

  const url = process.env.SHARED_SUPABASE_URL;
  const key = process.env.SHARED_SUPABASE_KEY;
  const syncCode = process.env.SHARED_SYNC_CODE || "shared";
  if (!url || !key)
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Shared Supabase details aren't configured on this site." }) };

  return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, url, key, syncCode, mode }) };
};
