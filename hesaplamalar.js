/**
 * ============================================================
 * PARALEGAL DANIŞMANLIK — Hesaplama Araçları (arayüz)
 * Hesap motoru: hesap-core.js (HesapCore)
 * ============================================================
 */
(function () {
  'use strict';
  const C = window.HesapCore;
  const root = document.getElementById('calc-app');
  if (!C || !root) return;
  const P = C.P;

  /* ------------------------------------------------------------
     BİÇİMLENDİRME
     ------------------------------------------------------------ */
  const nfTL = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfN = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tl = n => nfTL.format(C.r2(n)).replace(/ /g, ' ');
  const pct = (n, d) => '%' + n.toLocaleString('tr-TR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const trDate = s => { const d = C.parseDate(s); return d ? d.getUTCDate().toString().padStart(2, '0') + '.' + (d.getUTCMonth() + 1).toString().padStart(2, '0') + '.' + d.getUTCFullYear() : ''; };

  /** "1.234.567,89" → 1234567.89 */
  function parseMoney(str) {
    if (str == null) return 0;
    let s = String(str).trim().replace(/\s/g, '').replace(/₺|TL/gi, '');
    if (!s) return 0;
    if (s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace('.', '');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  const AYLAR = C.AYLAR;
  const ayOpts = AYLAR.map((a, i) => [String(i + 1), a]);

  /* ------------------------------------------------------------
     SVG İKONLAR
     ------------------------------------------------------------ */
  const ic = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICONS = {
    isci:   ic('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18"/>'),
    net:    ic('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h3M13 12h3M8 16h3M13 16h3"/>'),
    vekalet:ic('<path d="M12 3v18M5 7h14M5 7l-3 7a3.5 3.5 0 007 0L6 7m13 0l-3 7a3.5 3.5 0 007 0l-3-7"/>'),
    arab:   ic('<path d="M7 11l5-5 5 5M12 6v13M5 19h14"/><path d="M3 11l4 0M17 11l4 0"/>'),
    kira:   ic('<path d="M3 11l9-8 9 8M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    icra:   ic('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
    smm:    ic('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>')
  };

  /* ------------------------------------------------------------
     HESAPLAYICI TANIMLARI
     ------------------------------------------------------------ */
  const CALCS = [];
  const lbl = (txt) => txt;

  const kv = (l, v, cls) => ({ l, v, cls: cls || '' });

  /* ======================= 1) İŞÇİLİK ALACAĞI ======================= */
  CALCS.push({
    id: 'iscilik-alacagi',
    kisa: 'İşçilik Alacağı',
    baslik: 'İşçilik Alacağı Hesaplama',
    ikon: 'isci',
    aciklama: 'Kıdem, ihbar tazminatı, fazla mesai, hafta tatili, UBGT ve yıllık izin ücretini brüt ve net olarak hesaplayın.',
    alanlar: [
      { grup: 'Çalışma bilgileri' },
      { id: 'giris', t: 'date', label: 'İşe giriş tarihi', def: '' },
      { id: 'cikis', t: 'date', label: 'İşten çıkış tarihi', def: '' },
      { id: 'brut', t: 'money', label: 'Aylık brüt ücret (çıplak)', def: '', suffix: '₺' },
      { id: 'yan', t: 'money', label: 'Aylık düzenli yan haklar (yemek, yol, prim vb.)', opt: true, def: '', suffix: '₺', help: 'Giydirilmiş ücret = brüt ücret + düzenli ve sürekli yan haklar (aylık karşılığı).' },
      { id: 'fesih', t: 'select', label: 'Fesih şekli', def: 'isveren_haksiz', opts: [
        ['isveren_haksiz', 'İşveren feshi — haksız / bildirimsiz fesih'],
        ['isveren_bildirimli', 'İşveren feshi — bildirim süresine uyularak'],
        ['isci_haksli', 'İşçinin haklı nedenle feshi (İş K. m.24)'],
        ['emeklilik', 'Emeklilik / askerlik / kadın işçinin evlenmesi / ölüm'],
        ['istifa', 'İşçinin istifası (haklı neden yok)'],
        ['isveren_haksli', 'İşverenin haklı nedenle feshi (İş K. m.25/II)']
      ] },
      { grup: 'Hesaplanacak alacaklar' },
      { id: 'kidem', t: 'check', label: 'Kıdem tazminatı', def: true },
      { id: 'ihbar', t: 'check', label: 'İhbar tazminatı', def: true },
      { id: 'fm', t: 'check', label: 'Fazla mesai ücreti', def: false },
      { id: 'ht', t: 'check', label: 'Hafta tatili çalışma ücreti', def: false },
      { id: 'ubgt', t: 'check', label: 'UBGT (bayram/genel tatil) çalışma ücreti', def: false },
      { id: 'izin', t: 'check', label: 'Kullanılmayan yıllık izin ücreti', def: false },
      { id: 'haftalikSozlesme', t: 'money', label: 'Sözleşmedeki haftalık normal çalışma süresi', def: '45', suffix: 'saat', showIf: v => v.fm },
      { id: 'haftalikGercek', t: 'money', label: 'Haftalık gerçek çalışma süresi', def: '', suffix: 'saat', showIf: v => v.fm },
      { id: 'haftaSayisi', t: 'money', label: 'Aynı düzende çalışılan hafta sayısı', def: '', suffix: 'hafta', showIf: v => v.fm },
      { id: 'htGun', t: 'money', label: 'Hafta tatilinde çalışılan toplam gün', def: '', suffix: 'gün', showIf: v => v.ht },
      { id: 'ubgtGun', t: 'money', label: 'UBGT günlerinde çalışılan toplam gün', def: '', suffix: 'gün', showIf: v => v.ubgt },
      { id: 'izinGun', t: 'money', label: 'Kullanılmayan yıllık izin günü', def: '', suffix: 'gün', showIf: v => v.izin },
      { id: 'hakkaniyet', t: 'money', label: 'Hakkaniyet indirimi', opt: true, def: '0', suffix: '%', showIf: v => v.fm || v.ht || v.ubgt, help: 'Fazla çalışma, hafta tatili ve UBGT alacaklarında delil durumuna göre mahkemece takdir edilir (çoğunlukla %0–%30).' },
      { grup: 'Net hesap ayarları (isteğe bağlı)', gizliGrup: true },
      { id: 'odemeAy', t: 'select', label: 'Ödemenin yapılacağı ay', def: '', opts: [['', 'Çıkış ayı']].concat(ayOpts), gelismis: true },
      { id: 'kum', t: 'money', label: 'Yıl içi önceki aylar kümülatif gelir vergisi matrahı', opt: true, def: '0', suffix: '₺', gelismis: true, help: 'Bilinmiyorsa 0 bırakın; vergi, yılın ilk matrahı gibi hesaplanır.' },
      { id: 'istisnaKullanildi', t: 'check', label: 'Bu ay asgari ücret GV/damga istisnası zaten kullanıldı', def: true, gelismis: true },
      { id: 'pekKazanc', t: 'money', label: 'Aynı ay önceki SGK prime esas kazanç', opt: true, def: '0', suffix: '₺', gelismis: true }
    ],
    hesapla(v) {
      const r = C.iscilik(v);
      if (r.hata) return { hata: r.hata };
      if (!r.kalemler.length) return { hata: 'Hesaplanacak en az bir alacak kalemi seçiniz ve gerekli alanları doldurunuz.' };
      const tbl = { baslik: 'Alacak kalemleri', head: ['Kalem', 'Brüt', 'Kesintiler', 'Net'], rows: [], foot: ['Toplam', tl(r.toplamBrut), tl(r.toplamBrut - r.toplamNet), tl(r.toplamNet)] };
      const detay = [];
      r.kalemler.forEach(k => {
        const kes = Object.values(k.kesinti || {}).reduce((a, b) => a + b, 0);
        tbl.rows.push([k.ad, tl(k.brut), tl(kes), tl(k.net)]);
        const parcalar = [];
        if (k.kesinti) {
          if (k.kesinti.sgk) parcalar.push('SGK+işsizlik ' + tl(k.kesinti.sgk));
          if (k.kesinti.gv) parcalar.push('gelir vergisi ' + tl(k.kesinti.gv));
          if (k.kesinti.damga) parcalar.push('damga vergisi ' + tl(k.kesinti.damga));
        }
        detay.push(kv(k.ad, k.aciklama + (parcalar.length ? ' · Kesintiler: ' + parcalar.join(', ') : ''), 'muted stack'));
      });
      const kidemK = r.kalemler.find(k => k.id === 'kidem');
      const notlar = [
        'Çalışma süresi: ' + r.hizmet.y + ' yıl ' + r.hizmet.m + ' ay ' + r.hizmet.d + ' gün. Giydirilmiş aylık brüt ücret: ' + tl(r.giydirilmis) + ' (günlük ' + tl(r.gunluk) + ').',
        'Kıdem tazminatından yalnızca damga vergisi (binde 7,59) kesilir; tavan tutarı ' + (kidemK && kidemK.tavan ? tl(kidemK.tavan) + ' (' + trDate(kidemK.tavanDonem) + ' tarihinden itibaren geçerli dönem tavanı)' : '') + '. Tavan, fesih tarihindeki dönem tavanıdır.',
        'İhbar tazminatından SGK kesilmez; gelir vergisi ve damga vergisi kesilir. Bildirim süreleri: 6 aya kadar 2 hafta, 6 ay–1,5 yıl 4 hafta, 1,5–3 yıl 6 hafta, 3 yıldan fazla 8 hafta (İş K. m.17).',
        'Fazla mesai saat ücreti, giydirilmiş ücretin 225’e bölünmesiyle (haftalık 45 saat için) bulunur; 45 saate kadar olan fazla sürelerle çalışma %25, 45 saati aşan fazla çalışma %50 zamlıdır. Hafta tatilinde çalışma 1,5 günlük ücret, UBGT’de çalışma ayrıca 1 günlük ücret olarak hesaplanır.',
        'Zamanaşımı: işçilik alacaklarında genel olarak 5 yıldır; fazla mesai alacağında delil, tanık ve hakkaniyet indirimi sonucu etkiler.'
      ];
      return {
        baslik: { l: 'Toplam net alacak', v: tl(r.toplamNet), alt: 'Toplam brüt: ' + tl(r.toplamBrut) },
        bolumler: [{ baslik: 'Hesap dayanakları', satirlar: detay }],
        tablolar: [tbl],
        uyarilar: r.uyarilar,
        notlar,
        kopya: 'İşçilik alacağı hesabı — Toplam brüt ' + tl(r.toplamBrut) + ', net ' + tl(r.toplamNet)
      };
    }
  });

  /* ======================= 2) BRÜTTEN NETE ======================= */
  CALCS.push({
    id: 'brutten-nete',
    kisa: 'Brütten Nete',
    baslik: 'Brütten Nete / Netten Brüte Maaş Hesaplama',
    ikon: 'net',
    aciklama: '2026 SGK, gelir vergisi dilimleri, damga vergisi ve asgari ücret istisnasıyla aylık maaşınızı hesaplayın.',
    alanlar: [
      { id: 'mod', t: 'select', label: 'Hesap yönü', def: 'brut', opts: [['brut', 'Brütten nete'], ['net', 'Netten brüte']] },
      { id: 'tutar', t: 'money', label: 'Aylık tutar', def: '', suffix: '₺' },
      { id: 'ay', t: 'select', label: 'Hesaplanacak ay', def: '1', opts: ayOpts, help: 'Önceki aylarda aynı brüt ücret ödendiği varsayılır (kümülatif gelir vergisi matrahı).' }
    ],
    hesapla(v) {
      const tutar = v.tutar;
      if (!(tutar > 0)) return { hata: 'Aylık tutarı giriniz.' };
      const ay = parseInt(v.ay, 10) || 1;
      const brut = v.mod === 'net' ? C.netdenBrute(tutar, ay) : tutar;
      const tablo = C.maasYillik(brut, 1, 0);
      const h = tablo[ay - 1];
      const rows = tablo.map(m => [AYLAR[m.ay - 1], tl(m.brut), tl(m.sgk + m.issizlik), tl(m.gv), tl(m.damga), tl(m.net), tl(m.kum)]);
      const topNet = tablo.reduce((t, m) => t + m.net, 0);
      const topBrut = brut * 12;
      const uy = [];
      if (brut > P.pekTavan) uy.push('Brüt ücret SGK prime esas kazanç üst sınırını (' + tl(P.pekTavan) + ') aşıyor; SGK ve işsizlik primi bu sınırdan hesaplanmıştır.');
      if (brut < P.asgariUcretBrut) uy.push('Girilen brüt tutar 2026 brüt asgari ücretin (' + tl(P.asgariUcretBrut) + ') altındadır.');
      return {
        baslik: { l: AYLAR[ay - 1] + ' ayı ' + (v.mod === 'net' ? 'brüt ücret' : 'net maaş'), v: tl(v.mod === 'net' ? brut : h.net), alt: v.mod === 'net' ? 'Hedef net: ' + tl(tutar) : 'Brüt: ' + tl(brut) },
        bolumler: [{
          baslik: AYLAR[ay - 1] + ' ayı dökümü',
          satirlar: [
            kv('Brüt ücret', tl(h.brut)),
            kv('SGK işçi payı (%14)', '− ' + tl(h.sgk), 'neg'),
            kv('İşsizlik sigortası işçi payı (%1)', '− ' + tl(h.issizlik), 'neg'),
            kv('Gelir vergisi matrahı', tl(h.gvMatrah), 'muted'),
            kv('Gelir vergisi (kümülatif tarife)', '− ' + tl(h.gvHam), 'neg'),
            kv('Asgari ücret gelir vergisi istisnası', '+ ' + tl(h.gvIst), 'pos'),
            kv('Damga vergisi (binde 7,59)', '− ' + tl(h.damgaHam), 'neg'),
            kv('Asgari ücret damga vergisi istisnası', '+ ' + tl(h.damgaIst), 'pos'),
            kv('Net maaş', tl(h.net), 'total')
          ]
        }, {
          baslik: 'Yıllık özet (12 ay aynı brüt)',
          satirlar: [kv('Yıllık brüt', tl(topBrut)), kv('Yıllık net', tl(topNet), 'total'), kv('Ortalama aylık net', tl(topNet / 12))]
        }],
        tablolar: [{ baslik: 'Aylık döküm — 2026', head: ['Ay', 'Brüt', 'SGK + İşsizlik', 'Gelir vergisi', 'Damga', 'Net', 'Küm. matrah'], rows }],
        uyarilar: uy,
        notlar: [
          '2026 parametreleri: brüt asgari ücret ' + tl(P.asgariUcretBrut) + ', SGK tavanı ' + tl(P.pekTavan) + '. Gelir vergisi (ücret) dilimleri: 190.000 ₺ %15, 400.000 ₺ %20, 1.500.000 ₺ %27, 5.300.000 ₺ %35, üzeri %40.',
          'Asgari ücret gelir vergisi istisnası aylık dilimlere göre değişir (Ocak–Haziran 4.211,33 ₺; Temmuz 4.537,75 ₺; Ağustos–Aralık 5.615,10 ₺). Damga vergisi istisnası asgari ücretin damga vergisiyle sınırlıdır (' + tl(C.damgaIstisna()) + ').',
          'İşveren maliyeti, teşvikler, ek ödemeler ve özel sigorta kesintileri dahil değildir.'
        ],
        kopya: 'Brütten nete hesabı — Brüt ' + tl(brut) + ', ' + AYLAR[ay - 1] + ' net ' + tl(h.net)
      };
    }
  });

  /* ======================= 3) VEKÂLET ÜCRETİ ======================= */
  CALCS.push({
    id: 'vekalet-ucreti',
    kisa: 'Vekâlet Ücreti',
    baslik: 'Vekâlet Ücreti Hesaplama (AAÜT 2025-2026)',
    ikon: 'vekalet',
    aciklama: 'Avukatlık Asgari Ücret Tarifesi’ne göre yargılama, icra ve dava dışı hukuki yardım ücretini hesaplayın.',
    alanlar: [
      { id: 'amac', t: 'select', label: 'Hesaplama amacı', def: 'karsi', opts: [
        ['karsi', 'Karşı tarafa yüklenecek vekâlet ücreti'],
        ['akdi', 'Avukat–müvekkil arası asgari akdi ücret']
      ] },
      { id: 'islem', t: 'select', label: 'İşlem türü', def: 'dava', opts: [
        ['dava', 'Dava / yargılama (mahkeme)'],
        ['icra', 'İcra takibi'],
        ['davadisi', 'Dava dışı hukuki yardım']
      ] },
      { id: 'mahkeme', t: 'select', label: 'Mahkeme', def: 'asliye', showIf: v => v.islem === 'dava', opts: Object.keys(P.aaut.mahkeme).map(k => [k, P.aaut.mahkeme[k].ad + ' — ' + tl(P.aaut.mahkeme[k].maktu)]) },
      { id: 'konu', t: 'select', label: 'Uyuşmazlık konusu', def: 'nispi', showIf: v => v.islem === 'dava', opts: [
        ['nispi', 'Para ile ölçülebilen (nispi tarife)'],
        ['maktu', 'Para ile ölçülemeyen (maktu ücret)']
      ] },
      { id: 'asama', t: 'select', label: 'Dosya sonucu / aşaması', def: 'tam', showIf: v => v.islem === 'dava', opts: [
        ['tam', 'Normal — tam ücret'],
        ['yarim', 'Ön inceleme tutanağı imzalanmadan feragat / kabul / sulh (ücretin yarısı)']
      ] },
      { id: 'tutar', t: 'money', label: 'Dava değeri / kabul edilen tutar', def: '', suffix: '₺', showIf: v => v.islem === 'dava' && v.konu === 'nispi' },
      { id: 'redTutar', t: 'money', label: 'Reddedilen tutar (kısmi kabul/ret varsa)', opt: true, def: '', suffix: '₺', showIf: v => v.islem === 'dava' && v.konu === 'nispi', help: 'Kabul ve ret kısımları ayrı matrah olarak hesaplanır.' },
      { id: 'icraTur', t: 'select', label: 'İcra takibi türü', def: 'para', showIf: v => v.islem === 'icra', opts: [
        ['para', 'İcra dairesi — para alacağı takibi'],
        ['dairedigeri', 'İcra dairesi — para dışı takip'],
        ['tahliye', 'Tahliyeye ilişkin icra takibi'],
        ['icraMahkemesiTakip', 'İcra mahkemesinde takip edilen iş']
      ] },
      { id: 'icraTutar', t: 'money', label: 'Asıl alacak', def: '', suffix: '₺', showIf: v => v.islem === 'icra' && v.icraTur === 'para', help: 'İcra dairelerinde ücret asıl alacağı geçemez.' },
      { id: 'odemeSuresinde', t: 'check', label: 'Borçlu ödeme süresi içinde ödedi (ücretin 3/4’ü)', def: false, showIf: v => v.islem === 'icra' },
      { id: 'davaDisiKalem', t: 'select', label: 'Hizmet kalemi', def: 'dilekce', showIf: v => v.islem === 'davadisi', opts: Object.keys(P.aaut.davaDisi).map(k => [k, P.aaut.davaDisi[k].ad + ' — ' + tl(P.aaut.davaDisi[k].tutar)]) },
      { id: 'adet', t: 'money', label: 'Adet', def: '1', showIf: v => v.islem === 'davadisi' }
    ],
    hesapla(v) {
      const inp = Object.assign({}, v, { tutar: v.islem === 'icra' ? v.icraTutar : v.tutar });
      const r = C.vekalet(inp);
      if (r.hata) return { hata: r.hata };
      const satirlar = [];
      const tablolar = [];
      if (r.tip === 'nispi') {
        r.parcalar.forEach(p => {
          satirlar.push(kv(p.etiket + ' (matrah)', tl(p.matrah)));
          satirlar.push(kv('Nispi tarife sonucu', tl(p.nispi)));
          if (p.dipnot) satirlar.push(kv('Uygulanan', tl(p.uygulanan) + ' — ' + p.dipnot, 'muted'));
          tablolar.push({ baslik: p.etiket + ' — dilim dökümü', head: ['Dilim tutarı', 'Oran', 'Ücret'], rows: p.satirlar.map(s => [tl(s.dilim), pct(s.oran * 100, 0), tl(s.ucret)]), foot: ['Toplam', '', tl(p.nispi)] });
        });
        if (r.carpan === 0.5) satirlar.push(kv('Ön inceleme tutanağı imzalanmadan sona erme', '× 0,5', 'muted'));
      } else {
        r.satirlar.forEach(s => satirlar.push(kv(s.ad, s.tutar != null ? tl(s.tutar) + (s.adet && s.adet > 1 ? ' × ' + s.adet : '') : s.metin)));
      }
      const notlar = [
        'Tutarlar KDV ve stopaj hariçtir; sonuca otomatik eklenmemiştir.',
        'Tarife: 2025-2026 AAÜT (Resmî Gazete 04.11.2025, 33067) ve sonraki değişiklikler. Nispi tarife kademelidir; sonuç mahkemenin maktu alt sınırından düşük olamaz ve kabul/ret edilen tutarı aşamaz.'
      ];
      if (v.amac === 'karsi') notlar.push('Karşı tarafa yüklenecek ücret tarifedeki tutardan az, tarifedeki tutarın üç katından fazla olamaz; bu aralıkta mahkemece takdir edilir' + (r.toplam ? ' (üst sınır ≈ ' + tl(r.toplam * 3) + ').' : '.'));
      else notlar.push('Avukat ile müvekkil arasında kararlaştırılacak akdi ücret tarifedeki tutardan az olamaz; üst sınır serbestçe belirlenir (Av. K. m.164).');
      return {
        baslik: { l: v.amac === 'karsi' ? 'Karşı taraf vekâlet ücreti' : 'Asgari akdi ücret', v: tl(r.toplam), alt: r.mahkeme || '' },
        bolumler: [{ baslik: 'Hesap özeti', satirlar }],
        tablolar,
        uyarilar: r.uyarilar,
        notlar,
        kopya: 'Vekâlet ücreti (AAÜT 2026): ' + tl(r.toplam)
      };
    }
  });

  /* ======================= 4) ARABULUCULUK ======================= */
  CALCS.push({
    id: 'arabuluculuk-ucreti',
    kisa: 'Arabuluculuk Ücreti',
    baslik: 'Arabuluculuk Ücreti Hesaplama (2026 Tarifesi)',
    ikon: 'arab',
    aciklama: '2026 Arabuluculuk Asgari Ücret Tarifesi’ne göre anlaşma veya anlaşamama halinde arabulucu ücretini hesaplayın.',
    alanlar: [
      { id: 'surec', t: 'select', label: 'Arabuluculuk türü', def: 'dava', opts: [['dava', 'Dava şartı arabuluculuk'], ['ihtiyari', 'İhtiyari arabuluculuk']] },
      { id: 'sonuc', t: 'select', label: 'Sonuç', def: 'anlasma', opts: [['anlasma', 'Anlaşma sağlandı'], ['anlasamama', 'Anlaşma sağlanamadı (görüşme yapıldı)']] },
      { id: 'uyusmazlik', t: 'select', label: 'Uyuşmazlık türü', def: 'isci', opts: [
        ['isci', 'İşçi–işveren'], ['ticari', 'Ticari'], ['tuketici', 'Tüketici'], ['aile', 'Aile hukuku'],
        ['kira', 'Kira / komşuluk / kat mülkiyeti'], ['ortaklik', 'Ortaklığın giderilmesi'], ['diger', 'Diğer']
      ] },
      { id: 'taraf', t: 'money', label: 'Taraf (kişi) sayısı', def: '2' },
      { id: 'arabulucu', t: 'money', label: 'Arabulucu sayısı', def: '1', showIf: v => v.sonuc === 'anlasma' && v.paraKonusu !== 'hayir' },
      { id: 'paraKonusu', t: 'select', label: 'Uyuşmazlığın konusu', def: 'evet', showIf: v => v.sonuc === 'anlasma', opts: [['evet', 'Para (veya parayla ölçülebilir)'], ['hayir', 'Para konusu değil (ör. işe iade hariç, boşanma, ortak yaşam vb.)']] },
      { id: 'matrahTur', t: 'select', label: 'Matrah türü', def: 'dogrudan', showIf: v => v.sonuc === 'anlasma' && v.paraKonusu !== 'hayir', opts: [
        ['dogrudan', 'Anlaşma bedeli'],
        ['tahliye', 'Tahliye — bir yıllık kira bedeli (yarısı esas alınır)'],
        ['kiratespit', 'Kira tespiti — bir yıllık kira farkı']
      ] },
      { id: 'bedel', t: 'money', label: 'Anlaşma bedeli / matrah', def: '', suffix: '₺', showIf: v => v.sonuc === 'anlasma' && v.paraKonusu !== 'hayir' },
      { id: 'saat', t: 'money', label: 'Toplam görüşme süresi', def: '2', suffix: 'saat', showIf: v => v.sonuc === 'anlasamama' || v.paraKonusu === 'hayir' }
    ],
    hesapla(v) {
      const r = C.arabuluculuk(v);
      if (r.hata) return { hata: r.hata };
      const satirlar = [], tablolar = [];
      if (r.dilimler) {
        tablolar.push({ baslik: 'İkinci Kısım — dilim dökümü', head: ['Dilim tutarı', 'Oran', 'Ücret'], rows: r.dilimler.map(d => [tl(d.kisim), pct(d.oran, 1), tl(d.ucret)]), foot: ['Hesaplanan', '', tl(r.hesaplanan)] });
        satirlar.push(kv('Tarifeye göre hesaplanan', tl(r.hesaplanan)));
        satirlar.push(kv('Asgari ücret (taban)', tl(r.taban), 'muted'));
      }
      (r.satirlar || []).forEach(s => satirlar.push(kv(s.ad, s.tutar != null ? tl(s.tutar) : s.metin, 'muted')));
      satirlar.push(kv('Toplam arabuluculuk ücreti', tl(r.toplam), 'total'));
      if (r.butce != null) {
        satirlar.push(kv('Adalet Bakanlığı bütçesinden karşılanan (ilk 2 saat)', tl(r.butce), 'pos'));
        satirlar.push(kv('Taraflarca ödenecek kısım', tl(r.kalanToplam), ''));
        if (r.kalanToplam > 0) satirlar.push(kv('Taraf başına (eşit paylaşım)', tl(r.tarafPayi)));
      } else {
        satirlar.push(kv('Taraf başına (eşit paylaşım)', tl(r.tarafPayi)));
      }
      return {
        baslik: { l: 'Arabuluculuk ücreti', v: tl(r.toplam), alt: r.kisim },
        bolumler: [{ baslik: 'Hesap özeti', satirlar }],
        tablolar,
        uyarilar: r.uyarilar,
        notlar: [
          'Tarife: 2026 Arabuluculuk Asgari Ücret Tarifesi (RG 26.12.2025, 33119), 01.01.2026’dan itibaren geçerlidir. Taraflar tarifenin altında ücret kararlaştıramaz.',
          'Anlaşma halinde ücret 9.000 ₺’den, ticari uyuşmazlık ve ortaklığın giderilmesinde 13.000 ₺’den az olamaz.',
          'Ücret tarafların aksine bir anlaşması yoksa eşit paylaşılır. Dava şartı arabuluculukta anlaşamama halinde ilk iki saatlik ücret Adalet Bakanlığı bütçesinden karşılanır.',
          'Sonuç yaklaşıktır; özel hükümler (işe iade, seri uyuşmazlık, çoklu arabulucu vb.) ve fiili masraflar sonucu değiştirebilir.'
        ],
        kopya: 'Arabuluculuk ücreti (2026 tarifesi): ' + tl(r.toplam)
      };
    }
  });

  /* ======================= 5) KİRA ARTIŞI ======================= */
  CALCS.push({
    id: 'kira-artis',
    kisa: 'Kira Artış Oranı',
    baslik: 'Kira Artış Oranı Hesaplama',
    ikon: 'kira',
    aciklama: 'TÜFE 12 aylık ortalama oranına göre, kira yenileme tarihinizde uygulanabilecek en yüksek artışı hesaplayın.',
    alanlar: [
      { id: 'kira', t: 'money', label: 'Mevcut aylık kira bedeli', def: '', suffix: '₺' },
      { id: 'tarih', t: 'date', label: 'Kira yenileme tarihi', def: today() },
      { id: 'tur', t: 'select', label: 'Kiralanan türü', def: 'konut', opts: [['konut', 'Konut'], ['isyeri', 'Çatılı iş yeri']] },
      { id: 'sozlesmeOrani', t: 'money', label: 'Sözleşmede yazan artış oranı', opt: true, def: '', suffix: '%', help: 'Varsa girin; yasal sınırla karşılaştırılır.' }
    ],
    hesapla(v) {
      const r = C.kiraArtis(v);
      if (r.hata) return { hata: r.hata };
      const satirlar = [
        kv('Esas alınan TÜFE 12 aylık ortalama (' + r.veriAy + ')', pct(r.tufeOrani)),
        kv('Yasal üst sınır', pct(r.yasalTavan), r.sinirUygulandi ? 'pos' : ''),
        kv('Uygulanacak artış oranı', pct(r.uygulanan), 'total'),
        kv('Mevcut kira', tl(v.kira)),
        kv('Artış tutarı (aylık)', '+ ' + tl(r.artis), 'pos'),
        kv('Yeni aylık kira', tl(r.yeniKira), 'total'),
        kv('Yıllık ilave yük', tl(r.yillikArtis), 'muted')
      ];
      const son = Object.keys(P.tufe12).sort().slice(-12).reverse();
      const tabloRows = son.map(k => { const [y, m] = k.split('-'); return [AYLAR[parseInt(m, 10) - 1] + ' ' + y, pct(P.tufe12[k]), 'Ayın ' + (parseInt(m, 10) === 12 ? 'Ocak' : AYLAR[parseInt(m, 10)]) + ' yenilemeleri']; });
      return {
        baslik: { l: 'En fazla uygulanabilecek yeni kira', v: tl(r.yeniKira), alt: 'Artış oranı ' + pct(r.uygulanan) },
        bolumler: [{ baslik: 'Hesap özeti', satirlar }],
        tablolar: [{ baslik: 'Son 12 dönem TÜFE 12 aylık ortalama oranı (TÜİK)', head: ['Veri dönemi', 'Oran', 'Hangi yenilemelerde kullanılır'], rows: tabloRows.map(r2 => [r2[0], r2[1], r2[2].replace('Ayın ', '')]) }],
        uyarilar: r.uyarilar,
        notlar: [
          'Kira artışında yenileme tarihinden bir önceki ay için TÜİK’in açıkladığı TÜFE 12 aylık ortalamalara göre değişim oranı esas alınır (TBK m.344). Yıllık TÜFE değişimi kullanılmaz.',
          'Veri kaynağı: TÜİK. Son güncelleme: ' + P.guncelleme + ' (son açıklanan veri: Eylül 2026).',
          'Mahkemece kira tespiti, yabancı para cinsinden kira ve özel sözleşme hükümleri ayrıca değerlendirilmelidir.'
        ],
        kopya: 'Kira artışı: ' + pct(r.uygulanan) + ' → yeni kira ' + tl(r.yeniKira)
      };
    }
  });

  /* ======================= 6) İCRA MASRAFI ======================= */
  CALCS.push({
    id: 'icra-masrafi',
    kisa: 'İcra Masrafı',
    baslik: 'İcra Masrafı ve Kapak Hesabı (2026)',
    ikon: 'icra',
    aciklama: 'Takip açılış masrafları, harçlar, tahsil harcı, vekâlet ücreti ve borçlu kapak hesabını tahmini olarak hesaplayın.',
    alanlar: [
      { grup: 'Takip ve alacak' },
      { id: 'asil', t: 'money', label: 'Asıl alacak', def: '', suffix: '₺' },
      { id: 'faizOrani', t: 'money', label: 'Yıllık faiz oranı', opt: true, def: '', suffix: '%', help: 'Sözleşme, yasal, avans veya ticari faiz oranınızı yazın. Basit faiz (gün/365) ile hesaplanır. Boş bırakılırsa faiz hesaplanmaz.' },
      { id: 'faizBas', t: 'date', label: 'Faiz başlangıç tarihi', opt: true, def: '', showIf: v => v.faizOrani > 0 },
      { id: 'takipTarihi', t: 'date', label: 'Takip tarihi', opt: true, def: '', showIf: v => v.faizOrani > 0, help: 'Peşin harç, takip tarihine kadar işlemiş faizle birlikte hesaplanır.' },
      { id: 'odemeTarihi', t: 'date', label: 'Ödeme / tahsil tarihi', opt: true, def: today(), showIf: v => v.faizOrani > 0 },
      { grup: 'Taraflar ve tebligat' },
      { id: 'borclu', t: 'money', label: 'Borçlu sayısı', def: '1' },
      { id: 'tebTur', t: 'select', label: 'Tebligat türü', def: 'normal', opts: [['normal', 'Normal'], ['mts', 'MTS'], ['hizli', 'Hızlı']] },
      { id: 'agirlik', t: 'money', label: 'Gönderi ağırlığı', def: '100', suffix: 'gr' },
      { id: 'tebAdet', t: 'money', label: 'Borçlu başına tebligat adedi', def: '1' },
      { id: 'tebUcreti', t: 'money', label: 'Tebligat birim ücreti (otomatik, değiştirilebilir)', opt: true, def: '', suffix: '₺', help: 'Boş bırakırsanız PTT tarifesi (KDV dahil) ağırlığa göre otomatik uygulanır. PTT tarifeleri değişebilir.' },
      { id: 'uets', t: 'check', label: 'UETS iletim ücreti ekle (gönderi başına 20 ₺)', def: false },
      { grup: 'Vekâlet ve aşama' },
      { id: 'avukat', t: 'check', label: 'Avukatlı takip', def: true },
      { id: 'odemeSuresinde', t: 'check', label: 'Borçlu ödeme süresi içinde ödüyor (vekâlet ücretinin 3/4’ü)', def: false, showIf: v => v.avukat },
      { id: 'tahliye', t: 'check', label: 'Tahliye takibi (maktu 20.000 ₺)', def: false, showIf: v => v.avukat },
      { id: 'asama', t: 'select', label: 'Ödeme / tahsil aşaması', def: 'haciz0', opts: Object.keys(P.icra.tahsilHarci).map(k => [k, P.icra.tahsilHarci[k].ad + ' — ' + pct(P.icra.tahsilHarci[k].oran * 100)]) },
      { id: 'harcVekaletDahil', t: 'check', label: 'Tahsil harcı matrahına vekâlet ücretini de dahil et', def: false, help: 'Uygulama icra müdürlüğüne göre farklılaşabilir; varsayılan olarak yalnızca asıl alacak + faiz esas alınır.' },
      { grup: 'Ek masraflar (isteğe bağlı)' },
      { id: 'hacizAdet', t: 'money', label: 'Haciz / teslim / satış işlemi adedi', opt: true, def: '0', help: 'Her işlem için 1.718,80 ₺ harç.' },
      { id: 'digerGider', t: 'money', label: 'Muhafaza, bilirkişi, sorgu vb. diğer giderler', opt: true, def: '', suffix: '₺' }
    ],
    hesapla(v) {
      const r = C.icraMasrafi(v);
      if (r.hata) return { hata: r.hata };
      const acilis = r.acilis.map(a => kv(a[0], tl(a[1])));
      acilis.push(kv('Alacaklı açılış avansı (toplam)', tl(r.acilisToplam), 'total'));
      const kapak = r.kapak.filter(k => k[1] !== 0 || k[0].indexOf('faiz') === -1).map(k => kv(k[0], tl(k[1])));
      kapak.push(kv('Borçlu kapak toplamı', tl(r.borcluToplam), 'total'));
      const net = [
        kv('Tahsil edilen (asıl + faiz + vekâlet ücreti)', tl(r.tahsilEdilen)),
        kv('Cezaevi yapı harcı (%2)', '− ' + tl(r.cezaevi), 'neg'),
        kv('Borçludan geri alınan açılış masrafları ve giderler', '+ ' + tl(r.alacakliGeriAlinan), 'pos'),
        kv('Alacaklı net tahsilat', tl(r.alacakliNet), 'total')
      ];
      return {
        baslik: { l: 'Borçlu kapak toplamı', v: tl(r.borcluToplam), alt: 'Alacaklı açılış avansı: ' + tl(r.acilisToplam) + ' · Alacaklı net: ' + tl(r.alacakliNet) },
        bolumler: [
          { baslik: 'Alacaklı açılış masrafları', satirlar: acilis },
          { baslik: 'Borçlu kapak hesabı', satirlar: kapak },
          { baslik: 'Alacaklı net tahsilatı', satirlar: net }
        ],
        uyarilar: r.uyarilar,
        notlar: [
          '2026 harçları: başvurma harcı ' + tl(P.icra.basvurmaHarci) + ', peşin harç binde 5, vekâletname suret harcı ' + tl(P.icra.vekaletSuret) + ', baro/vekâlet pulu ' + tl(P.icra.vekaletPulu) + ', haciz-teslim-satış harcı ' + tl(P.icra.hacizSatisHarci) + '. Tahsil harcı: ödeme emri sonrası hacizden önce %4,55, hacizden sonra %9,10, satış sonrası %11,38.',
          'Peşin harç, alacaklıdan takip açılırken alınır ve tahsil harcına mahsup edilir. Cezaevi yapı harcı borçluya yüklenemez; alacaklının tahsilatından kesilir.',
          'Vekâlet ücreti AAÜT’ye göre icra dairesi takiplerinde 9.000 ₺ maktu olup asıl alacağı geçemez; tahliye takiplerinde 20.000 ₺’dir. Borçlu ödeme süresinde öderse ücretin 3/4’ü hükmedilir.',
          'Bu araç tahmini sonuç verir. Kesin tutarlar UYAP kapak hesabı ve icra müdürlüğünün güncel hesabıyla belirlenir; haciz, satış, muhafaza ve faiz tarihleri sonucu değiştirir.'
        ],
        kopya: 'İcra masrafı: borçlu kapak ' + tl(r.borcluToplam) + ', alacaklı açılış avansı ' + tl(r.acilisToplam)
      };
    }
  });

  /* ======================= 7) SERBEST MESLEK MAKBUZU ======================= */
  CALCS.push({
    id: 'serbest-meslek-makbuzu',
    kisa: 'Serbest Meslek Makbuzu',
    baslik: 'Serbest Meslek Makbuzu (SMM) Hesaplama',
    ikon: 'smm',
    aciklama: 'KDV, stopaj ve KDV tevkifatını hesaplayın; brütten, netten veya tahsil edilecek tutardan makbuz tutarına ulaşın.',
    alanlar: [
      { id: 'mod', t: 'select', label: 'Hesap türü', def: 'brut', opts: [
        ['brut', 'Brütten hesapla (KDV hariç brüt ücret)'],
        ['net', 'Net ücretten brüte'],
        ['tahsil', 'Tahsil edilecek tutardan brüte'],
        ['kdvdahil', 'KDV dahil toplamdan brüte']
      ] },
      { id: 'tutar', t: 'money', label: 'Tutar', def: '', suffix: '₺' },
      { id: 'kdv', t: 'select', label: 'KDV oranı', def: '20', opts: [['20', '%20 (genel)'], ['10', '%10'], ['1', '%1'], ['0', '%0 (KDV yok)']] },
      { id: 'stopaj', t: 'select', label: 'Stopaj (gelir vergisi tevkifatı)', def: '20', opts: [['20', '%20 — alıcı stopaj yapıyor'], ['0', 'Stopaj yok (alıcı stopaj yapmıyor)']] },
      { id: 'tevkifat', t: 'select', label: 'KDV tevkifatı', def: 'yok', opts: [['yok', 'Uygulanmıyor'], ['2/10', '2/10'], ['5/10', '5/10'], ['7/10', '7/10'], ['9/10', '9/10']], help: 'Yalnızca KDV tevkifatı yapmakla sorumlu alıcılar (kamu kurumları vb.) için ve hizmet türüne göre seçiniz.' },
      { id: 'tevkifatLimit', t: 'money', label: 'KDV tevkifatı alt sınırı', opt: true, def: String(P.smm.tevkifatLimit), suffix: '₺', showIf: v => v.tevkifat !== 'yok', help: 'KDV dahil toplam bu tutarı aşıyorsa tevkifat uygulanır.' }
    ],
    hesapla(v) {
      const r = C.smm(v);
      if (r.hata) return { hata: r.hata };
      const s = r.sonuc;
      const satirlar = [
        kv('Brüt ücret (KDV hariç matrah)', tl(s.matrah)),
        kv('KDV (' + pct(parseFloat(v.kdv), 0) + ')', '+ ' + tl(s.kdv), 'pos'),
        kv('KDV dahil toplam', tl(s.kdvDahil), 'muted'),
        kv('Stopaj (' + pct(parseFloat(v.stopaj), 0) + ')', '− ' + tl(s.stopaj), 'neg')
      ];
      if (r.tevkifatOran > 0) satirlar.push(kv('KDV tevkifatı (' + v.tevkifat + ')', s.tevkUyg ? '− ' + tl(s.tevk) : 'Uygulanmadı', s.tevkUyg ? 'neg' : 'muted'));
      satirlar.push(kv('Tahsil edilecek tutar', tl(s.tahsil), 'total'));
      satirlar.push(kv('Net ücret (brüt − stopaj)', tl(s.net), 'muted'));
      const tablolar = [];
      if (r.senaryolar) {
        tablolar.push({ baslik: 'Olası iki senaryo', head: ['Senaryo', 'Brüt matrah', 'KDV', 'Tevkifat', 'Stopaj', 'Tahsil'], rows: r.senaryolar.map((x, i) => [i === 0 ? 'Tevkifat yok' : 'Tevkifat var', tl(x.matrah), tl(x.kdv), tl(x.tevk), tl(x.stopaj), tl(x.tahsil)]) });
      }
      return {
        baslik: { l: 'Tahsil edilecek tutar', v: tl(s.tahsil), alt: 'Brüt matrah ' + tl(s.matrah) + ' · KDV ' + tl(s.kdv) + ' · Stopaj ' + tl(s.stopaj) },
        bolumler: [{ baslik: 'Makbuz dökümü', satirlar }],
        tablolar,
        uyarilar: r.uyarilar,
        notlar: [
          'Serbest meslek erbabı (GVK m.18) stopaj oranı genel olarak %20’dir; avukatlık hizmetlerinde genel KDV oranı %20’dir.',
          'KDV tevkifatı, alıcının tevkifat yapmakla sorumlu olması ve KDV dahil tutarın alt sınırı aşması halinde uygulanır. Hizmet türüne göre oranlar farklılık gösterir.',
          'Bu araç e-SMM düzenlemez; yalnızca hesaplama desteği sağlar. CMK ücretleri, karşı taraf vekâlet ücreti gibi özel durumlarda karar metni ve güncel vergi uygulaması ayrıca kontrol edilmelidir. Nihai belge için mali müşavirinize danışınız.'
        ],
        kopya: 'SMM hesabı: brüt ' + tl(s.matrah) + ', tahsil edilecek ' + tl(s.tahsil)
      };
    }
  });

  /* ------------------------------------------------------------
     ARAYÜZ OLUŞTURMA
     ------------------------------------------------------------ */
  const tabsEl = root.querySelector('#calc-tabs');
  const stageEl = root.querySelector('#calc-stage');
  let aktif = null;

  CALCS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'calc-tab';
    b.dataset.id = c.id;
    b.setAttribute('role', 'tab');
    b.innerHTML = '<span class="calc-tab__icon">' + ICONS[c.ikon] + '</span><span class="calc-tab__text"><strong>' + esc(c.kisa) + '</strong></span>';
    b.addEventListener('click', () => sec(c.id, true));
    tabsEl.appendChild(b);
  });

  function alanHTML(c, f) {
    if (f.grup) return '<div class="calc-group" data-grup="' + esc(f.grup) + '"><span>' + esc(f.grup) + '</span></div>';
    const id = 'f-' + c.id + '-' + f.id;
    const help = f.help ? '<small class="calc-help">' + esc(f.help) + '</small>' : '';
    const opt = f.opt ? ' <span class="form-label__optional">(isteğe bağlı)</span>' : '';
    let ctl = '';
    if (f.t === 'select') {
      ctl = '<select class="form-input calc-select" id="' + id + '" data-f="' + f.id + '">' + f.opts.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(f.def) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    } else if (f.t === 'check') {
      return '<div class="form-group calc-field calc-field--check" data-field="' + f.id + '"><label class="calc-check"><input type="checkbox" id="' + id + '" data-f="' + f.id + '"' + (f.def ? ' checked' : '') + '><span class="calc-check__box" aria-hidden="true"></span><span>' + esc(f.label) + '</span></label>' + help + '</div>';
    } else if (f.t === 'date') {
      ctl = '<input type="date" class="form-input" id="' + id + '" data-f="' + f.id + '" value="' + esc(f.def) + '">';
    } else {
      ctl = '<div class="calc-money"><input type="text" inputmode="decimal" autocomplete="off" class="form-input" id="' + id + '" data-f="' + f.id + '" value="' + esc(f.def) + '" placeholder="' + (f.suffix === '₺' ? '0,00' : '') + '">' + (f.suffix ? '<span class="calc-money__suffix">' + esc(f.suffix) + '</span>' : '') + '</div>';
    }
    return '<div class="form-group calc-field" data-field="' + f.id + '"><label class="form-label" for="' + id + '">' + esc(f.label) + opt + '</label>' + ctl + help + '</div>';
  }

  function oku(c, form) {
    const v = {};
    c.alanlar.forEach(f => {
      if (f.grup) return;
      const el = form.querySelector('[data-f="' + f.id + '"]');
      if (!el) return;
      if (f.t === 'check') v[f.id] = el.checked;
      else if (f.t === 'money') v[f.id] = parseMoney(el.value);
      else v[f.id] = el.value;
    });
    // select değerleri sayısal dönüşümü gerektirenler
    return v;
  }

  function gorunurluk(c, form, v) {
    c.alanlar.forEach(f => {
      if (!f.id) return;
      const wrap = form.querySelector('[data-field="' + f.id + '"]');
      if (!wrap) return;
      const show = f.showIf ? !!f.showIf(v) : true;
      wrap.hidden = !show;
    });
    /* Grup başlıklarını, altındaki görünür alan yoksa gizle */
    const els = [...form.querySelectorAll('.calc-group, .calc-field')];
    els.forEach((el, i) => {
      if (!el.classList.contains('calc-group')) return;
      let any = false;
      for (let j = i + 1; j < els.length && !els[j].classList.contains('calc-group'); j++) if (!els[j].hidden) { any = true; break; }
      el.hidden = !any;
    });
  }

  function sonucHTML(res) {
    if (res.hata) return '<div class="calc-empty"><div class="calc-empty__icon">' + ic('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>') + '</div><p>' + esc(res.hata) + '</p></div>';
    let h = '<div class="calc-hero"><span class="calc-hero__label">' + esc(res.baslik.l) + '</span><strong class="calc-hero__value">' + esc(res.baslik.v) + '</strong>' + (res.baslik.alt ? '<span class="calc-hero__sub">' + esc(res.baslik.alt) + '</span>' : '') + '</div>';
    (res.uyarilar || []).forEach(u => { h += '<div class="calc-alert" role="note">' + ic('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>') + '<span>' + esc(u) + '</span></div>'; });
    (res.bolumler || []).forEach(b => {
      h += '<section class="calc-block"><h4>' + esc(b.baslik) + '</h4><dl class="calc-rows">';
      b.satirlar.forEach(s => { h += '<div class="calc-row ' + esc(s.cls) + '"><dt>' + esc(s.l) + '</dt><dd>' + esc(s.v) + '</dd></div>'; });
      h += '</dl></section>';
    });
    (res.tablolar || []).forEach(t => {
      h += '<section class="calc-block"><h4>' + esc(t.baslik) + '</h4><div class="calc-table-wrap"><table class="calc-table"><thead><tr>' + t.head.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>';
      t.rows.forEach(r => { h += '<tr>' + r.map((c, i) => '<td' + (i === 0 ? ' data-first' : '') + '>' + esc(c) + '</td>').join('') + '</tr>'; });
      h += '</tbody>' + (t.foot ? '<tfoot><tr>' + t.foot.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr></tfoot>' : '') + '</table></div></section>';
    });
    if (res.notlar && res.notlar.length) {
      h += '<section class="calc-block calc-notes"><h4>Hesaplama dayanakları ve notlar</h4><ul>' + res.notlar.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul></section>';
    }
    return h;
  }

  function sec(id, scroll) {
    const c = CALCS.find(x => x.id === id) || CALCS[0];
    aktif = c;
    [...tabsEl.children].forEach(b => { const on = b.dataset.id === c.id; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
    try { history.replaceState(null, '', '#' + c.id); } catch (e) {}

    stageEl.innerHTML =
      '<div class="calc-card calc-card--form" id="calc-form-card">' +
        '<header class="calc-card__head"><span class="calc-card__icon">' + ICONS[c.ikon] + '</span><div><h2>' + esc(c.baslik) + '</h2><p>' + esc(c.aciklama) + '</p></div></header>' +
        '<form class="calc-form" id="calc-form" novalidate autocomplete="off">' +
          c.alanlar.map(f => alanHTML(c, f)).join('') +
          '<div class="calc-actions"><button type="submit" class="btn btn--primary">Hesapla</button><button type="reset" class="btn btn--outline calc-reset">Temizle</button></div>' +
        '</form>' +
      '</div>' +
      '<div class="calc-card calc-card--result" id="calc-result-card"><div class="calc-result" id="calc-result" aria-live="polite"></div>' +
        '<div class="calc-result-actions" id="calc-result-actions" hidden>' +
          '<button type="button" class="calc-link-btn" id="calc-copy">Sonucu kopyala</button>' +
          '<button type="button" class="calc-link-btn" id="calc-print">Yazdır</button>' +
          '<a class="calc-link-btn calc-link-btn--wa" id="calc-wa" target="_blank" rel="noopener noreferrer">Uzmanımıza danışın</a>' +
        '</div>' +
        '<p class="calc-disclaimer">Bu araç bilgilendirme amaçlıdır; yaklaşık sonuç üretir ve hukuki görüş yerine geçmez. Kesin tutar için güncel mevzuat, bordro ve dosya bilgileri esas alınmalıdır. Parametreler ' + esc(P.guncelleme) + ' tarihi itibarıyla günceldir.</p>' +
      '</div>';

    const form = stageEl.querySelector('#calc-form');
    const out = stageEl.querySelector('#calc-result');
    const acts = stageEl.querySelector('#calc-result-actions');
    let sonKopya = '';
    let dokunuldu = false;

    function guncelle(goster) {
      const v = oku(c, form);
      gorunurluk(c, form, v);
      let res;
      try { res = c.hesapla(v); } catch (e) { console.error(e); res = { hata: 'Hesaplama sırasında beklenmeyen bir hata oluştu. Girdileri kontrol ediniz.' }; }
      if (res.hata && !goster && !dokunuldu) {
        out.innerHTML = bosHTML(c);
        acts.hidden = true;
        return;
      }
      out.innerHTML = sonucHTML(res);
      acts.hidden = !!res.hata;
      sonKopya = res.kopya || '';
      const wa = stageEl.querySelector('#calc-wa');
      if (wa) wa.href = 'https://wa.me/905324999440?text=' + encodeURIComponent('Merhaba, ' + c.baslik + ' aracını kullandım. ' + sonKopya + ' — Dosyamla ilgili bilgi almak istiyorum.');
    }

    let t;
    form.addEventListener('input', e => { dokunuldu = true; clearTimeout(t); t = setTimeout(() => guncelle(false), 120); });
    form.addEventListener('change', e => { dokunuldu = true; guncelle(false); });
    form.addEventListener('submit', e => { e.preventDefault(); dokunuldu = true; guncelle(true); if (window.matchMedia('(max-width: 1023px)').matches) stageEl.querySelector('#calc-result-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    form.addEventListener('reset', () => { setTimeout(() => { dokunuldu = false; guncelle(false); }, 0); });
    form.addEventListener('focusout', e => {
      const el = e.target;
      if (el && el.matches && el.matches('input[type="text"]')) {
        const f = c.alanlar.find(x => x.id === el.dataset.f);
        if (f && f.t === 'money' && f.suffix === '₺' && el.value.trim() !== '') el.value = nfN.format(parseMoney(el.value));
      }
    });
    stageEl.querySelector('#calc-copy').addEventListener('click', ev => {
      const btn = ev.currentTarget;
      const text = (sonKopya || c.baslik) + '\n' + 'Paralegal Danışmanlık — ' + location.href.split('#')[0];
      const ok = () => { const o = btn.textContent; btn.textContent = 'Kopyalandı ✓'; setTimeout(() => (btn.textContent = o), 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => {});
      else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove(); }
    });
    stageEl.querySelector('#calc-print').addEventListener('click', () => window.print());

    guncelle(false);
    if (scroll) {
      const top = tabsEl.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }

  function bosHTML(c) {
    return '<div class="calc-empty"><div class="calc-empty__icon">' + ICONS[c.ikon] + '</div><h3>Sonuç burada görünecek</h3><p>Soldaki formu doldurun; sonuç, girdilerinizi değiştirdikçe anında güncellenir.</p></div>';
  }

  const h0 = (location.hash || '').replace('#', '');
  sec(CALCS.some(c => c.id === h0) ? h0 : CALCS[0].id, false);
  window.addEventListener('hashchange', () => {
    const h = (location.hash || '').replace('#', '');
    if (CALCS.some(c => c.id === h) && (!aktif || aktif.id !== h)) sec(h, true);
  });
})();
