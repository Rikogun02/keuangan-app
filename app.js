const KEY = 'keuangan_v1';
const EXP = ['Makanan','Transportasi','Belanja','Tagihan','Hiburan','Kesehatan','Lainnya'];
const INC = ['Gaji','Usaha','Bonus','Lainnya'];
const KW = {
  Makanan:['makan','kopi','nasi','warung','resto','jajan','snack','minum','bakso','mie'],
  Transportasi:['bensin','parkir','ojek','grab','gojek','tol','kereta','bus','transjakarta'],
  Belanja:['belanja','indomaret','alfamart','baju','shopee','tokopedia','sabun'],
  Tagihan:['listrik','air','wifi','internet','pulsa','token','sewa','kos','pdam','bpjs'],
  Hiburan:['nonton','game','netflix','spotify','bioskop'],
  Kesehatan:['obat','dokter','apotek','rumah sakit','vitamin'],
  Gaji:['gaji','salary'],
  Bonus:['bonus','thr','insentif'],
  Usaha:['jual','usaha','proyek','order','komisi']
};

let data = {};
try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e) { data = {}; }
data.tx = data.tx || [];
data.recur = data.recur || [];

let mode = 'mingguan';
let type = 'out';
let anchor = new Date();
let catTouched = false;
let editId = null;

const $ = s => document.querySelector(s);
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseISO = s => { const [a,b,c] = s.split('-').map(Number); return new Date(a,b-1,c); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtD = d => d.toLocaleDateString('id-ID',{day:'numeric',month:'short'});
const num = v => Number(String(v).replace(/\D/g,'')) || 0;

function save(){ try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {} }

/* ---------- Otomatis: kategori dari keterangan ---------- */
function suggestCat(text){
  const t = text.toLowerCase();
  for (const [cat, words] of Object.entries(KW)) if (words.some(w => t.includes(w))) return cat;
  return null;
}

/* ---------- Otomatis: transaksi berulang ---------- */
function applyRecurring(){
  const today = new Date();
  const ey = today.getFullYear(), em = today.getMonth();
  let changed = false;
  data.recur.forEach(r => {
    const start = parseISO(r.start);
    let y = start.getFullYear(), m = start.getMonth();
    r.applied = r.applied || [];
    while (y < ey || (y === ey && m <= em)) {
      const key = `${y}-${String(m+1).padStart(2,'0')}`;
      if (!r.applied.includes(key)) {
        const last = new Date(y, m+1, 0).getDate();
        const d = new Date(y, m, Math.min(r.day, last));
        if (d > today) break;
        data.tx.push({id:uid(), type:r.type, amount:r.amount, desc:r.desc + ' (otomatis)', cat:r.cat, date:iso(d)});
        r.applied.push(key);
        changed = true;
      }
      m++; if (m > 11) { m = 0; y++; }
    }
  });
  if (changed) save();
}

/* ---------- Periode ---------- */
function weekRange(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  const off = (x.getDay()+6)%7;
  const s = new Date(x); s.setDate(x.getDate()-off);
  const e = new Date(s); e.setDate(s.getDate()+6);
  return [s,e];
}
function calcFor(ref){
  const [s,e] = mode === 'mingguan' ? weekRange(ref) : [new Date(ref.getFullYear(),ref.getMonth(),1), new Date(ref.getFullYear(),ref.getMonth()+1,0)];
  const S = iso(s), E = iso(e);
  let awal = 0, inc = 0, out = 0;
  data.tx.forEach(t => {
    const v = t.type === 'in' ? t.amount : -t.amount;
    if (t.date < S) awal += v;
    else if (t.date <= E) { if (t.type === 'in') inc += t.amount; else out += t.amount; }
  });
  const list = data.tx.filter(t => t.date >= S && t.date <= E)
    .sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return {s,e,awal,inc,out,akhir:awal+inc-out,list};
}
const calc = () => calcFor(anchor);
function prevRef(){
  return mode === 'mingguan'
    ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()-7)
    : new Date(anchor.getFullYear(), anchor.getMonth()-1, 1);
}
function shift(n){
  anchor = mode === 'mingguan'
    ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()+7*n)
    : new Date(anchor.getFullYear(), anchor.getMonth()+n, 1);
}

/* ---------- Render: Transaksi ---------- */
function fillCats(sel, t){ sel.innerHTML = (t === 'in' ? INC : EXP).map(c => `<option>${c}</option>`).join(''); }
function bars(title, obj, total, k){
  const ent = Object.entries(obj).sort((a,b) => b[1]-a[1]);
  if (!ent.length) return '';
  return `<div class="card"><h3>${title}</h3>` + ent.map(([n,v]) =>
    `<div class="bar"><span>${esc(n)} <small>${rp(v)}</small></span>
     <div class="track"><i class="${k}" style="width:${total ? Math.round(v/total*100) : 0}%"></i></div></div>`
  ).join('') + `</div>`;
}
function sumHTML(c){
  return [
    ['Saldo awal', c.awal, ''],
    ['Total pemasukan', c.inc, 'in'],
    ['Total pengeluaran', c.out, 'out'],
    ['Saldo akhir', c.akhir, c.akhir >= 0 ? 'in' : 'out']
  ].map(([l,v,k]) => `<div class="card stat"><span>${l}</span><b class="${k}">${rp(v)}</b></div>`).join('');
}
function renderTrx(){
  const c = calc();
  $('#sum').innerHTML = sumHTML(c);
  const cats = {}, srcs = {};
  c.list.forEach(t => {
    if (t.type === 'out') cats[t.cat] = (cats[t.cat]||0) + t.amount;
    else srcs[t.cat] = (srcs[t.cat]||0) + t.amount;
  });
  $('#brk').innerHTML = bars('Pengeluaran per kategori', cats, c.out, 'out') + bars('Pemasukan per sumber', srcs, c.inc, 'in');
  $('#list').innerHTML = c.list.length
    ? c.list.map(t => `<div class="row">
        <div><b>${esc(t.desc)}</b><small>${t.date} · ${esc(t.cat)}</small></div>
        <div class="${t.type}">${t.type==='in'?'+':'−'}${rp(t.amount)}
          <button class="act" data-edit="${t.id}" title="Edit">✎</button>
          <button class="act" data-tx="${t.id}" title="Hapus">×</button></div></div>`).join('')
    : '<p class="muted">Belum ada transaksi pada periode ini.</p>';
  $('#recur').innerHTML = data.recur.length
    ? data.recur.map(r => `<div class="row">
        <div><b>${esc(r.desc)}</b><small>Tiap tanggal ${r.day} · ${esc(r.cat)}</small></div>
        <div class="${r.type}">${rp(r.amount)} <button class="act" data-rec="${r.id}">×</button></div></div>`).join('')
    : '<p class="muted">Belum ada transaksi berulang.</p>';
}

/* ---------- Render: Laporan ---------- */
function reportText(c){
  const head = `LAPORAN KEUANGAN ${mode === 'mingguan' ? 'MINGGUAN' : 'BULANAN'}\n` +
    `Periode: ${iso(c.s)} s/d ${iso(c.e)}\n` +
    `Saldo awal: ${rp(c.awal)}\nTotal pemasukan: ${rp(c.inc)}\nTotal pengeluaran: ${rp(c.out)}\nSaldo akhir: ${rp(c.akhir)}\n\n` +
    `Tanggal;Jenis;Keterangan;Sumber/Kategori;Jumlah\n`;
  const rows = c.list.slice().reverse().map(t =>
    `${t.date};${t.type==='in'?'Pemasukan':'Pengeluaran'};${t.desc};${t.cat};${t.amount}`).join('\n');
  return head + rows;
}
function renderLap(){
  const c = calc();
  const cats = {}, srcs = {};
  c.list.forEach(t => {
    if (t.type === 'out') cats[t.cat] = (cats[t.cat]||0) + t.amount;
    else srcs[t.cat] = (srcs[t.cat]||0) + t.amount;
  });
  const rowsOf = obj => Object.entries(obj).sort((a,b) => b[1]-a[1])
    .map(([n,v]) => `<tr><td>${esc(n)}</td><td class="r">${rp(v)}</td></tr>`).join('')
    || '<tr><td colspan="2" class="muted">Tidak ada data</td></tr>';
  const txRows = c.list.slice().reverse().map(t =>
    `<tr><td>${t.date}</td><td>${esc(t.desc)}</td><td>${esc(t.cat)}</td><td class="r ${t.type}">${t.type==='in'?'+':'−'}${rp(t.amount)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="muted">Tidak ada transaksi</td></tr>';
  $('#lapBody').innerHTML = `
    <h3>Laporan ${mode === 'mingguan' ? 'Mingguan' : 'Bulanan'}</h3>
    <p class="muted">Periode: ${iso(c.s)} s/d ${iso(c.e)} · Dibuat: ${new Date().toLocaleDateString('id-ID')}</p>
    <table class="tab-table" style="margin-top:8px">
      <tr><td>Saldo awal</td><td class="r">${rp(c.awal)}</td></tr>
      <tr><td>Total pemasukan</td><td class="r in">${rp(c.inc)}</td></tr>
      <tr><td>Total pengeluaran</td><td class="r out">${rp(c.out)}</td></tr>
      <tr><th>Saldo akhir</th><th class="r">${rp(c.akhir)}</th></tr>
    </table>
    <h3 style="margin-top:16px">Pemasukan per sumber</h3>
    <table class="tab-table">${rowsOf(srcs)}</table>
    <h3 style="margin-top:16px">Pengeluaran per kategori</h3>
    <table class="tab-table">${rowsOf(cats)}</table>
    <h3 style="margin-top:16px">Rincian transaksi</h3>
    <table class="tab-table"><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th class="r">Jumlah</th></tr>${txRows}</table>`;
}

/* ---------- Render: Nasihat ---------- */
function renderNas(){
  const c = calc(), p = calcFor(prevRef());
  const per = mode === 'mingguan' ? 'minggu ini' : 'bulan ini';
  const tips = [];
  if (!c.inc && !c.out) {
    tips.push(['', 'Belum ada transaksi di periode ini. Catat pemasukan dan pengeluaran agar saran bisa disesuaikan dengan kondisi Anda.']);
  } else {
    if (c.inc > 0) {
      const sisa = c.inc - c.out, pct = Math.round(sisa / c.inc * 100);
      if (sisa < 0) tips.push(['warn', `Pengeluaran melebihi pemasukan sebesar ${rp(-sisa)} ${per}. Tunda pengeluaran yang tidak mendesak dan tinjau kategori terbesar.`]);
      else if (pct >= 20) tips.push(['good', `Bagus! Anda menyisihkan ${pct}% dari pemasukan ${per}. Pertahankan kebiasaan ini.`]);
      else tips.push(['warn', `Sisa dana ${per} baru ${pct}% dari pemasukan. Targetkan minimal 20% untuk tabungan atau dana darurat.`]);
    } else if (c.out > 0) {
      tips.push(['warn', `Belum ada pemasukan tercatat ${per}, tetapi pengeluaran sudah ${rp(c.out)}. Pastikan semua pemasukan sudah dicatat.`]);
    }
    const cats = {};
    c.list.forEach(t => { if (t.type === 'out') cats[t.cat] = (cats[t.cat]||0) + t.amount; });
    const top = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];
    if (top && c.out > 0) {
      const sh = Math.round(top[1] / c.out * 100);
      if (sh >= 40) tips.push(['warn', `Kategori ${top[0]} menyerap ${sh}% dari pengeluaran Anda. Coba tetapkan batas anggaran untuk kategori ini.`]);
      else tips.push(['', `Pengeluaran terbesar ${per} ada di kategori ${top[0]} (${sh}%).`]);
    }
    if (c.out > 0 && p.out > 0) {
      const d = Math.round((c.out - p.out) / p.out * 100);
      if (d >= 20) tips.push(['warn', `Pengeluaran naik ${d}% dibanding periode sebelumnya. Cek apakah ada pengeluaran yang tidak rutin.`]);
      else if (d <= -20) tips.push(['good', `Pengeluaran turun ${-d}% dibanding periode sebelumnya. Kerja bagus!`]);
    }
    if (c.akhir > 0 && c.out > 0) tips.push(['good', `Saldo akhir Anda setara sekitar ${(c.akhir / c.out).toFixed(1)} kali pengeluaran periode ini. Idealnya dana darurat setara 3–6 bulan pengeluaran.`]);
    if (c.akhir < 0) tips.push(['warn', `Saldo akhir negatif (${rp(c.akhir)}). Periksa apakah ada pemasukan yang belum tercatat.`]);
  }
  if (!data.recur.length) tips.push(['', 'Tambahkan tagihan rutin seperti listrik, wifi, atau kos di Transaksi → Transaksi Berulang agar tercatat otomatis.']);
  tips.push(['', 'Acuan 50/30/20: 50% untuk kebutuhan, 30% untuk keinginan, dan 20% untuk tabungan atau cadangan.']);
  tips.push(['', 'Catat juga pengeluaran kecil. Jajan harian terasa ringan, tetapi jumlahnya besar dalam sebulan.']);
  $('#nasBody').innerHTML = `<h3 style="margin:0 0 10px">Nasihat Keuangan</h3>` +
    tips.map(([k,t]) => `<div class="card advice ${k}"><p>${t}</p></div>`).join('');
}

function render(){
  document.querySelectorAll('.lbl').forEach(el => {
    el.textContent = mode === 'mingguan'
      ? (() => { const [s,e] = weekRange(anchor); return `${fmtD(s)} – ${fmtD(e)}`; })()
      : anchor.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  });
  renderTrx(); renderLap(); renderNas();
}

/* ---------- Form: tambah & edit ---------- */
function setType(t){
  type = t;
  $('#bIn').classList.toggle('on', t==='in');
  $('#bOut').classList.toggle('on', t==='out');
  fillCats($('#cat'), t);
  catTouched = false;
  autoCat();
}
function autoCat(){
  if (catTouched) return;
  const s = suggestCat($('#desc').value);
  if (s && (type==='in' ? INC : EXP).includes(s)) $('#cat').value = s;
}
function resetForm(){
  editId = null;
  $('#amt').value = ''; $('#desc').value = '';
  $('#date').value = iso(new Date());
  $('#formTitle').textContent = 'Catat Transaksi';
  $('#save').textContent = 'Simpan';
  $('#cancel').classList.add('hide');
  $('#formCard').classList.remove('editing');
  setType('out');
}
function startEdit(id){
  const t = data.tx.find(x => x.id === id);
  if (!t) return;
  showPage('pTrx');
  editId = id;
  setType(t.type);
  $('#amt').value = t.amount;
  $('#desc').value = t.desc;
  fillCats($('#cat'), t.type);
  $('#cat').value = t.cat;
  catTouched = true;
  $('#date').value = t.date;
  $('#formTitle').textContent = 'Edit Transaksi';
  $('#save').textContent = 'Perbarui';
  $('#cancel').classList.remove('hide');
  $('#formCard').classList.add('editing');
  window.scrollTo({top:0, behavior:'smooth'});
}
function showPage(p){
  document.querySelectorAll('[data-page]').forEach(x => x.classList.toggle('on', x.dataset.page === p));
  document.querySelectorAll('.page').forEach(s => s.classList.toggle('hide', s.id !== p));
}

$('#bIn').onclick = () => setType('in');
$('#bOut').onclick = () => setType('out');
$('#desc').oninput = autoCat;
$('#cat').onchange = () => catTouched = true;
$('#cancel').onclick = resetForm;

$('#save').onclick = () => {
  const amount = num($('#amt').value);
  if (!amount) { alert('Isi jumlah dulu ya.'); return; }
  const desc = $('#desc').value.trim() || (type==='in' ? 'Pemasukan' : 'Pengeluaran');
  const date = $('#date').value || iso(new Date());
  const cat = $('#cat').value;
  if (editId) {
    const t = data.tx.find(x => x.id === editId);
    if (t) Object.assign(t, {type, amount, desc, cat, date});
  } else {
    data.tx.push({id:uid(), type, amount, desc, cat, date});
  }
  save();
  anchor = parseISO(date);
  resetForm();
  render();
};

document.body.addEventListener('click', e => {
  const d = e.target.dataset;
  if (d.edit) startEdit(d.edit);
  if (d.tx && confirm('Hapus transaksi ini?')) {
    data.tx = data.tx.filter(t => t.id !== d.tx);
    if (editId === d.tx) resetForm();
    save(); render();
  }
  if (d.rec && confirm('Hapus transaksi berulang ini? Riwayat yang sudah tercatat tetap ada.')) {
    data.recur = data.recur.filter(r => r.id !== d.rec); save(); render();
  }
});

/* ---------- Navigasi ---------- */
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
  mode = b.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b));
  render();
});
document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { showPage(b.dataset.page); render(); });
document.querySelectorAll('.prev').forEach(b => b.onclick = () => { shift(-1); render(); });
document.querySelectorAll('.next').forEach(b => b.onclick = () => { shift(1); render(); });

/* ---------- Transaksi berulang ---------- */
$('#rType').onchange = () => fillCats($('#rCat'), $('#rType').value);
$('#rSave').onclick = () => {
  const amount = num($('#rAmt').value);
  const day = Math.min(31, Math.max(1, num($('#rDay').value) || 1));
  const desc = $('#rDesc').value.trim() || 'Berulang';
  if (!amount) { alert('Isi jumlah dulu ya.'); return; }
  const now = new Date();
  data.recur.push({id:uid(), type:$('#rType').value, amount, desc, cat:$('#rCat').value, day,
    start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), applied: []});
  applyRecurring(); save();
  $('#rAmt').value = ''; $('#rDesc').value = ''; $('#rDay').value = '';
  render();
};

/* ---------- Laporan ---------- */
$('#pdf').onclick = () => { renderLap(); window.print(); };
$('#copy').onclick = async () => {
  const txt = reportText(calc());
  try { await navigator.clipboard.writeText(txt); alert('Laporan disalin. Tempel di Excel atau Google Sheets.'); }
  catch(e) { const box = $('#repTxt'); box.value = txt; box.classList.remove('hide'); box.select(); }
};

/* ---------- Mode offline (PWA) ---------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

/* ---------- Init ---------- */
$('#date').value = iso(new Date());
fillCats($('#cat'), 'out');
fillCats($('#rCat'), 'out');
applyRecurring();
render();
