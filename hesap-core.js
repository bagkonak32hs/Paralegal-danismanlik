/**
 * ============================================================
 * PARALEGAL DANIŞMANLIK — Hesaplama Motoru (2026 parametreleri)
 * Saf fonksiyonlar: arayüzden bağımsız, Node ile test edilebilir.
 * Parametre güncelleme tarihi: 15.10.2026
 * ============================================================
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HesapCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------
     PARAMETRELER
     ------------------------------------------------------------ */
  const P = {
    yil: 2026,
    guncelleme: '15.10.2026',

    /* Ücret / bordro (2026) */
    asgariUcretBrut: 33030,
    pekTavan: 297270,                 // SGK prime esas kazanç üst sınırı (aylık)
    sgkIsci: 0.14,
    issizlikIsci: 0.01,
    damga: 0.00759,
    gvDilim: [                        // 2026 ücret gelirleri tarifesi (kümülatif matrah)
      [190000, 0.15],
      [400000, 0.20],
      [1500000, 0.27],
      [5300000, 0.35],
      [Infinity, 0.40]
    ],

    /* Kıdem tazminatı tavanı (dönem başlangıcı → tutar) */
    kidemTavan: [
      ['2022-01-01', 10848.59],
      ['2022-07-01', 15371.40],
      ['2023-01-01', 19982.83],
      ['2023-07-01', 23489.83],
      ['2024-01-01', 35058.58],
      ['2024-07-01', 41828.42],
      ['2025-01-01', 46655.43],
      ['2025-07-01', 53919.68],
      ['2026-01-01', 64948.77],
      ['2026-07-01', 73729.87]
    ],

    /* AAÜT 2025-2026 (RG 04.11.2025, 33067) */
    aaut: {
      nispi: [
        [600000, 0.16], [600000, 0.15], [1200000, 0.14], [1200000, 0.13],
        [1800000, 0.11], [2400000, 0.08], [3000000, 0.05], [3600000, 0.03],
        [4200000, 0.02], [Infinity, 0.01]
      ],
      mahkeme: {
        sulh:        { ad: 'Sulh Hukuk Mahkemeleri', maktu: 30000 },
        asliye:      { ad: 'Asliye Mahkemeleri (Hukuk/Ticaret/Aile/İş/Ağır Ceza dışı)', maktu: 45000 },
        tuketici:    { ad: 'Tüketici Mahkemeleri', maktu: 22500 },
        fikri:       { ad: 'Fikri ve Sınai Haklar Mahkemeleri', maktu: 55000 },
        agirceza:    { ad: 'Ağır Ceza Mahkemeleri', maktu: 65000 },
        sulhceza:    { ad: 'Sulh Ceza / İnfaz Hakimlikleri', maktu: 18000 },
        idareDs:     { ad: 'İdare ve Vergi Mahkemeleri (duruşmasız)', maktu: 30000 },
        idareD:      { ad: 'İdare ve Vergi Mahkemeleri (duruşmalı)', maktu: 40000 },
        bam:         { ad: 'Bölge Adliye / Bölge İdare Mahkemesi (ilk derece)', maktu: 35000 },
        yargitay:    { ad: 'Yargıtay (ilk derece)', maktu: 65000 },
        danistay:    { ad: 'Danıştay (ilk derece, duruşmasız)', maktu: 40000 },
        icraMah:     { ad: 'İcra Mahkemeleri (dava ve duruşmalı işler)', maktu: 18000 }
      },
      icraDairesi: 9000,
      icraTahliye: 20000,
      icraMahkemesiTakip: 11000,
      davaDisi: {
        sozluBuro:   { ad: 'Büroda sözlü danışma (ilk saat)', tutar: 4000 },
        sozluCagri:  { ad: 'Çağrı üzerine sözlü / yazılı danışma (ilk saat)', tutar: 7000 },
        dilekce:     { ad: 'Dilekçe, ihbarname, ihtarname (alt sınır)', tutar: 6000 },
        kiraSoz:     { ad: 'Kira sözleşmesi hazırlanması', tutar: 8000 },
        miras:       { ad: 'Miras sözleşmesi / vasiyetname (azami)', tutar: 32000 },
        arabAnlasma: { ad: 'Arabuluculukta anlaşma sağlanamaması (avukat)', tutar: 8000 }
      }
    },

    /* Arabuluculuk Asgari Ücret Tarifesi 2026 (RG 26.12.2025, 33119) */
    arab: {
      saatlik: {                       // [2 kişi (taraf başı), 3-5, 6-10, 11+ (toplam)]
        diger:   [1000, 2200, 2300, 2400],
        ticari:  [1500, 3200, 3300, 3400],
        isci:    [1130, 2460, 2560, 2660],
        kira:    [1170, 2540, 2640, 2740]
      },
      dilim: [                         // [dilim tutarı, tek arabulucu %, çok arabulucu %]
        [600000, 6, 9],
        [960000, 5, 7.5],
        [1560000, 4, 6],
        [3120000, 3, 4.5],
        [9360000, 2, 3],
        [12480000, 1.5, 2.5],
        [24960000, 1, 1.5],
        [Infinity, 0.5, 1]
      ],
      taban: 9000,
      tabanTicari: 13000,
      butceSaat: 2
    },

    /* İcra harç ve masrafları (2026) */
    icra: {
      basvurmaHarci: 732,
      peshinHarcOran: 0.005,
      vekaletSuret: 104,
      vekaletPulu: 164,
      hacizSatisHarci: 1718.80,
      cezaeviHarci: 0.02,
      tahsilHarci: {
        yok:      { ad: 'Ödeme emri tebliğinden önce ödeme', oran: 0 },
        haciz0:   { ad: 'Ödeme emri tebliğinden sonra, hacizden önce', oran: 0.0455 },
        haciz1:   { ad: 'Hacizden sonra, satıştan önce', oran: 0.0910 },
        satis:    { ad: 'Satış / paraya çevirme sonrası', oran: 0.1138 },
        maas:     { ad: 'Maaş / ücret haczi', oran: 0.0455 }
      },
      /* PTT tebligat ücreti (KDV dahil): [ağırlık üst sınırı gr, normal, MTS, hızlı] */
      tebligat: [
        [100, 300, 350, 600],
        [250, 375, 425, 610],
        [500, 400, 450, 650],
        [1000, 420, 470, 700]
      ],
      tebligatEk: [50, 50, 100],
      uetsGonderi: 20
    },

    /* TÜFE 12 aylık ortalamalara göre değişim (%): veri ayı → oran. TÜİK. */
    tufe12: {
      '2022-01': 22.58, '2022-02': 25.98, '2022-03': 29.88, '2022-04': 34.46, '2022-05': 39.33, '2022-06': 44.54,
      '2022-07': 49.65, '2022-08': 54.69, '2022-09': 59.91, '2022-10': 65.26, '2022-11': 70.36, '2022-12': 72.31,
      '2023-01': 72.45, '2023-02': 71.83, '2023-03': 70.20, '2023-04': 67.20, '2023-05': 63.72, '2023-06': 59.95,
      '2023-07': 57.45, '2023-08': 56.28, '2023-09': 55.30, '2023-10': 54.26, '2023-11': 53.40, '2023-12': 53.86,
      '2024-01': 54.72, '2024-02': 55.91, '2024-03': 57.50, '2024-04': 59.64, '2024-05': 62.51, '2024-06': 65.07,
      '2024-07': 65.93, '2024-08': 64.91, '2024-09': 63.47, '2024-10': 62.02, '2024-11': 60.45, '2024-12': 58.51,
      '2025-01': 56.35, '2025-02': 53.83, '2025-03': 51.26, '2025-04': 48.73, '2025-05': 45.80, '2025-06': 43.23,
      '2025-07': 41.13, '2025-08': 39.62, '2025-09': 38.36, '2025-10': 37.15, '2025-11': 35.91, '2025-12': 34.88,
      '2026-01': 33.98, '2026-02': 33.39, '2026-03': 32.82, '2026-04': 32.43, '2026-05': 32.24, '2026-06': 32.03,
      '2026-07': 31.90, '2026-08': 31.79, '2026-09': 31.49
    },

    /* Serbest meslek makbuzu */
    smm: { kdv: 0.20, stopaj: 0.20, tevkifatLimit: 12000 }
  };

  /* ------------------------------------------------------------
     YARDIMCILAR
     ------------------------------------------------------------ */
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const f2 = n => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };

  function parseDate(s) {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d) ? null : d;
  }
  const iso = d => d.toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);

  /** Yıl / ay / gün farkı (çıkış günü dahil: bitişe 1 gün eklenerek takvim farkı alınır) */
  function ymd(a, b) {
    const e = new Date(b.getTime() + 86400000);
    let y = e.getUTCFullYear() - a.getUTCFullYear();
    let m = e.getUTCMonth() - a.getUTCMonth();
    let d = e.getUTCDate() - a.getUTCDate();
    if (d < 0) {
      m -= 1;
      d += new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 0)).getUTCDate();
    }
    if (m < 0) { y -= 1; m += 12; }
    return { y, m, d };
  }

  /* ------------------------------------------------------------
     GELİR VERGİSİ / BORDRO
     ------------------------------------------------------------ */
  function gvVergi(matrah) {
    let vergi = 0, onceki = 0;
    for (const [limit, oran] of P.gvDilim) {
      if (matrah > onceki) {
        vergi += (Math.min(matrah, limit) - onceki) * oran;
        onceki = limit;
      } else break;
    }
    return vergi;
  }
  const gvArtis = (kum, ek) => gvVergi(kum + ek) - gvVergi(kum);

  /** Asgari ücret gelir vergisi istisnası (ay: 1-12), dilimlere göre kümülatif hesaplanır */
  function gvIstisna(ay) {
    const aylikMatrah = P.asgariUcretBrut * (1 - P.sgkIsci - P.issizlikIsci);
    return gvVergi(aylikMatrah * ay) - gvVergi(aylikMatrah * (ay - 1));
  }
  const damgaIstisna = () => P.asgariUcretBrut * P.damga;

  /**
   * Tek aylık ücret hesabı.
   * o: { kum (önceki aylar kümülatif GV matrahı), istisnaKullanildi, pekKazanc (aynı ay önceki PEK) }
   */
  function ucretHesap(brut, ay, o) {
    o = o || {};
    const kum = o.kum || 0;
    const pekKalan = Math.max(0, P.pekTavan - (o.pekKazanc || 0));
    const sgkMatrah = Math.min(brut, pekKalan);
    const sgk = sgkMatrah * P.sgkIsci;
    const issizlik = sgkMatrah * P.issizlikIsci;
    const gvMatrah = Math.max(0, brut - sgk - issizlik);
    const gvHam = gvArtis(kum, gvMatrah);
    const damgaHam = brut * P.damga;
    const gvIst = o.istisnaKullanildi ? 0 : Math.min(gvHam, gvIstisna(ay));
    const damgaIst = o.istisnaKullanildi ? 0 : Math.min(damgaHam, damgaIstisna());
    const gv = gvHam - gvIst;
    const damga = damgaHam - damgaIst;
    return {
      brut, sgkMatrah, sgk, issizlik, gvMatrah, gvHam, gvIst, gv,
      damgaHam, damgaIst, damga,
      net: brut - sgk - issizlik - gv - damga
    };
  }

  /** Yıllık maaş tablosu (her ay aynı brüt) */
  function maasYillik(brut, baslangicAy, kumBaslangic) {
    const aylar = [];
    let kum = kumBaslangic || 0;
    for (let ay = baslangicAy || 1; ay <= 12; ay++) {
      const h = ucretHesap(brut, ay, { kum });
      kum += h.gvMatrah;
      aylar.push(Object.assign({ ay, kum }, h));
    }
    return aylar;
  }

  /** Netten brüte: hedef ayın neti istenen net olacak şekilde brüt (önceki aylar aynı brüt varsayımı) */
  function netdenBrute(hedefNet, hedefAy) {
    const netAy = brut => {
      const t = maasYillik(brut, 1, 0);
      return t[hedefAy - 1].net;
    };
    let lo = hedefNet, hi = hedefNet * 3 + 1000;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (netAy(mid) < hedefNet) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ------------------------------------------------------------
     İŞÇİLİK ALACAKLARI
     ------------------------------------------------------------ */
  function kidemTavanBul(tarihStr) {
    let sonuc = null;
    for (const [bas, v] of P.kidemTavan) if (tarihStr >= bas) sonuc = { bas, v };
    return sonuc;
  }

  function ihbarHafta(ayToplam) {
    if (ayToplam < 6) return 2;
    if (ayToplam < 18) return 4;
    if (ayToplam < 36) return 6;
    return 8;
  }

  function iscilik(inp) {
    const giris = parseDate(inp.giris), cikis = parseDate(inp.cikis);
    const sonuc = { uyarilar: [], kalemler: [] };
    if (!giris || !cikis || cikis < giris) {
      sonuc.hata = 'Geçerli işe giriş ve çıkış tarihi giriniz (çıkış, girişten sonra olmalı).';
      return sonuc;
    }
    const brut = num(inp.brut), yan = num(inp.yan);
    if (brut <= 0) { sonuc.hata = 'Aylık brüt ücret giriniz.'; return sonuc; }
    const giydirilmis = brut + yan;
    const gunluk = giydirilmis / 30;
    const kal = ymd(giris, cikis);
    const yilKesir = kal.y + kal.m / 12 + kal.d / 365;
    sonuc.hizmet = { y: kal.y, m: kal.m, d: kal.d, yilKesir };

    const fesih = inp.fesih;       // 'isveren_haksiz' | 'isveren_bildirimli' | 'isci_haksli' | 'emeklilik' | 'istifa' | 'isveren_haksli'
    const kidemHak = ['isveren_haksiz', 'isveren_bildirimli', 'isci_haksli', 'emeklilik'].includes(fesih);
    const ihbarHak = fesih === 'isveren_haksiz';
    const cikisYil = cikis.getUTCFullYear();
    const aySecim = Math.min(12, Math.max(1, parseInt(inp.odemeAy, 10) || (cikis.getUTCMonth() + 1)));
    const kum = num(inp.kum);
    const istisnaKullanildi = !!inp.istisnaKullanildi;
    const pekKazanc = num(inp.pekKazanc);

    /* Kıdem */
    if (inp.kidem) {
      if (!kidemHak) sonuc.uyarilar.push('Seçtiğiniz fesih türünde kıdem tazminatı hakkı doğmaz (1475 s. K. m.14). Hesap, yine de bilgi amacıyla gösterilmiştir.');
      if (kal.y < 1 && fesih !== 'emeklilik') sonuc.uyarilar.push('Kıdem tazminatı için en az 1 yıl çalışma şartı aranır; bu sürenin altında hak doğmaz.');
      const tv = kidemTavanBul(inp.cikis);
      if (!tv) sonuc.uyarilar.push('Çıkış tarihi 2022 öncesi olduğundan kıdem tavanı tablosu kapsamı dışındadır.');
      const tavan = tv ? tv.v : Infinity;
      const esas = Math.min(giydirilmis, tavan);
      const brutK = esas * yilKesir;
      const damga = brutK * P.damga;
      sonuc.kalemler.push({
        id: 'kidem', ad: 'Kıdem tazminatı', brut: brutK, kesinti: { damga }, net: brutK - damga,
        aciklama: 'Esas ücret ' + f2(esas) + ' TL' + (giydirilmis > tavan ? ' (tavan uygulandı)' : '') + ' × ' + yilKesir.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) + ' yıl',
        tavan: tv ? tv.v : null, tavanDonem: tv ? tv.bas : null
      });
    }

    /* İhbar */
    if (inp.ihbar) {
      if (!ihbarHak) sonuc.uyarilar.push('Seçtiğiniz fesih türünde ihbar tazminatı hakkı genellikle doğmaz (yalnızca bildirim süresine uymadan yapılan feshte). Hesap bilgi amaçlıdır.');
      const hafta = ihbarHafta(kal.y * 12 + kal.m);
      const brutI = gunluk * 7 * hafta;
      const gv = gvArtis(kum, brutI);
      const damga = brutI * P.damga;
      sonuc.kalemler.push({
        id: 'ihbar', ad: 'İhbar tazminatı', brut: brutI, kesinti: { gv, damga }, net: brutI - gv - damga,
        aciklama: hafta + ' hafta bildirim süresi × günlük ' + f2(gunluk) + ' TL × 7'
      });
    }

    /* Ücret niteliğindeki alacaklar */
    const hakk = Math.min(100, Math.max(0, num(inp.hakkaniyet))) / 100;
    const ucretKalemleri = [];

    if (inp.fm) {
      const C = num(inp.haftalikSozlesme) || 45;
      const A = num(inp.haftalikGercek);
      const W = num(inp.haftaSayisi);
      const saat = giydirilmis / (C * 5);
      const fazlaSure = Math.max(0, Math.min(A, 45) - C);       // %25 zamlı (fazla sürelerle çalışma)
      const fazlaCalisma = Math.max(0, A - 45);                // %50 zamlı
      const haftalik = saat * (fazlaSure * 1.25 + fazlaCalisma * 1.5);
      const brutF = haftalik * W * (1 - hakk);
      ucretKalemleri.push({
        id: 'fm', ad: 'Fazla mesai ücreti', brut: brutF,
        aciklama: 'Saat ücreti ' + f2(saat) + ' TL; haftada ' + fazlaSure.toLocaleString('tr-TR') + ' s (%25) + ' + fazlaCalisma.toLocaleString('tr-TR') + ' s (%50) × ' + W + ' hafta' + (hakk ? ' − %' + (hakk * 100) + ' hakkaniyet' : '')
      });
      if (A <= C) sonuc.uyarilar.push('Haftalık gerçek çalışma süresi sözleşmedeki süreyi aşmıyor; fazla mesai doğmaz.');
    }
    if (inp.ht) {
      const n = num(inp.htGun);
      const brutH = n * gunluk * 1.5 * (1 - hakk);
      ucretKalemleri.push({ id: 'ht', ad: 'Hafta tatili çalışma ücreti', brut: brutH, aciklama: n + ' gün × günlük ' + f2(gunluk) + ' TL × 1,5' + (hakk ? ' − %' + (hakk * 100) + ' hakkaniyet' : '') });
    }
    if (inp.ubgt) {
      const n = num(inp.ubgtGun);
      const brutU = n * gunluk * 1 * (1 - hakk);
      ucretKalemleri.push({ id: 'ubgt', ad: 'Ulusal bayram ve genel tatil (UBGT) ücreti', brut: brutU, aciklama: n + ' gün × günlük ' + f2(gunluk) + ' TL (ayrıca 1 günlük ücret; İş K. m.47)' + (hakk ? ' − %' + (hakk * 100) + ' hakkaniyet' : '') });
    }
    if (inp.izin) {
      const n = num(inp.izinGun);
      const brutZ = n * gunluk;
      ucretKalemleri.push({ id: 'izin', ad: 'Kullanılmayan yıllık izin ücreti', brut: brutZ, aciklama: n + ' gün × günlük ' + f2(gunluk) + ' TL' });
    }

    const toplamUcret = ucretKalemleri.reduce((t, k) => t + k.brut, 0);
    if (toplamUcret > 0) {
      const h = ucretHesap(toplamUcret, aySecim, { kum, istisnaKullanildi, pekKazanc });
      ucretKalemleri.forEach(k => {
        const pay = k.brut / toplamUcret;
        k.kesinti = { sgk: (h.sgk + h.issizlik) * pay, gv: h.gv * pay, damga: h.damga * pay };
        k.net = k.brut - k.kesinti.sgk - k.kesinti.gv - k.kesinti.damga;
        sonuc.kalemler.push(k);
      });
      sonuc.ucretToplu = h;
    }

    sonuc.toplamBrut = sonuc.kalemler.reduce((t, k) => t + k.brut, 0);
    sonuc.toplamNet = sonuc.kalemler.reduce((t, k) => t + k.net, 0);
    sonuc.giydirilmis = giydirilmis;
    sonuc.gunluk = gunluk;
    sonuc.cikisYil = cikisYil;
    return sonuc;
  }

  /* ------------------------------------------------------------
     VEKÂLET ÜCRETİ (AAÜT)
     ------------------------------------------------------------ */
  function nispiTarife(matrah) {
    let kalan = matrah, toplam = 0;
    const satirlar = [];
    for (const [dilim, oran] of P.aaut.nispi) {
      if (kalan <= 0) break;
      const kisim = Math.min(kalan, dilim);
      const ucret = kisim * oran;
      satirlar.push({ dilim: kisim, oran, ucret });
      toplam += ucret;
      kalan -= kisim;
    }
    return { toplam, satirlar };
  }

  function vekalet(inp) {
    const s = { uyarilar: [], satirlar: [] };
    if (inp.islem === 'davadisi') {
      const k = P.aaut.davaDisi[inp.davaDisiKalem];
      let tutar = k.tutar;
      const adet = Math.max(1, num(inp.adet) || 1);
      if (inp.davaDisiKalem === 'sozluBuro' || inp.davaDisiKalem === 'sozluCagri') {
        s.uyarilar.push('Danışma ücreti ilk saat içindir; sonraki saatler için tarifedeki ayrı ücret uygulanır.');
      }
      tutar = tutar * adet;
      s.toplam = tutar;
      s.satirlar.push({ ad: k.ad, tutar: k.tutar, adet });
      s.tip = 'maktu';
      return s;
    }

    if (inp.islem === 'icra') {
      const alacak = num(inp.tutar);
      let taban, ad;
      if (inp.icraTur === 'tahliye') { taban = P.aaut.icraTahliye; ad = 'Tahliyeye ilişkin icra takipleri (maktu)'; }
      else if (inp.icraTur === 'icraMahkemesiTakip') { taban = P.aaut.icraMahkemesiTakip; ad = 'İcra mahkemelerinde takip edilen işler (maktu)'; }
      else { taban = P.aaut.icraDairesi; ad = 'İcra dairelerinde yapılan takipler (maktu)'; }
      let ucret = taban;
      s.satirlar.push({ ad, tutar: taban });
      if (inp.icraTur === 'para') {
        if (alacak <= 0) { s.hata = 'Asıl alacak tutarını giriniz.'; return s; }
        if (ucret > alacak) { ucret = alacak; s.satirlar.push({ ad: 'Asıl alacağı geçemez → sınırlandı', tutar: alacak }); }
      }
      if (inp.odemeSuresinde) {
        const onceki = ucret;
        ucret = ucret * 0.75;
        s.satirlar.push({ ad: 'Borçlu ödeme süresinde ödedi → ücretin 3/4’ü', tutar: ucret, onceki });
      }
      s.toplam = ucret;
      s.tip = 'maktu';
      return s;
    }

    /* Yargılama (mahkeme) */
    const m = P.aaut.mahkeme[inp.mahkeme];
    const maktu = m.maktu;
    const yarim = inp.asama === 'yarim';
    const carpan = yarim ? 0.5 : 1;
    s.mahkeme = m.ad;

    if (inp.konu === 'maktu') {
      const t = maktu * carpan;
      s.satirlar.push({ ad: m.ad + ' maktu ücret', tutar: maktu });
      if (yarim) s.satirlar.push({ ad: 'Ön inceleme tutanağı imzalanmadan sona erdi → yarısı', tutar: t });
      s.toplam = t;
      s.tip = 'maktu';
      return s;
    }

    const kabul = num(inp.tutar), red = num(inp.redTutar);
    if (kabul <= 0 && red <= 0) { s.hata = 'Dava değeri / kabul edilen tutarı giriniz.'; return s; }

    const hesapla = (matrah, etiket) => {
      const n = nispiTarife(matrah);
      let u = n.toplam, dipnot = null;
      if (u < maktu) { u = maktu; dipnot = 'Nispi ücret maktu alt sınırın altında kaldığı için maktu ücret esas alındı'; }
      if (u > matrah) { u = matrah; dipnot = 'Ücret, kabul/ret edilen tutarı aşamaz'; }
      const son = u * carpan;
      return { etiket, matrah, nispi: n.toplam, uygulanan: u, son, dipnot, satirlar: n.satirlar };
    };

    s.parcalar = [];
    if (kabul > 0) s.parcalar.push(hesapla(kabul, red > 0 ? 'Kabul edilen kısım' : 'Dava değeri / hüküm altına alınan tutar'));
    if (red > 0) s.parcalar.push(hesapla(red, 'Reddedilen kısım'));
    s.toplam = s.parcalar.reduce((t, p) => t + p.son, 0);
    s.carpan = carpan;
    s.tip = 'nispi';
    return s;
  }

  /* ------------------------------------------------------------
     ARABULUCULUK
     ------------------------------------------------------------ */
  function arabuluculuk(inp) {
    const A = P.arab;
    const s = { uyarilar: [], satirlar: [] };
    const tur = inp.surec;                    // 'dava' (dava şartı) | 'ihtiyari'
    const sonuc = inp.sonuc;                  // 'anlasma' | 'anlasamama'
    const ticari = inp.uyusmazlik === 'ticari' || inp.uyusmazlik === 'ortaklik';
    const taraf = Math.max(2, parseInt(inp.taraf, 10) || 2);
    const arabulucu = Math.max(1, parseInt(inp.arabulucu, 10) || 1);

    const saatKey = { ticari: 'ticari', ortaklik: 'kira', kira: 'kira', isci: 'isci', aile: 'diger', tuketici: 'diger', diger: 'diger' }[inp.uyusmazlik] || 'diger';

    const saatlikHesap = () => {
      const tablo = A.saatlik[saatKey];
      const idx = taraf <= 2 ? 0 : taraf <= 5 ? 1 : taraf <= 10 ? 2 : 3;
      const saatUcreti = idx === 0 ? tablo[0] * 2 : tablo[idx];
      const girilen = num(inp.saat) || 0;
      const saat = Math.max(girilen, A.butceSaat);
      const toplam = saatUcreti * saat;
      s.satirlar.push({ ad: 'Saat ücreti (' + (idx === 0 ? 'taraf başı ' + tablo[0].toLocaleString('tr-TR') + ' TL × 2 taraf' : taraf + ' kişi, toplam') + ')', tutar: saatUcreti });
      s.satirlar.push({ ad: 'Süre', metin: saat + ' saat' + (girilen < A.butceSaat ? ' (asgari ' + A.butceSaat + ' saat esas alındı)' : '') });
      if (arabulucu > 1) s.uyarilar.push('Birden fazla arabulucu görevlendirilmesinde Birinci Kısım ücretleri için tarifedeki özel hükümler uygulanır; bu hesap tek arabulucuya göre yapılmıştır.');
      s.birinciKisim = true;
      if (tur === 'dava' && sonuc === 'anlasamama') {
        const butce = saatUcreti * Math.min(saat, A.butceSaat);
        const kalan = toplam - butce;
        s.butce = butce;
        s.tarafPayi = kalan > 0 ? kalan / taraf : 0;
        s.kalanToplam = kalan;
      }
      return toplam;
    };

    if (inp.paraKonusu === 'hayir' || sonuc === 'anlasamama') {
      s.toplam = saatlikHesap();
      s.kisim = 'Birinci Kısım (saatlik)';
      if (sonuc === 'anlasma') s.uyarilar.push('Konusu para olmayan uyuşmazlıklarda anlaşma halinde de Birinci Kısım (saatlik ücret) uygulanır.');
      return s;
    }

    /* İkinci Kısım: para konusu + anlaşma */
    let matrah = num(inp.bedel);
    if (inp.matrahTur === 'tahliye') { matrah = num(inp.bedel) / 2; s.satirlar.push({ ad: 'Tahliye: bir yıllık kira bedelinin yarısı', tutar: matrah }); }
    if (inp.matrahTur === 'kiratespit') { s.satirlar.push({ ad: 'Kira tespiti: bir yıllık kira farkı', tutar: matrah }); }
    if (matrah <= 0) { s.hata = 'Anlaşma bedelini / matrahı giriniz.'; return s; }

    let kalan = matrah, toplam = 0;
    s.dilimler = [];
    for (const [dilim, tek, cok] of A.dilim) {
      if (kalan <= 0) break;
      const oran = arabulucu > 1 ? cok : tek;
      const kisim = Math.min(kalan, dilim);
      const ucret = kisim * oran / 100;
      s.dilimler.push({ kisim, oran, ucret });
      toplam += ucret;
      kalan -= kisim;
    }
    const taban = ticari ? A.tabanTicari : A.taban;
    s.hesaplanan = toplam;
    if (toplam < taban) {
      s.uyarilar.push('Hesaplanan ücret asgari tutarın altında kaldığı için taban ücret (' + taban.toLocaleString('tr-TR') + ' TL) uygulanmıştır.');
      toplam = taban;
    }
    s.taban = taban;
    s.toplam = toplam;
    s.tarafPayi = toplam / taraf;
    s.kisim = 'İkinci Kısım (nispi)';
    return s;
  }

  /* ------------------------------------------------------------
     KİRA ARTIŞI
     ------------------------------------------------------------ */
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  function kiraArtis(inp) {
    const s = { uyarilar: [] };
    const kira = num(inp.kira);
    const t = parseDate(inp.tarih);
    if (!t) { s.hata = 'Kira yenileme tarihini seçiniz.'; return s; }
    if (kira <= 0) { s.hata = 'Mevcut kira bedelini giriniz.'; return s; }

    let y = t.getUTCFullYear(), mo = t.getUTCMonth();       // 0-11
    let vy = y, vm = mo - 1;
    if (vm < 0) { vm = 11; vy -= 1; }
    const key = vy + '-' + String(vm + 1).padStart(2, '0');
    const oran = P.tufe12[key];
    s.veriAy = AYLAR[vm] + ' ' + vy;
    s.key = key;

    if (oran === undefined) {
      const sonKey = Object.keys(P.tufe12).sort().pop();
      if (key > sonKey) s.hata = 'Bu yenileme tarihi için gerekli TÜFE verisi (' + s.veriAy + ') henüz TÜİK tarafından açıklanmadı. Son açıklanan veri: ' + sonKey.split('-')[1] + '/' + sonKey.split('-')[0] + ' (%' + P.tufe12[sonKey].toFixed(2).replace('.', ',') + ').';
      else s.hata = '2022 Ocak öncesi dönemler için (ÜFE/TÜFE farklı yöntemler) bu araç hesap yapmaz; somut olay için hukukçuya danışınız.';
      return s;
    }

    const konut = inp.tur === 'konut';
    const tarihStr = inp.tarih;
    let tavan = oran;
    s.sinirUygulandi = false;
    if (konut && tarihStr >= '2022-06-11' && tarihStr <= '2024-07-01') {
      if (oran > 25) { tavan = 25; s.sinirUygulandi = true; }
    }
    s.tufeOrani = oran;
    s.yasalTavan = tavan;

    let uygulanan = tavan;
    const sozOran = inp.sozlesmeOrani !== '' && inp.sozlesmeOrani != null ? parseFloat(String(inp.sozlesmeOrani).replace(',', '.')) : NaN;
    if (isFinite(sozOran) && sozOran > 0) {
      s.sozlesmeOrani = sozOran;
      if (sozOran < tavan) { uygulanan = sozOran; s.uyarilar.push('Sözleşmedeki artış oranı (%' + sozOran + ') yasal üst sınırdan düşük olduğu için sözleşme oranı uygulanır.'); }
      else if (sozOran > tavan) s.uyarilar.push('Sözleşmedeki artış oranı (%' + sozOran + ') yasal üst sınırı aştığı için yasal üst sınır uygulanır.');
    }
    s.uygulanan = uygulanan;
    s.yeniKira = kira * (1 + uygulanan / 100);
    s.artis = s.yeniKira - kira;
    s.yillikArtis = s.artis * 12;

    if (s.sinirUygulandi) s.uyarilar.push('11.06.2022 – 01.07.2024 arasında yenilenen konut kiralarında geçici %25 sınırı uygulanır.');
    if (!konut) s.uyarilar.push('Çatılı iş yerlerinde geçici %25 sınırı uygulanmaz; TÜFE 12 aylık ortalama oranı esas alınır.');
    if (t < parseDate('2020-01-01') && !konut) s.uyarilar.push('2020 öncesi başlayan tacir/tüzel kişi iş yeri kiralarında farklı hükümler söz konusu olabilir.');
    s.uyarilar.push('Kira ilişkisi 5 yılı aşıyorsa, hâkimin hakkaniyete göre belirleyeceği bedel gündeme gelebilir (TBK m.344/3).');
    return s;
  }

  /* ------------------------------------------------------------
     İCRA MASRAFI
     ------------------------------------------------------------ */
  function tebligatUcret(tur, agirlikGr) {
    const idx = { normal: 1, mts: 2, hizli: 3 }[tur] || 1;
    for (const satir of P.icra.tebligat) if (agirlikGr <= satir[0]) return satir[idx];
    const son = P.icra.tebligat[P.icra.tebligat.length - 1];
    const ekAdet = Math.ceil((agirlikGr - son[0]) / 1000);
    return son[idx] + ekAdet * P.icra.tebligatEk[idx - 1];
  }

  function icraMasrafi(inp) {
    const I = P.icra;
    const s = { uyarilar: [], acilis: [], kapak: [], ek: [] };
    const asil = num(inp.asil);
    if (asil <= 0) { s.hata = 'Asıl alacak tutarını giriniz.'; return s; }
    const bas = parseDate(inp.faizBas), takip = parseDate(inp.takipTarihi), odeme = parseDate(inp.odemeTarihi);
    const oran = num(inp.faizOrani);
    let faizTakipOnce = 0, faiz = 0;
    if (oran > 0 && bas) {
      if (takip && takip >= bas) faizTakipOnce = asil * oran / 100 * daysBetween(bas, takip) / 365;
      if (odeme && odeme >= bas) faiz = asil * oran / 100 * daysBetween(bas, odeme) / 365;
      else if (odeme) s.uyarilar.push('Ödeme/tahsil tarihi faiz başlangıcından önce olamaz.');
    }
    s.faiz = faiz;
    s.faizTakipOnce = faizTakipOnce;

    const avukat = !!inp.avukat;
    const borcluSayisi = Math.max(1, parseInt(inp.borclu, 10) || 1);
    const tebAdet = Math.max(1, parseInt(inp.tebAdet, 10) || 1);
    const agirlik = num(inp.agirlik) || 100;
    let tebBirim = num(inp.tebUcreti);
    if (!(tebBirim > 0)) tebBirim = tebligatUcret(inp.tebTur || 'normal', agirlik);
    const uets = inp.uets ? I.uetsGonderi : 0;
    s.tebBirim = tebBirim;

    /* Alacaklı açılış masrafları */
    const peshinMatrah = asil + faizTakipOnce;
    const basvurma = I.basvurmaHarci;
    const peshin = peshinMatrah * I.peshinHarcOran;
    const suret = avukat ? I.vekaletSuret : 0;
    const pul = avukat ? I.vekaletPulu : 0;
    const tebToplam = (tebBirim + uets) * borcluSayisi * tebAdet;
    s.acilis = [
      ['İcra başvurma harcı', basvurma],
      ['Peşin harç (' + (I.peshinHarcOran * 1000).toString().replace('.', ',') + '‰ — asıl alacak + takip öncesi faiz)', peshin],
      ['Vekâletname suret harcı', suret],
      ['Vekâlet / baro pulu', pul],
      ['Tebligat gideri (' + borcluSayisi + ' borçlu × ' + tebAdet + ' tebligat)', tebToplam]
    ];
    s.acilisToplam = basvurma + peshin + suret + pul + tebToplam;

    /* Vekâlet ücreti (AAÜT) */
    let vekaletUcreti = 0;
    if (avukat) {
      const taban = inp.tahliye ? I_vekaletTahliye() : P.aaut.icraDairesi;
      vekaletUcreti = Math.min(taban, asil);
      if (inp.odemeSuresinde) vekaletUcreti *= 0.75;
    }
    s.vekalet = vekaletUcreti;

    /* Tahsil harcı */
    const asama = I.tahsilHarci[inp.asama] || I.tahsilHarci.haciz0;
    const hMatrah = asil + faiz + (inp.harcVekaletDahil ? vekaletUcreti : 0);
    const tahsilHarci = hMatrah * asama.oran;
    s.tahsilMatrah = hMatrah;
    s.asama = asama;
    s.tahsilHarci = tahsilHarci;

    /* Ek masraflar */
    const hacizAdet = Math.max(0, parseInt(inp.hacizAdet, 10) || 0);
    const hacizHarci = hacizAdet * I.hacizSatisHarci;
    const digerGider = num(inp.digerGider);
    s.hacizHarci = hacizHarci;
    s.digerGider = digerGider;

    /* Borçlu kapak hesabı */
    s.kapak = [
      ['Asıl alacak', asil],
      ['İşlemiş faiz', faiz],
      ['Vekâlet ücreti (AAÜT)', vekaletUcreti],
      ['Tahsil harcı (%' + (asama.oran * 100).toFixed(2).replace('.', ',') + ')', tahsilHarci],
      ['Alacaklıya iade edilecek açılış masrafları', s.acilisToplam],
      ['Haciz / satış harcı', hacizHarci],
      ['Diğer giderler (muhafaza, bilirkişi, sorgu vb.)', digerGider]
    ];
    s.borcluToplam = asil + faiz + vekaletUcreti + tahsilHarci + s.acilisToplam + hacizHarci + digerGider;

    /* Alacaklı net tahsilat */
    const tahsilEdilen = asil + faiz + vekaletUcreti;
    const cezaevi = (asil + faiz + vekaletUcreti) * I.cezaeviHarci;
    s.tahsilEdilen = tahsilEdilen;
    s.cezaevi = cezaevi;
    s.alacakliGeriAlinan = s.acilisToplam + hacizHarci + digerGider;
    s.alacakliNet = tahsilEdilen - cezaevi + s.alacakliGeriAlinan;
    s.alacakliNetKesintisiz = tahsilEdilen;
    s.tebToplam = tebToplam;

    if (asama.oran === 0) s.uyarilar.push('Ödeme emri tebliğinden önce yapılan ödemelerde tahsil harcı doğmaz.');
    return s;
  }
  function I_vekaletTahliye() { return P.aaut.icraTahliye; }

  /* ------------------------------------------------------------
     SERBEST MESLEK MAKBUZU
     ------------------------------------------------------------ */
  function smm(inp) {
    const s = { uyarilar: [] };
    const kdvOran = num(inp.kdv) / 100;
    const stopajOran = num(inp.stopaj) / 100;
    const tevkifatOran = inp.tevkifat === 'yok' ? 0 : eval_frac(inp.tevkifat);
    const limit = num(inp.tevkifatLimit) || P.smm.tevkifatLimit;
    const tutar = num(inp.tutar);
    if (tutar <= 0) { s.hata = 'Tutar giriniz.'; return s; }

    const hesap = m => {
      const kdv = m * kdvOran;
      const kdvDahil = m + kdv;
      const tevk = tevkifatOran > 0 && kdvDahil > limit ? kdv * tevkifatOran : 0;
      const stopaj = m * stopajOran;
      const tahsil = m + kdv - stopaj - tevk;
      return { matrah: m, kdv, kdvDahil, tevk, tevkUyg: tevk > 0, stopaj, tahsil, net: m - stopaj };
    };

    let m;
    if (inp.mod === 'brut') m = tutar;
    else if (inp.mod === 'net') m = tutar / (1 - stopajOran);
    else if (inp.mod === 'kdvdahil') m = tutar / (1 + kdvOran);
    else {
      /* tahsil edilecek tutardan brüte: tevkifat eşiğine göre iki senaryo */
      const sc1 = tutar / (1 + kdvOran - stopajOran);                                 // tevkifat yok
      const sc2 = tutar / (1 + kdvOran - stopajOran - kdvOran * tevkifatOran);       // tevkifat var
      const h1 = hesap(sc1), h2 = hesap(sc2);
      const g1 = !h1.tevkUyg, g2 = h2.tevkUyg;
      if (tevkifatOran > 0 && g1 && g2 && Math.abs(sc1 - sc2) > 0.005) {
        s.senaryolar = [h1, h2];
        s.uyarilar.push('Tutar, KDV tevkifatı eşiği çevresinde iki farklı brüt tutarla uyumlu görünüyor. Gerçek makbuz tutarına göre doğru senaryoyu seçiniz.');
        m = sc1;
      } else m = (tevkifatOran > 0 && g2) ? sc2 : sc1;
    }
    s.sonuc = hesap(m);
    s.tevkifatOran = tevkifatOran;
    s.limit = limit;
    if (tevkifatOran > 0 && !s.sonuc.tevkUyg) s.uyarilar.push('KDV dahil toplam ' + limit.toLocaleString('tr-TR') + ' TL’yi aşmadığı için KDV tevkifatı uygulanmadı.');
    return s;
  }
  function eval_frac(str) {
    const m = /^(\d+)\/(\d+)$/.exec(String(str));
    return m ? (+m[1]) / (+m[2]) : 0;
  }

  return {
    P, AYLAR, r2, num, parseDate, iso, ymd,
    gvVergi, gvArtis, gvIstisna, damgaIstisna, ucretHesap, maasYillik, netdenBrute,
    kidemTavanBul, ihbarHafta, iscilik,
    nispiTarife, vekalet, arabuluculuk, kiraArtis, tebligatUcret, icraMasrafi, smm
  };
});
