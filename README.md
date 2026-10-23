# RuhAI — talabalar psixologik salomatligi platformasi

Ushbu repozitoriy quyidagi PhD dissertatsiyasi doirasida ishlab chiqilgan platforma prototipini o'z ichiga oladi:

> **«O'zbek tilidagi sun'iy intellekt suhbatdosh-agenti yordamida talabalarda xavotir va depressiv holatlarni erta aniqlash hamda psixologik qo'llab-quvvatlashning psixologik mexanizmlari»**

Dissertatsiya mavzusi, maqsadi, vazifalari, gipotezalari va metodlari: [docs/dissertatsiya-mavzusi.md](docs/dissertatsiya-mavzusi.md).

## Platforma modullari

| Modul | Vazifasi | Dissertatsiyadagi o'rni |
|---|---|---|
| **Testlar** | PHQ-9 (depressiya), GAD-7 (xavotir) va «AI'ga ishonch» shkalasi; ballar avtomatik hisoblanadi, natijalar dinamikasi grafikda ko'rinadi | 2-vazifa (validatsiya), H3 |
| **Kunlik holat** | Har kuni kayfiyat, stress va uyqu qaydi | Ekologik momentli baholash (EMA) |
| **Kundalik va NLP-tahlil** | AI matnning emotsional ohangi, emotsiyalar, kognitiv buzilishlar va xavf darajasini aniqlaydi | H1 |
| **AI-suhbatdosh** | O'zbek tilida kognitiv-xulqiy terapiya (KXT) usullariga asoslangan suhbat, 4-7-8 nafas mashqi | 4-vazifa, H2 |
| **Xavf signali** | PHQ-9 ning 9-savoli, kundalik yoki suhbatda xavf belgilari aniqlansa, yordam raqamlari ko'rsatiladi va psixologga signal yuboriladi | Etik protokol |
| **Psixolog paneli** | Anonim kodlar bilan talabalar ro'yxati, xavf bo'yicha saralash, talaba tafsilotlari, AI xulosa | 5-modul |
| **Tadqiqot moduli** | Blokli randomizatsiya, ma'lumotlarni CSV eksport, H2 (Welch t-testi, Cohen d) va H3 (Pirson korrelyatsiyasi) avtomatik tekshiruvi | 5–6-vazifalar |

## Ishga tushirish

Platforma bitta fayldan iborat: [`index.html`](index.html).

- **To'liq rejim (claude.ai Artifact).** AI-suhbatdosh, AI matn tahlili, AI xulosa va umumiy ma'lumotlar bazasi (talaba natijalari psixolog paneliga real vaqtda tushishi) faqat claude.ai Artifact sifatida ochilganda ishlaydi.
- **Mustaqil rejim (brauzer yoki GitHub Pages).** `index.html` ni brauzerda oching. Testlar, kunlik holat, lug'atga asoslangan matn tahlili, nafas mashqi, namuna psixolog paneli, randomizatsiya va statistika ishlaydi; natijalar faqat shu brauzerda saqlanadi.

GitHub Pages orqali joylash uchun: repozitoriy **Settings → Pages → Branch: `main`, papka: `/ (root)`**.

## Ma'lumotlar va maxfiylik

- Talaba rozilik bermaguncha hech qanday ma'lumot yuborilmaydi; rozilik bekor qilinsa, yuborilgan ma'lumotlar o'chiriladi.
- Psixolog talabaning ismini emas, anonim kodini ko'radi; kundalik matnini ulashish ixtiyoriy.
- Suhbat matni saqlanmaydi, faqat xavf signali sanasi qayd etiladi.

## Cheklovlar

- Bu tadqiqot prototipi. Haqiqiy tadqiqotdan oldin etika qo'mitasi ruxsati talab etiladi.
- PHQ-9 va GAD-7 ning o'zbekcha tarjimasi ishchi variant; validatsiya dissertatsiya vazifalaridan biri.
- «AI'ga ishonch» shkalasi muallif tomonidan tuzilgan va omilli tahlil orqali tekshirilishi kerak.
- Statistika bo'limidagi H3 tahlili dastlabki korrelyatsion baho; moderatsiya SPSS PROCESS (1-model) orqali tekshiriladi.
- RuhAI tashxis qo'ymaydi va psixologni almashtirmaydi. Shoshilinch holatda: **103** (tez yordam) yoki **112**.
