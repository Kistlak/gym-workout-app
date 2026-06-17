// Netlify Function: (1) reads a workout/sleep screenshot with Gemini, or
// (2) writes a short coach summary from the user's own logged numbers.
// The API key lives in Netlify env vars (GEMINI_API_KEY) and is NEVER sent to the browser.

const MODEL = "gemini-2.5-flash";

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

  const key = process.env.GEMINI_API_KEY;
  if (!key)
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server is missing GEMINI_API_KEY." }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Bad JSON." }) }; }

  const { kind } = body;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

  // ---- (3) BUILD PLAN: pick & star exercises from the provided catalog ----
  if (kind === "plan") {
    const profile = (body.profile || "").toString().slice(0, 1000);
    const catalog = Array.isArray(body.catalog) ? body.catalog.slice(0, 200) : [];
    const validIds = new Set(catalog.map((c) => c.id));
    const instruction =
      "You are a strength coach building a Push/Pull/Legs plan. Below is a PERSON profile and a CATALOG of allowed exercises " +
      "(each has id, name, day, equipment, muscles). Choose the best exercises for THIS person's goal and equipment. " +
      "Pick about 5-6 per day, balanced across the muscles for that day, ordered most-important first. " +
      "RULES: only use ids that appear in the catalog; never invent ids or exercises; only pick exercises whose day matches. " +
      "Reply with ONLY JSON, no markdown: {\"push\":[ids],\"pull\":[ids],\"legs\":[ids]}.\n\nPERSON:\n" + profile +
      "\n\nCATALOG:\n" + JSON.stringify(catalog);
    const payloadBody = {
      contents: [{ parts: [{ text: instruction }] }],
      generationConfig: { temperature: 0.3, response_mime_type: "application/json" },
    };
    try {
      const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadBody) });
      const data = await resp.json();
      if (!resp.ok) {
        const msg = (data && data.error && data.error.message) || "Gemini request failed.";
        return { statusCode: resp.status, headers: cors, body: JSON.stringify({ error: msg }) };
      }
      const text =
        (data.candidates && data.candidates[0] && data.candidates[0].content &&
          data.candidates[0].content.parts && data.candidates[0].content.parts.map((p) => p.text || "").join("")) || "";
      let parsed;
      try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); }
      catch { return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "The plan came back unreadable. Try again." }) }; }
      // sanitize: keep only valid ids, correct day
      const byId = {}; catalog.forEach((c) => (byId[c.id] = c));
      const clean = { push: [], pull: [], legs: [] };
      ["push", "pull", "legs"].forEach((d) => {
        (Array.isArray(parsed[d]) ? parsed[d] : []).forEach((id) => {
          if (validIds.has(id) && byId[id].day === d && clean[d].indexOf(id) === -1) clean[d].push(id);
        });
      });
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, plan: clean }) };
    } catch (e) {
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Network error reaching Gemini: " + (e.message || e) }) };
    }
  }

  // ---- (2) TEXT COACHING: summary or recovery ----
  if (kind === "summary" || kind === "recovery") {
    const payload = (body.payload || "").toString().slice(0, 8000);
    const summaryInstruction =
      "You are a supportive but honest strength-training coach. The person is doing a lean bulk " +
      "(gain muscle, stay lean). Below is THEIR OWN logged data for one period (a week or a month — see 'Period' in the data). " +
      "Write 4 to 6 short sentences in plain text (no markdown, no headers, no lists): first a clear readout of what they actually did " +
      "this period (workouts done, whether weights/volume moved, sleep, bodyweight vs the lean-bulk target), then 1 or 2 specific " +
      "recommendations for the NEXT period (next week if this was a week, next month if it was a month). " +
      "Be encouraging but truthful. IMPORTANT: do not diagnose any medical or mental condition, and never claim certainty about " +
      "'overtraining' or health status. Phrase recovery or rest concerns as suggestions. If there is little data, say so kindly and " +
      "encourage consistent logging. Do NOT give exact medical numbers (no exact grams, calories, or litres).\n\nDATA:\n" +
      payload;
    const recoveryInstruction =
      "You are a direct, no-nonsense strength coach. The data below is ONE person's sleep and workout for a given day, and you must " +
      "set them up to recover for the NEXT day (the date is stated in the data). Reply in 3 to 5 sentences, plain text (no markdown, no lists). " +
      "Cover, in order: (1) how much to sleep tonight as a RANGE (e.g. 7-9 hours), with an earlier bedtime if last night was short; " +
      "(2) what kinds of food and drink to have TODAY to recover — name food TYPES (e.g. lean protein like chicken/eggs/whey, slow carbs " +
      "like rice/oats, fruit and veg, and plenty of water plus electrolytes given the hot climate), but NEVER exact grams, calories, or litres; " +
      "(3) the general protein and carbohydrate direction for a lean bulk in plain words; (4) whether to train lighter, normally, or rest " +
      "for the next session, based on how hard today was and how the sleep looked. Be blunt and practical. STRICT RULES: ranges and food " +
      "TYPES only, never exact numbers; do NOT diagnose anything; do NOT claim medical authority.\n\nDATA:\n" +
      payload;
    const instruction = kind === "recovery" ? recoveryInstruction : summaryInstruction;
    const payloadBody = {
      contents: [{ parts: [{ text: instruction }] }],
      generationConfig: { temperature: kind === "recovery" ? 0.4 : 0.5 },
    };
    try {
      const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadBody) });
      const data = await resp.json();
      if (!resp.ok) {
        const msg = (data && data.error && data.error.message) || "Gemini request failed.";
        return { statusCode: resp.status, headers: cors, body: JSON.stringify({ error: msg }) };
      }
      const text =
        (data.candidates && data.candidates[0] && data.candidates[0].content &&
          data.candidates[0].content.parts && data.candidates[0].content.parts.map((p) => p.text || "").join("").trim()) || "";
      if (!text) return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "No summary came back. Try again." }) };
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, text }) };
    } catch (e) {
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Network error reaching Gemini: " + (e.message || e) }) };
    }
  }

  // ---- (1) SCREENSHOT EXTRACTION (image in, JSON out) ----
  const { image, mime } = body;
  if (!image)
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "No image provided." }) };

  const prompts = {
    sleep:
      "This is a screenshot of an Apple Health Sleep Score screen. " +
      "Extract these fields and reply with ONLY a JSON object, no markdown, no extra text: " +
      '{"score": number|null, "hours": number|null, "minutes": number|null, "bedtime": "H:MM AM/PM"|null, "vitals": string|null}. ' +
      "score is the big sleep score number (0-100). hours and minutes come from the total time asleep (e.g. '7hr 47min'). " +
      "bedtime is last night's bedtime if shown. vitals is the word next to Vitals (e.g. 'Typical') if shown. Use null for anything not visible.",
    workout:
      "This is a screenshot of an Apple Watch workout summary. " +
      "Extract these fields and reply with ONLY a JSON object, no markdown, no extra text: " +
      '{"time": "H:MM:SS"|null, "activeCalories": number|null, "avgHeartRate": number|null}. ' +
      "time is the Workout Time. activeCalories is the Active Calories number. avgHeartRate is the Avg. Heart Rate in bpm. Use null for anything not visible.",
  };
  const instruction = prompts[kind] || prompts.workout;

  const payload = {
    contents: [{ parts: [{ text: instruction }, { inline_data: { mime_type: mime || "image/png", data: image } }] }],
    generationConfig: { temperature: 0, response_mime_type: "application/json" },
  };

  try {
    const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await resp.json();
    if (!resp.ok) {
      const msg = (data && data.error && data.error.message) || "Gemini request failed.";
      return { statusCode: resp.status, headers: cors, body: JSON.stringify({ error: msg }) };
    }
    const text =
      (data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts.map((p) => p.text || "").join("")) || "";
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); }
    catch { return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Could not read numbers from that screenshot. Try a clearer image, or type them in.", raw: text }) }; }
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, fields: parsed }) };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Network error reaching Gemini: " + (e.message || e) }) };
  }
};
