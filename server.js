const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execFile } = require('child_process');

const ROOT = __dirname;
const WEB = path.join(ROOT, 'web');
const DATA = path.join(ROOT, 'data');
const CACHE = path.join(ROOT, 'cache');
const ENGINE = process.env.ML_ENGINE_PATH || path.join(ROOT, 'engine', 'trend-detect');
const PORT = process.env.PORT || 3000;
const CHAT_LIMIT = Number(process.env.CHAT_LIMIT || 20);
const CHAT_WINDOW_MS = 60000;
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { n: 0, t: now };
  if (now - b.t > CHAT_WINDOW_MS) { b.n = 0; b.t = now; }
  b.n++;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return b.n > CHAT_LIMIT;
}

(function loadEnv(){
  try {
    const p = path.join(__dirname, '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const v = m[2].replace(/^["']|["']$/g, '');
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
})();

const PROVIDERS = {
  tokenharbor: { base: 'https://tokenharbor.ai/v1', model: 'deepseek-v4.1-flash:free', keyEnv: 'TOKENHARBOR_API_KEY' },
  deepseek:    { base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', keyEnv: 'DEEPSEEK_API_KEY' },
  groq:        { base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', keyEnv: 'GROQ_API_KEY' },
  llm7:        { base: 'https://api.llm7.io/v1', model: 'DeepSeek-V4-Flash-0731', keyEnv: null, maxTokens: 700 },
  custom:      { base: process.env.LLM_BASE_URL || '', model: process.env.LLM_MODEL || 'gpt-4o-mini', keyEnv: 'LLM_API_KEY' }
};

function providerChain(preferred) {
  const order = [preferred, process.env.LLM_PROVIDER, 'tokenharbor', 'deepseek', 'llm7', 'groq', 'custom'].filter(Boolean);
  const out = [], seen = new Set();
  for (const id of order) {
    const p = PROVIDERS[id];
    if (!p || seen.has(id)) continue;
    const base = (p.base || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
    if (!base) continue;
    const key = p.keyEnv ? (process.env[p.keyEnv] || '') : '';
    if (p.keyEnv && !key && id !== 'custom') continue;
    seen.add(id);
    out.push({ id, base, key, model: process.env.LLM_MODEL || p.model });
  }
  return out;
}

function chatCompletion(p, messages, maxTokens = 320) {
  return new Promise((resolve, reject) => {
    const u = new URL(p.base + '/chat/completions');
    const mod = u.protocol === 'http:' ? http : https;
    const body = JSON.stringify({ model: p.model, messages, temperature: 0.2, max_tokens: maxTokens, stream: false });
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (p.key) headers['Authorization'] = 'Bearer ' + p.key;
    const req = mod.request({ hostname: u.hostname, port: u.port || (u.protocol === 'http:' ? 80 : 443), path: u.pathname + u.search, method: 'POST', timeout: 30000, headers }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        if (r.statusCode < 200 || r.statusCode >= 300) return reject(new Error(`${p.id} HTTP ${r.statusCode}: ${b.slice(0, 140)}`));
        try {
          const j = JSON.parse(b);
          const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
          const text = (msg.content || '').trim() || (msg.reasoning_content || '').trim();
          if (!text) return reject(new Error(p.id + ' empty response'));
          resolve({ text, model: j.model || p.model, provider: p.id });
        } catch (e) { reject(new Error(p.id + ' parse: ' + e.message)); }
      });
    });
    req.on('timeout', () => req.destroy(new Error(p.id + ' timeout')));
    req.on('error', reject);
    req.write(body); req.end();
  });
}

for (const d of [CACHE]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

const MIME = { '.pdf':'application/pdf', '.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.gz':'application/gzip', '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };

function json(res, code, obj) {
  const b = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8', 'Content-Length':b.length, 'Cache-Control':'no-store' });
  res.end(b);
}

function regions() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'regions.json'), 'utf8')); }
  catch { return {}; }
}

function analyseRegion(key, period) {
  const suffix = period === '2001' ? '_2001' : '';
  const p = path.join(DATA, String(key).replace(/[^a-z]/g,'') + suffix + '.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function fetchPOWER(lat, lon, start, end) {
  return new Promise((resolve, reject) => {
    const params = 'TS,PRECTOTCORR,GWETTOP,ALLSKY_SRF_ALB,ALLSKY_SFC_SW_DWN';
    const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${params}&community=RE&longitude=${lon}&latitude=${lat}&start=${start}&end=${end}&format=CSV`;
    const req = https.get(url, { timeout: 45000 }, r => {
      if (r.statusCode !== 200) { r.resume(); return reject(new Error('POWER HTTP ' + r.statusCode)); }
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => req.destroy(new Error('POWER timeout')));
    req.on('error', reject);
  });
}

async function liveAnalyse(bbox, name) {
  const [la1, la2, lo1, lo2] = bbox.split(',').map(Number);
  if (![la1,la2,lo1,lo2].every(Number.isFinite)) throw new Error('bad bbox');
  if (Math.abs(la2-la1) < 1.9 || Math.abs(lo2-lo1) < 1.9) throw new Error('bbox must be at least 2 x 2 degrees (POWER regional limit)');
  const lat = +((la1+la2)/2).toFixed(3), lon = +((lo1+lo2)/2).toFixed(3);
  const hash = crypto.createHash('sha1').update(`${lat},${lon},2001,2023`).digest('hex').slice(0,10);
  const out = path.join(DATA, `live-${hash}.json`);
  if (fs.existsSync(out)) return JSON.parse(fs.readFileSync(out, 'utf8'));
  const csv = await fetchPOWER(lat, lon, 2001, 2023);
  const dir = path.join(CACHE, `live-${hash}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `P_${lat}_${lon}.csv`), csv);
  await new Promise((resolve, reject) => {
    execFile(ENGINE, ['--data', dir, '--region', name || `Custom ${lat},${lon}`, '--bbox', `${la1},${la2},${lo1},${lo2}`, '--primary','albedo','--grid-param','ALLSKY_SRF_ALB','--out', out],
      { timeout: 60000 }, (err, so, se) => err ? reject(new Error(se || err.message)) : resolve());
  });
  const d = JSON.parse(fs.readFileSync(out, 'utf8'));
  d.region.meta = { key:`live-${hash}`, name:name||`Custom ${lat},${lon}`, bbox:[la1,la2,lo1,lo2], points:1, effective_cells:1, grid_km:[55.3,58.7], source_grid:'MERRA-2 0.5x0.625 deg / CERES 1 deg', note:'single centre point of a custom box: aggregate only, no spatial field' };
  d.region.challenge = 'Be An Earth System Trend Detective!';
  return d;
}

function fmt(x, d=4) { return (x===null||x===undefined||!isFinite(x)) ? 'n/a' : Number(x).toFixed(d); }

function verdictLine(v, lang) {
  const d = v.detectability, ar = lang === 'ar';
  if (v.verdict === 'TREND') {
    return ar
      ? `اتجاه ${v.direction==='increasing'?'صاعد':'هابط'} معنوي: ${fmt(v.slope_per_decade)} لكل عقد (التباين 95%: ${fmt(v.slope_ci[0]*10)} إلى ${fmt(v.slope_ci[1]*10)}). نسبة الإشارة إلى حد الكشف ${fmt(d.snr,2)}.`
      : `A significant ${v.direction} trend: ${fmt(v.slope_per_decade)} per decade (95% CI ${fmt(v.slope_ci[0]*10)} to ${fmt(v.slope_ci[1]*10)}). Signal is ${fmt(d.snr,2)}x the detection limit.`;
  }
  return ar
    ? `لا حكم: الإشارة ${fmt(d.snr,2)} من حد الكشف (${fmt(d.mdt)} سنوياً)، فلا يمكن تمييزها عن الضجيج بثقة.`
    : `No verdict: signal is ${fmt(d.snr,2)}x the detection limit (${fmt(d.mdt)} per year), so it cannot be separated from noise with confidence.`;
}

function templateAnswer(q, data, lang) {
  const ar = lang === 'ar';
  const s = q.toLowerCase();
  const vars = data.variables;
  const pick = k => vars[k];
  const named = ['albedo','temperature','precipitation','soil','swdown'].find(k => s.includes(k) || (ar && s.includes(({albedo:'الانعكاس',temperature:'الحرارة',precipitation:'الأمطار',soil:'التربة',swdown:'الإشعاع'})[k])));
  const v = named ? vars[named] : (vars.albedo || Object.values(vars)[0]);
  const k = named || Object.keys(vars).find(x => vars[x] === v);

  if (/anomal|شذوذ|غير طبيع|extrem/.test(s)) {
    const a = v.anomalies;
    if (!a.length) return ar ? 'لا توجد سنوات شاذة بارزة في هذه السلسلة.' : 'No standout anomaly years in this series.';
    return (ar ? 'السنوات الشاذة هي: ' : 'Anomaly years: ') + a.map(x => `${x.year} (z=${fmt(x.z,1)})`).join(', ') + '.';
  }
  if (/predict|2035|forecast|المستقبل|توقع/.test(s)) {
    const p = v.predictions[v.predictions.length-1];
    if (!p) return ar ? 'لا توجد توقعات لهذه السلسلة.' : 'No prediction available.';
    return ar
      ? `التوقع الخطي لعام ${p.year}: ${fmt(p.predicted)} (المجال ${fmt(p.lower)}–${fmt(p.upper)}). هذا امتداد خطي بسيط لا نموذج مناخي.`
      : `Linear projection for ${p.year}: ${fmt(p.predicted)} (range ${fmt(p.lower)} to ${fmt(p.upper)}). This is a simple linear extrapolation, not a climate model.`;
  }
  if (/signific|معنوي|دلالة|p-value|p value/.test(s)) {
    return ar
      ? `قيمة الاحتمال بعد تصحيح الارتباط الذاتي ${fmt(v.hamed_rao.p,4)}، وبعد اختبار التبديل ${fmt(v.permutation.p,4)}. الحكم: ${v.verdict}.`
      : `Autocorrelation-corrected p = ${fmt(v.hamed_rao.p,4)}, permutation p = ${fmt(v.permutation.p,4)}. Verdict: ${v.verdict}.`;
  }
  if (/detection limit|\bmdt\b|حد الكشف|أصغر اتجاه/.test(s)) {
    const d = v.detectability;
    return ar
      ? `حد الكشف للمتغيّر «${v.label}» هو ${fmt(d.mdt, 5)} سنوياً، والإشارة الحالية ${fmt(d.snr, 2)} من هذا الحد، أي أن الاتجاهات الأصغر منه لا يمكن تمييزها عن الضوضاء.`
      : `The detection limit for ${v.label} is ${fmt(d.mdt, 5)} per year; the current signal is ${fmt(d.snr, 2)}x that limit, so any smaller trend cannot be separated from noise.`;
  }
  if (/no verdict|لماذا لا|why.*(no|not)|غير حاسم/.test(s)) {
    return verdictLine(v, lang) + ' ' + (ar
      ? `الحد الأدنى لاتجاه قابل للكشف مع 23 سنة هو ${fmt(v.detectability.mdt)} سنوياً.`
      : `With 23 annual samples the smallest reliably detectable trend is ${fmt(v.detectability.mdt)} per year.`);
  }
  if (/albedo|الانعكاس/.test(s)) {
    return ar
      ? 'الانعكاس هو نسبة ضوء الشمس التي يعكسها السطح. سطح فاتح وجاف يعكس أكثر، والنبات والتربة الرطبة أغمق. ' + verdictLine(vars.albedo||v, lang)
      : 'Albedo is the fraction of sunlight a surface reflects. Pale, dry ground reflects more; vegetation and wet soil are darker. ' + verdictLine(vars.albedo||v, lang);
  }
  if (/what.*mean|ماذا يعني|explain|اشرح|trend/.test(s)) {
    return verdictLine(v, lang) + ' ' + (ar
      ? `هذه السلسلة تغطي ${v.period[0]}–${v.period[1]} (${v.n_years} سنة).`
      : `This series covers ${v.period[0]}–${v.period[1]} (${v.n_years} annual values).`);
  }
  return ar
    ? 'هذا التحليل لا يغطي هذا السؤال. جرّب السؤال عن الاتجاه أو الدلالة أو التوقع أو السنوات الشاذة.'
    : 'This analysis does not cover that question. Try asking about the trend, significance, prediction, or anomaly years.';
}

const SYS_EN = 'You are a scientific interpreter for a NASA climate dashboard. You do NOT analyze raw data. You only explain pre-computed statistical results provided to you.\n\nRULES:\n1. Never invent numbers. Only cite values from the provided JSON.\n2. Never contradict the provided results.\n3. Keep responses to 2-4 sentences unless the user asks for detail.\n4. Use plain language suitable for non-experts.\n5. If asked something not covered by the provided results, say "This analysis does not cover that question."';
const SYS_AR = 'أنت مفسّر علمي للوحة مناخية تابعة لناسا. لا تحلّل البيانات الخام، بل تشرح فقط النتائج الإحصائية المحسوبة مسبقاً. القواعد: لا تخترع أي رقم؛ لا تناقض النتائج؛ اجعل الإجابة 2-4 جمل؛ استخدم لغة بسيطة؛ إن لم يغطِّ التحليل السؤال فقل: «هذا التحليل لا يغطي هذا السؤال».';

async function llmAnswer(question, data, lang, preferred) {
  const chain = providerChain(preferred);
  if (!chain.length) throw new Error('no provider configured');
  const messages = [
    { role: 'system', content: lang === 'ar' ? SYS_AR : SYS_EN },
    { role: 'system', content: 'COMPUTED RESULTS JSON:\n' + JSON.stringify(data) },
    { role: 'user', content: question }
  ];
  const errors = [];
  for (const p of chain) {
    try { return await chatCompletion(p, messages, p.maxTokens || 340); }
    catch (e) { errors.push(e.message); }
  }
  throw new Error(errors.join(' | '));
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (u.pathname === '/api/regions') return json(res, 200, regions());
    if (u.pathname === '/api/health') {
      const chain = providerChain();
      return json(res, 200, { ok:true, engine:fs.existsSync(ENGINE), llm:{ providers: chain.map(p=>p.id), primary: chain[0] ? chain[0].id : null } });
    }

    if (u.pathname === '/api/analyze') {
      const key = u.searchParams.get('region');
      if (key) {
        const d = analyseRegion(key, u.searchParams.get('period'));
        if (!d) return json(res, 404, { error:'unknown region' });
        return json(res, 200, d);
      }
      const bbox = u.searchParams.get('bbox');
      if (bbox) {
        try { return json(res, 200, await liveAnalyse(bbox, (u.searchParams.get('name')||'').slice(0,60))); }
        catch (e) { return json(res, 400, { error: String(e.message || e) }); }
      }
      return json(res, 400, { error:'need region or bbox' });
    }

    if (u.pathname === '/api/chat' && req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      if (rateLimited(ip)) {
        res.writeHead(429, { 'Content-Type':'application/json; charset=utf-8', 'Retry-After':'60' });
        return res.end(JSON.stringify({ error:'rate limited', retry_after: 60 }));
      }
      let body=''; for await (const c of req) body += c;
      let p; try { p = JSON.parse(body); } catch { return json(res, 400, { error:'bad json' }); }
      const lang = p.lang === 'ar' ? 'ar' : 'en';
      const data = p.region && p.region.region ? p.region : analyseRegion('sahel');
      if (!data) return json(res, 400, { error:'no data' });
      const q = String(p.question || '').slice(0, 600);
      try {
        const r = await llmAnswer(q, data, lang, p.provider);
        return json(res, 200, r);
      } catch (e) {
        return json(res, 200, { text: templateAnswer(q, data, lang), model: 'rule-based (LLM unreachable)', provider: 'rule-based', detail: String(e.message).slice(0, 240) });
      }
    }

    if (u.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

    if (u.pathname.startsWith('/.well-known/acme-challenge/')) {
      const tok = decodeURIComponent(u.pathname.split('/').pop()).replace(/[^A-Za-z0-9_\-]/g, '');
      const f = path.join(process.env.ACME_WEBROOT || '/app/acme', '.well-known', 'acme-challenge', tok);
      if (fs.existsSync(f)) {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
        return fs.createReadStream(f).pipe(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('not found');
    }
    let file = u.pathname === '/' ? '/index.html' : u.pathname;
    if (file === '/about' || file === '/about/') file = '/about.html';
    const p = path.join(WEB, path.normalize(file).replace(/^(\.\.[\/\\])+/, ''));
    if (!p.startsWith(WEB)) return json(res, 403, { error:'forbidden' });
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      const isVendor = file.startsWith('/vendor/');
      const st = fs.statSync(p);
      const etag = 'W/"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, { 'ETag': etag, 'Cache-Control': isVendor ? 'public, max-age=31536000, immutable' : 'no-cache' });
        return res.end();
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(p)] || 'application/octet-stream',
        'Cache-Control': isVendor ? 'public, max-age=31536000, immutable' : 'no-cache',
        'ETag': etag,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      });
      return fs.createReadStream(p).pipe(res);
    }
    res.writeHead(404, { 'Content-Type':'text/plain' }); res.end('not found');
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  const chain = providerChain();
  console.log(`trend-detective on http://localhost:${PORT}  llm=${chain.length ? chain.map(p=>p.id).join(' > ') : 'rule-based only'}`);
});