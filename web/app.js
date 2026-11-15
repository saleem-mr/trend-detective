const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const I18N = {
  en: {
    title:'Trend Detective', subtitle:'Earth System · NASA POWER',
    challenge:'NASA Space Apps 2026 · Be An Earth System Trend Detective!',
    custom:'Custom box', about:'About',
    chartTitle:'Annual series · robust trend · uncertainty',
    gatesTitle:'Three gates before any claim', snr:'Signal / detection limit',
    download:'Download results (JSON)', repro:'Reproduce',
    mapTitle:'Where it changes · per-cell slope', darker:'darker', brighter:'brighter',
    tableTitle:'Statistical summary', anomTitle:'Detrended anomalies (|z| ≥ 1.5)',
    predTitle:'Linear projection (not a climate model)',
    methodTitle:'Why a "no verdict" is a result',
    footer:'Built with NASA POWER (MERRA-2, CERES SYN1deg) · statistics computed by a portable C++ engine · NASA Space Apps Challenge 2026',
    fab:'Ask about the results', chatTitle:'Ask the detective', ask:'Ask about the trend…', send:'Send',
    g1:'Permutation test (block null, preserves autocorrelation)',
    g2:'Mann–Kendall with Hamed–Rao autocorrelation correction',
    g3:'Slope above the minimum detectable trend',
    gFdr:'Survives FDR (Benjamini–Hochberg correction)',
    power:'Power (advisory)', confStrong:'strong', confModerate:'moderate', confNear:'near the detection limit',
    colQ:'q (FDR)', winLabel:'Window', scenTitle:'Four regions, four verdicts', surprise:'The surprise',
    pass:'pass', fail:'fail',
    colVar:'Variable', colSlope:'Slope / yr', colDec:'Slope / decade', colCi:'95% CI / decade',
    colPp:'p (perm)', colPhr:'p (Hamed–Rao)', colSnr:'Signal', colVerdict:'Verdict',
    colYear:'Year', colPred:'Predicted', colLo:'Lower', colHi:'Upper', colDelta:'Δ vs last',
    anomNone:'No anomaly years at this threshold.',
    mapNone:'The spatial field is available for preset regions only. Custom boxes return the centre-point aggregate.',
    trend:'trend detected', none:'no verdict',
    legendSeries:'Annual value', legendTrend:'Robust trend', legendCi:'Trend 95% CI',
    legendPred:'Projection', legendAnom:'Anomaly',
    whyNo:'No verdict is not a failure. It is the correct answer when the signal cannot be separated from the noise.',
    m1:'Theil–Sen slope: median of all pairwise slopes. Robust to outliers and to a single bad year.',
    m2:'Mann–Kendall: a rank test, distribution-free. We correct its variance for serial correlation (Hamed–Rao), because annual means are not independent.',
    m3:'Permutation null: we reshuffle blocks of the detrended series 400 times. This keeps the autocorrelation and destroys only the trend — the honest null.',
    m4:'Detection limit: MDT = 2.80 × SE(slope). Below it, a "trend" is indistinguishable from noise, so the engine refuses to call it.',
    m5:'Provenance: MERRA-2 and CERES are model/reanalysis products. Correlations between them partly reflect shared physics, not independent evidence.',
    prov1:'Data', prov1v:'NASA POWER API · MERRA-2 (TS, PRECTOTCORR, GWETTOP) · CERES SYN1deg (albedo, shortwave)',
    prov2:'Resolution', prov2v:'MERRA-2 ≈ 55 × 59 km · CERES ≈ 111 × 94 km · monthly means aggregated to annual',
    prov3:'Engine', prov3v:'C++17 · Theil–Sen, Mann–Kendall, Hamed–Rao, block permutation, MDT',
    prov4:'Interpreter', prov4v:'Grounded: the LLM only sees the computed JSON, never raw data',
    cells:'sampled points', effective:'distinct cells', up:'cells rising', down:'cells falling', sig:'significant',
    copyCmd:'Reproduce this exact result:', copied:'Copied', dlt:'Downloaded',
    think:'Thinking…', ctxShow:'Show injected context', ctxHide:'Hide injected context',
    chips:['What does the albedo trend mean?','Is this trend statistically significant?','Why is there no verdict on temperature?','Which years were anomalies?']
  },
  ar: {
    title:'محقّق الاتجاهات', subtitle:'نظام الأرض · ناسا باور',
    challenge:'ناسا سبيس آبس 2026 · كن محقّق اتجاهات نظام الأرض!',
    custom:'نطاق مخصّص', about:'عن المشروع',
    chartTitle:'السلسلة السنوية · الاتجاه المتين · عدم اليقين',
    gatesTitle:'ثلاث بوابات قبل أي ادّعاء', snr:'الإشارة / حد الكشف',
    download:'تنزيل النتائج (JSON)', repro:'إعادة الإنتاج',
    mapTitle:'أين يتغيّر · الميل لكل خلية', darker:'أغمق', brighter:'أفتح',
    tableTitle:'الملخّص الإحصائي', anomTitle:'الشذوذ بعد إزالة الاتجاه (|z| ≥ 1.5)',
    predTitle:'إسقاط خطي (ليس نموذجاً مناخياً)',
    methodTitle:'لماذا «لا حكم» نتيجة',
    footer:'مبني على ناسا باور (MERRA-2 وCERES) · الإحصاء بمحرّك C++ محمول · تحدّي ناسا سبيس آبس 2026',
    fab:'اسأل عن النتائج', chatTitle:'اسأل المحقّق', ask:'اسأل عن الاتجاه…', send:'إرسال',
    g1:'اختبار التبديل (كتل تحفظ الارتباط الذاتي)',
    g2:'مان-كيندال مع تصحيح هاميد-راو للارتباط الذاتي',
    g3:'الميل يتجاوز الحد الأدنى القابل للكشف',
    gFdr:'تنجو من تصحيح FDR (بنياميني-هوخبرغ)',
    power:'القدرة (استشارية)', confStrong:'قوية', confModerate:'متوسطة', confNear:'قريب من حد الكشف',
    colQ:'q (FDR)', winLabel:'النافذة الزمنية', scenTitle:'أربع مناطق، أربعة أحكام', surprise:'المفاجئ هنا',
    pass:'ناجح', fail:'فاشل',
    colVar:'المتغيّر', colSlope:'الميل/سنة', colDec:'الميل/عقد', colCi:'المجال 95% للعقد',
    colPp:'p (تبديل)', colPhr:'p (هاميد-راو)', colSnr:'الإشارة', colVerdict:'الحكم',
    colYear:'السنة', colPred:'المتوقّع', colLo:'الأدنى', colHi:'الأعلى', colDelta:'الفرق عن الأخير',
    anomNone:'لا سنوات شاذة عند هذا الحد.',
    mapNone:'الحقل المكاني متاح للمناطق الجاهزة فقط؛ النطاق المخصّص يعيد تجميع نقطة المركز.',
    trend:'اتجاه مؤكّد', none:'لا حكم',
    legendSeries:'القيمة السنوية', legendTrend:'الاتجاه المتين', legendCi:'مجال الاتجاه 95%',
    legendPred:'الإسقاط', legendAnom:'شذوذ',
    whyNo:'«لا حكم» ليس فشلاً، بل الإجابة الصحيحة حين لا يمكن فصل الإشارة عن الضجيج.',
    m1:'ميل ثيل-سن: وسيط كل ميول الأزواج، متين ضد القيم الشاذة وسنة سيئة واحدة.',
    m2:'مان-كيندال: اختبار رتبي لا يفترض توزيعاً. نصحّح تباينه للارتباط الذاتي (هاميد-راو) لأن المتوسطات السنوية غير مستقلة.',
    m3:'التبديل: نعيد خلط كتل السلسلة منزوعة الاتجاه 400 مرة، فنحفظ الارتباط الذاتي ونُبطل الاتجاه فقط — هذا هو العدم الصادق.',
    m4:'حد الكشف: MDT = 2.80 × الخطأ المعياري للميل. تحته لا يُميّز «الاتجاه» عن الضجيج، فيرفض المحرّك الحكم.',
    m5:'المصدر: MERRA-2 وCERES منتجات نموذج/إعادة تحليل؛ الارتباط بينها يعكس فيزياء مشتركة جزئياً لا أدلة مستقلة.',
    prov1:'البيانات', prov1v:'واجهة ناسا باور · MERRA-2 (حرارة السطح، الأمطار، رطوبة التربة) · CERES (الانعكاس، الإشعاع)',
    prov2:'الدقة', prov2v:'MERRA-2 ≈ 55 × 59 كم · CERES ≈ 111 × 94 كم · متوسطات شهرية مجمّعة سنوياً',
    prov3:'المحرّك', prov3v:'C++17 · ثيل-سن، مان-كيندال، هاميد-راو، تبديل الكتل، MDT',
    prov4:'المفسّر', prov4v:'مُقيَّد: لا يرى النموذج اللغوي إلا ملف JSON المحسوب، لا البيانات الخام',
    cells:'نقطة مقاسة', effective:'خلية مميّزة', up:'خلايا صاعدة', down:'خلايا هابطة', sig:'معنوية',
    copyCmd:'لإعادة إنتاج النتيجة نفسها:', copied:'تم النسخ', dlt:'تم التنزيل',
    think:'يفكّر…', ctxShow:'إظهار السياق المحقون', ctxHide:'إخفاء السياق',
    chips:['ماذا يعني اتجاه الانعكاس؟','هل الاتجاه معنوي إحصائياً؟','لماذا لا حكم على الحرارة؟','ما سنوات الشذوذ؟']
  }
};

const state = { lang: localStorage.getItem('lang') || 'en', region: 'sahel', period: 'full', varKey: 'albedo', data: null, regions: {} };
const t = k => (I18N[state.lang] && I18N[state.lang][k]) ?? I18N.en[k] ?? k;
const sig = x => (x === null || x === undefined || !isFinite(x)) ? '—' : (x === 0 ? '0' : Number(Number(x).toPrecision(3)).toString());
const pct = x => isFinite(x) ? (100 * x).toFixed(0) + '%' : '—';
const VAR_ORDER = ['albedo','temperature','precipitation','soil','swdown'];
const VAR_LABEL = { albedo:{en:'Surface albedo',ar:'الانعكاس السطحي'}, temperature:{en:'Land surface temperature',ar:'حرارة السطح'}, precipitation:{en:'Precipitation',ar:'الأمطار'}, soil:{en:'Surface soil wetness',ar:'رطوبة التربة'}, swdown:{en:'Shortwave downward',ar:'الإشعاع النازل'} };
const vlabel = k => (VAR_LABEL[k] && VAR_LABEL[k][state.lang]) || k;

function applyStatic(){
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(el => { const k = el.dataset.i18n; const v = t(k); if (typeof v === 'string') el.textContent = v; });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $('#langBtn').textContent = state.lang === 'ar' ? 'English' : 'العربية';
  $('#q').placeholder = t('ask');
  const sel = $('#region');
  if (sel && Object.keys(state.regions).length){
    const cur = sel.value || state.region;
    sel.innerHTML = Object.values(state.regions).map(r => `<option value="${r.key}">${state.lang==='ar' ? (r.name_ar||r.name) : r.name}</option>`).join('');
    sel.value = cur;
  }
  renderChips();
}

async function boot(){
  applyStatic();
  try { state.regions = await (await fetch('/api/regions')).json(); } catch { state.regions = {}; }
  const sel = $('#region');
  sel.innerHTML = Object.values(state.regions).map(r => `<option value="${r.key}">${state.lang==='ar' ? (r.name_ar||r.name) : r.name}</option>`).join('');
  sel.value = state.region;
  sel.onchange = () => { state.region = sel.value; load(); };
  $('#langBtn').onclick = () => { state.lang = state.lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('lang', state.lang); applyStatic(); renderAll(); };
  $$('#periodSeg button').forEach(b => b.onclick = () => {
    state.period = b.dataset.p;
    $$('#periodSeg button').forEach(x => x.setAttribute('aria-pressed', x.dataset.p === state.period));
    load();
  });
  $('#customBtn').onclick = customBox;
  $('#dlBtn').onclick = downloadJSON;
  $('#reproBtn').onclick = toggleRepro;
  $('#fab').onclick = () => $('#chat').classList.add('open');
  $('#chatClose').onclick = () => $('#chat').classList.remove('open');
  $('#chatForm').onsubmit = sendChat;
  $('#q').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });
  await load();
}

async function load(){
  $('#heroTitle').textContent = t('think');
  try {
    const res = await fetch('/api/analyze?region=' + encodeURIComponent(state.region) + (state.period === '2001' ? '&period=2001' : ''));
    state.data = await res.json();
    if (state.data.error) throw new Error(state.data.error);
    const meta = state.data.region.meta || {};
    const regionChanged = state._lastRegion !== state.region;
    state._lastRegion = state.region;
    if (regionChanged && meta.headline && meta.headline.var && state.data.variables[meta.headline.var]) {
      state.varKey = meta.headline.var;
    }
    if (!state.data.variables[state.varKey]) state.varKey = state.data.variables.albedo ? 'albedo' : Object.keys(state.data.variables)[0];
    renderAll();
  } catch (e) {
    $('#heroText').innerHTML = '<span class="err">' + e.message + '</span>';
  }
}

async function customBox(){
  const s = prompt(state.lang==='ar' ? 'أدخل: خط_أدنى,خط_أعلى,طول_أدنى,طول_أعلى (٢ درجات على الأقل)' : 'Enter: lat_min,lat_max,lon_min,lon_max (at least 2° each):', '12,18,-16,-12');
  if (!s) return;
  $('#heroTitle').textContent = t('think');
  try {
    const res = await fetch('/api/analyze?bbox=' + encodeURIComponent(s) + '&name=Custom%20box');
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    state.data = d; state.region = '__custom'; renderAll();
  } catch (e) { $('#heroText').innerHTML = '<span class="err">' + e.message + '</span>'; }
}

function renderAll(){
  if (!state.data) return;
  const d = state.data, primary = d.variables[state.varKey] || d.variables.albedo;
  const meta = d.region.meta || {};
  const name = state.lang === 'ar' ? (meta.name_ar || d.region.name) : d.region.name;

  const pill = $('#verdictPill');
  pill.className = 'verdict ' + (primary.verdict === 'TREND' ? 'trend' : 'none');
  pill.textContent = primary.verdict === 'TREND' ? t('trend') : t('none');
  $('#periodBadge').textContent = `${primary.period[0]}–${primary.period[1]} · ${primary.n_years} ${state.lang==='ar'?'سنة':'years'}`;
  $('#heroTitle').textContent = name;
  $('#heroText').textContent = verdictSentence(primary);
  $('#heroMeta').innerHTML = [
    `${meta.points ?? d.region.n_points} ${t('cells')}`,
    `${meta.effective_cells ?? '—'} ${t('effective')}`,
    `bbox ${(d.region.bbox||[]).join(', ')}`,
    `${t('winLabel')}: ${state.period==='2001'?'2001–2023':'1981–2023'}`,
    d.engine.method.split(':')[0]
  ].join(' · ');

  renderScenarios();
  renderStory(d);
  renderTabs();
  renderChart(primary);
  renderGates(primary);
  renderKpis(d);
  renderMap(d.spatial);
  renderTable(d);
  renderAnomalies(primary);
  renderPredictions(primary);
  renderMethod(d);
}

function verdictSentence(v){
  const d = v.detectability, ar = state.lang === 'ar';
  const dec = sig(v.slope_per_decade), lo = sig(v.slope_ci[0]*10), hi = sig(v.slope_ci[1]*10);
  const near = v.confidence === 'near-limit';
  if (v.verdict === 'TREND') return ar
    ? `اتجاه ${v.direction==='increasing'?'صاعد':'هابط'} معنوي بمقدار ${dec} لكل عقد (95%: ${lo} إلى ${hi}). الإشارة ${sig(d.snr)} من حد الكشف${near?' — أي قريب من الحد':'—'}.`
    : `A significant ${v.direction} trend of ${dec} per decade (95% CI ${lo} to ${hi}). Signal is ${sig(d.snr)}× the detection limit${near ? ', i.e. near the limit' : ''}.`;
  return ar
    ? `الإشارة ${sig(d.snr)} من حد الكشف (${sig(d.mdt)} سنوياً). لا يمكن تمييزها عن الضجيج، فيرفض المحرّك إعلان اتجاه.`
    : `Signal is ${sig(d.snr)}× the detection limit (${sig(d.mdt)} per year). It cannot be separated from noise, so the engine reports no verdict.`;
}

function renderStory(d){
  const box = $('#story');
  const m = d.region.meta || {};
  const text = state.lang === 'ar' ? (m.story_ar || m.story_en) : m.story_en;
  if (!text) { box.className = 'story'; box.innerHTML = ''; return; }
  box.className = 'story on';
  box.innerHTML = `<b>${t('surprise')}</b>${text}`;
}

function renderScenarios(){
  const box = $('#scenarios');
  const regs = Object.values(state.regions || {});
  if (!box || !regs.length) return;
  box.innerHTML = regs.map(r => {
    const h = r.headline || {};
    const pill = h.verdict === 'TREND' ? `<span class="pill t">${t('trend')}</span>` : `<span class="pill n">${t('none')}</span>`;
    const conf = h.confidence && h.confidence !== 'none' ? `<span class="conf">${h.confidence}</span>` : '';
    const name = state.lang === 'ar' ? (r.name_ar || r.name) : r.name;
    const tag = state.lang === 'ar' ? (r.tagline_ar || r.tagline) : r.tagline;
    const val = h.slope_per_decade != null ? (h.slope_per_decade > 0 ? '+' : '') + sig(h.slope_per_decade) : '—';
    return `<button class="scen" data-k="${r.key}" aria-current="${state.region === r.key}">
      <div class="scen-top">${pill}${conf}</div>
      <h4>${name}</h4>
      <div class="big">${val}</div>
      <div class="conf">${h.var || ''} · ${state.lang === 'ar' ? 'لكل عقد' : 'per decade'}</div>
      <p>${tag || ''}</p>
    </button>`;
  }).join('');
  $$('#scenarios .scen').forEach(b => b.onclick = () => {
    state.region = b.dataset.k;
    const sel = $('#region'); if (sel) sel.value = state.region;
    load();
  });
}

function renderTabs(){
  const d = state.data;
  $('#varTabs').innerHTML = VAR_ORDER.filter(k => d.variables[k]).map(k => {
    const v = d.variables[k];
    return `<button class="tab" role="tab" aria-selected="${k===state.varKey}" data-k="${k}">
      <span class="dot ${v.verdict==='TREND'?'t':'n'}"></span>${vlabel(k)} <span class="num" style="opacity:.6">${sig(v.slope_per_decade)}</span></button>`;
  }).join('');
  $$('#varTabs .tab').forEach(b => b.onclick = () => { state.varKey = b.dataset.k; renderAll(); });
}

function renderChart(v){
  const svg = $('#chart'); const W=900,H=340,L=64,R=16,T=14,B=42;
  const ser = v.series, fit = v.fit, pr = v.predictions || [];
  const y0 = ser[0][0], y1 = Math.max(ser[ser.length-1][0], pr.length ? pr[pr.length-1].year : 0);
  const vals = [...ser.map(p=>p[1]), ...pr.flatMap(p=>[p.lower,p.upper])];
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mx === mn) { mx += 1; mn -= 1; }
  const pad = (mx-mn)*0.12; mn -= pad; mx += pad;
  const sx = y => L + (y-y0)/Math.max(1,(y1-y0))*(W-L-R);
  const sy = x => H-B - (x-mn)/(mx-mn)*(H-T-B);
  const b = v.fit[0][1], sl = v.slope_per_year, clo = v.slope_ci[0], chi = v.slope_ci[1];
  const at = (yr, s) => b + s*(yr - y0);

  let g = '';
  for (let i=0;i<=4;i++){ const yv = mn + (mx-mn)*i/4, yy = sy(yv);
    g += `<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="#1F2A3D" stroke-width="1"/>`;
    g += `<text x="${L-8}" y="${yy+4}" fill="#8B96A8" font-size="11" text-anchor="end">${sig(yv)}</text>`; }
  const step = Math.max(1, Math.ceil((y1-y0)/6));
  for (let yr = Math.ceil(y0/step)*step; yr <= y1; yr += step)
    g += `<text x="${sx(yr)}" y="${H-B+18}" fill="#8B96A8" font-size="11" text-anchor="middle">${yr}</text>`;

  let band = '';
  for (let yr = y0; yr <= y1; yr++) band += `${sx(yr)},${sy(at(yr,clo))} `;
  for (let yr = y1; yr >= y0; yr--) band += `${sx(yr)},${sy(at(yr,chi))} `;
  const bandEl = `<polygon points="${band}" fill="#4D9FFF" opacity="0.10"/>`;

  const dark = v.direction === 'increasing' ? '#FF6B6B' : '#00D4AA';
  let pband = '';
  if (pr.length) {
    for (const p of pr) pband += `${sx(p.year)},${sy(p.upper)} `;
    for (let i=pr.length-1;i>=0;i--) pband += `${sx(pr[i].year)},${sy(pr[i].lower)} `;
  }
  const predEl = pr.length ? `<polygon points="${pband}" fill="${dark}" opacity="0.07"/>
    <polyline points="${pr.map(p=>`${sx(p.year)},${sy(p.predicted)}`).join(' ')}" fill="none" stroke="${dark}" stroke-width="2" stroke-dasharray="6 5"/>` : '';

  const serEl = `<polyline points="${ser.map(p=>`${sx(p[0])},${sy(p[1])}`).join(' ')}" fill="none" stroke="#4D9FFF" stroke-width="2.2" stroke-linejoin="round"/>`;
  const fitEl = `<line x1="${sx(y0)}" y1="${sy(at(y0,sl))}" x2="${sx(y1)}" y2="${sy(at(y1,sl))}" stroke="#E6EDF7" stroke-width="1.6" opacity="0.85"/>`;
  const anomEl = (v.anomalies||[]).map(a => {
    const pt = ser.find(p => p[0] === a.year); if (!pt) return '';
    return `<circle cx="${sx(pt[0])}" cy="${sy(pt[1])}" r="4" fill="#FF6B6B" stroke="#0B0F1A" stroke-width="1.5"><title>${a.year}: ${sig(pt[1])} (z=${sig(a.z)})</title></circle>`;
  }).join('');
  const pts = ser.map(p => `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="2.6" fill="#4D9FFF"><title>${p[0]}: ${sig(p[1])} ${v.unit||''}</title></circle>`).join('');

  svg.innerHTML = `<g>${g}${bandEl}${predEl}${fitEl}${serEl}${pts}${anomEl}</g>`;
  $('#legend').innerHTML = [
    ['#4D9FFF', t('legendSeries')], ['#E6EDF7', t('legendTrend')], ['#4D9FFF', t('legendCi')],
    ...(pr.length ? [[dark, t('legendPred')]] : []), ['#FF6B6B', t('legendAnom')]
  ].map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('');
}

function renderGates(v){
  const d = v.detectability, q = v.fdr ? v.fdr.q : 1;
  const rows = [
    [v.permutation.p < 0.05, t('g1'), `p = ${sig(v.permutation.p)}`],
    [v.hamed_rao.p < 0.05, t('g2'), `p = ${sig(v.hamed_rao.p)} · n_eff = ${sig(v.hamed_rao.n_eff)}`],
    [q < 0.05, t('gFdr'), `q = ${sig(q)}`]
  ];
  const conf = v.confidence || 'none';
  const confTxt = conf === 'strong' ? t('confStrong') : conf === 'moderate' ? t('confModerate') : conf === 'near-limit' ? t('confNear') : '—';
  $('#gates').innerHTML = rows.map(([ok, label, val]) =>
    `<div class="gate"><span class="tick ${ok?'ok':'no'}">${ok?'✓':'!'}</span><div><b>${label}</b><span>${val} — ${ok?t('pass'):t('fail')}</span></div></div>`).join('')
    + `<div class="gate adv"><span class="tick">≈</span><div><b>${t('power')}</b><span class="num">${sig(d.snr)}× ${state.lang==='ar'?'حد الكشف':'detection limit'} — ${confTxt}</span></div></div>`;
  const snr = Math.min(d.snr || 0, 3);
  $('#snrVal').textContent = sig(d.snr) + '×';
  $('#snrBar').style.width = (snr/3*100).toFixed(0) + '%';
}

function renderKpis(d){
  $('#kpis').innerHTML = VAR_ORDER.filter(k => d.variables[k]).map(k => {
    const v = d.variables[k], up = v.slope_per_year > 0;
    const cls = v.verdict === 'TREND' ? (up ? 'up' : 'down') : 'flat';
    return `<div class="card kpi">
      <h3>${vlabel(k)}</h3>
      <div class="v ${cls} num">${up?'+':''}${sig(v.slope_per_decade)}</div>
      <div class="s">${state.lang==='ar'?'لكل عقد':'per decade'} · <span class="pill ${v.verdict==='TREND'?'t':'n'}">${v.verdict==='TREND'?t('trend'):t('none')}</span></div>
      <div class="s num" style="margin-top:6px">p=${sig(v.permutation.p)} · ${sig(v.detectability.snr)}×</div>
    </div>`;
  }).join('');
}

function renderMap(sp){
  const el = $('#map');
  if (!sp || !sp.cells || !sp.cells.length) {
    if (window.TDMap) window.TDMap.update(state.data, state.lang);
    $('#mapNote').textContent = t('mapNone');
    return;
  }
  if (window.TDMap) window.TDMap.update(state.data, state.lang);
  else el.innerHTML = '<div class="err" style="padding:16px">Map library failed to load</div>';
  $('#mapNote').innerHTML = `<span class="pill t">${sp.cells_up} ${t('up')}</span>
    <span class="pill n">${sp.cells_down} ${t('down')}</span>
    <span class="pill t">${sp.cells_significant} ${t('sig')}</span>
    <span style="margin-inline-start:8px">${sp.param} · ${sp.n_cells} ${state.lang==='ar'?'خلية':'cells'}</span>`;
}

function renderTable(d){
  const head = `<tr><th>${t('colVar')}</th><th class="num">${t('colSlope')}</th><th class="num">${t('colDec')}</th><th class="num">${t('colCi')}</th><th class="num">${t('colPp')}</th><th class="num">${t('colPhr')}</th><th class="num">${t('colQ')}</th><th class="num">${t('colSnr')}</th><th>${t('colVerdict')}</th></tr>`;
  $('#statsTable thead').innerHTML = head;
  $('#statsTable tbody').innerHTML = VAR_ORDER.filter(k=>d.variables[k]).map(k => {
    const v = d.variables[k];
    return `<tr><td>${vlabel(k)}</td>
      <td class="num">${sig(v.slope_per_year)}</td>
      <td class="num">${sig(v.slope_per_decade)}</td>
      <td class="num">${sig(v.slope_ci[0]*10)} … ${sig(v.slope_ci[1]*10)}</td>
      <td class="num">${sig(v.permutation.p)}</td>
      <td class="num">${sig(v.hamed_rao.p)}</td>
      <td class="num">${sig(v.fdr ? v.fdr.q : NaN)}</td>
      <td class="num">${sig(v.detectability.snr)}×</td>
      <td><span class="pill ${v.verdict==='TREND'?'t':'n'}">${v.verdict==='TREND'?t('trend'):t('none')}</span></td></tr>`;
  }).join('');
}

function renderAnomalies(v){
  const tl = $('#timeline'); tl.querySelectorAll('.tl-dot').forEach(e=>e.remove());
  const y0 = v.series[0][0], y1 = v.series[v.series.length-1][0];
  for (const a of (v.anomalies||[])){
    const d = document.createElement('div');
    d.className = 'tl-dot ' + (a.z < 0 ? 'neg' : 'pos');
    d.style.left = (100*(a.year-y0)/Math.max(1,(y1-y0))) + '%';
    d.title = `${a.year} · z=${sig(a.z)}`;
    tl.appendChild(d);
  }
  $('#tlTicks').innerHTML = [y0, Math.round((y0+y1)/2), y1].map(y=>`<span>${y}</span>`).join('');
  $('#anomNote').textContent = (v.anomalies||[]).length ? (state.lang==='ar'?'أحمر: أدنى من الاتجاه · أزرق: أعلى منه':'red: below trend · blue: above trend') : t('anomNone');
}

function renderPredictions(v){
  const rows = v.predictions || [];
  $('#predTable thead').innerHTML = `<tr><th>${t('colYear')}</th><th class="num">${t('colPred')}</th><th class="num">${t('colLo')}</th><th class="num">${t('colHi')}</th><th class="num">${t('colDelta')}</th></tr>`;
  const last = v.series[v.series.length-1][1];
  $('#predTable tbody').innerHTML = rows.length ? rows.map(p =>
    `<tr><td class="num">${p.year}</td><td class="num">${sig(p.predicted)}</td><td class="num">${sig(p.lower)}</td><td class="num">${sig(p.upper)}</td>
     <td class="num${p.predicted-last>=0?'':' '}">${(p.predicted-last>=0?'+':'')}${sig(p.predicted-last)}</td></tr>`).join('')
    : `<tr><td colspan="5" style="color:#8B96A8">—</td></tr>`;
}

function renderMethod(d){
  $('#methodList').innerHTML = ['m1','m2','m3','m4','m5'].map(k=>`<li>${t(k)}</li>`).join('');
  const m = d.region.meta || {};
  $('#prov').innerHTML = [
    ['prov1','prov1v'], ['prov2','prov2v'], ['prov3','prov3v'], ['prov4','prov4v']
  ].map(([a,b],i)=>`<div><b>${t(a)}</b>${i===2 ? t(b) : (a==='prov1'? t(b) : t(b))}</div>`).join('')
   + (m.note ? `<div><b>${state.lang==='ar'?'ملاحظة':'Note'}</b>${m.note}</div>` : '');
}

function toggleRepro(){
  const box = $('#reproBox');
  box.classList.toggle('show');
  const m = state.data.region.meta || {};
  const cmd = `./engine/trend-detect --data data/${state.region} --region "${state.data.region.name}" --bbox "${(state.data.region.bbox||[]).join(',')}" --primary albedo --grid-param ALLSKY_SRF_ALB --out out.json\n./engine/trend-detect --selftest`;
  box.textContent = t('copyCmd') + '\n' + cmd;
}

function downloadJSON(){
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trend-${state.region}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}

function renderChips(){
  $('#chips').innerHTML = t('chips').map(q => `<button class="chip">${q}</button>`).join('');
  $$('#chips .chip').forEach(b => b.onclick = () => { $('#q').value = b.textContent; sendChat(new Event('submit')); });
}

function addMsg(who, text, ctx){
  const el = document.createElement('div');
  el.className = 'msg ' + who;
  el.innerHTML = `<div class="who">${who==='user'?'You':(state.lang==='ar'?'المحقّق':'Detective')}</div><div>${text}</div>`;
  if (ctx){
    const b = document.createElement('button'); b.className='btn'; b.style.marginTop='6px'; b.textContent = t('ctxShow');
    const pre = document.createElement('div'); pre.className='ctx'; pre.textContent = ctx;
    b.onclick = () => { pre.classList.toggle('show'); b.textContent = pre.classList.contains('show') ? t('ctxHide') : t('ctxShow'); };
    el.appendChild(b); el.appendChild(pre);
  }
  const box = $('#msgs'); box.appendChild(el); box.scrollTop = box.scrollHeight;
  return el;
}

async function sendChat(e){
  if (e && e.preventDefault) e.preventDefault();
  const q = $('#q').value.trim(); if (!q) return;
  addMsg('user', q); $('#q').value = '';
  const pending = addMsg('bot', t('think'));
  try {
    const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ question:q, lang:state.lang, region:state.data }) });
    const j = await r.json();
    pending.innerHTML = `<div class="who">${state.lang==='ar'?'المحقّق':'Detective'} · ${j.provider||''}${j.model?(' · '+j.model):''}</div><div>${(j.text||j.error||'').replace(/</g,'&lt;')}</div>`;
    const b = document.createElement('button'); b.className='btn'; b.style.marginTop='6px'; b.textContent = t('ctxShow');
    const pre = document.createElement('div'); pre.className='ctx';
    pre.textContent = JSON.stringify({ variables: Object.fromEntries(Object.entries(state.data.variables).map(([k,v])=>[k,{slope_per_year:v.slope_per_year,p_perm:v.permutation.p,verdict:v.verdict,mdt:v.detectability.mdt,snr:v.detectability.snr}])) }, null, 1);
    b.onclick = () => { pre.classList.toggle('show'); b.textContent = pre.classList.contains('show') ? t('ctxHide') : t('ctxShow'); };
    pending.appendChild(b); pending.appendChild(pre);
  } catch (err) {
    pending.innerHTML = `<div class="who">${state.lang==='ar'?'المحقّق':'Detective'}</div><div class="err">${err.message}</div>`;
  }
}

boot();