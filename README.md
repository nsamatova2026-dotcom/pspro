# RuhAI — psixologik tadqiqotlar platformasi

RuhAI tadqiqotchiga instrumentlar bankidan kerakli psixodiagnostik metodikalar va treyninglarni tanlab tadqiqot tuzish, respondentlarni kod orqali taklif qilish, ularning ishtirokini kuzatish va natijalarni statistik tahlil qilish imkonini beradi. Platforma quyidagi PhD dissertatsiyasi doirasida ishlab chiqilgan:

> **«O'zbek tilidagi sun'iy intellekt suhbatdosh-agenti yordamida talabalarda xavotir va depressiv holatlarni erta aniqlash hamda psixologik qo'llab-quvvatlashning psixologik mexanizmlari»**

Dissertatsiya mavzusi, vazifalari va gipotezalari: [docs/dissertatsiya-mavzusi.md](docs/dissertatsiya-mavzusi.md).

## Imkoniyatlar

### Tadqiqotchi uchun
| Bo'lim | Nima qiladi |
|---|---|
| **Tadqiqotlar** | Tadqiqot konstruktori: metodikalarni tanlash, o'lchov to'lqinlari (T0, T1, T2… va ochilish kuni), bir, ikki yoki uch guruhli dizayn, har bir guruhga treyninglar tayinlash, xabardor qilingan rozilik matni, qo'shilish kodi va taklif havolasi |
| | Respondentlar jadvali: guruh, har bir to'lqin bo'yicha bajarilish, treyninglar soni, oxirgi faollik, xavf signali; respondent tafsilotlari |
| | Muvozanatlashtirilgan randomizatsiya: yangi respondent eng kam to'lgan guruhga tushadi (yoki oddiy tasodifiy taqsimlash) |
| | Statistika: n, M (SD) umumiy va guruhlar bo'yicha, Kronbax α, guruhlar farqi (Welch t-testi, Koen d), T0 dan tanlangan to'lqingacha o'zgarish, korrelyatsiya matritsasi, tanlanma tavsifi, treyninglar samarasi |
| | Savollar tahlili (validatsiya uchun): har bir savolning M va SD, savol – qolgan ball korrelyatsiyasi, «savol olib tashlansa α»; muammoli savollar belgilanadi |
| | APA uslubidagi natijalar matni: tanlanma, ishonchlilik, guruhlar farqi, o'zgarish va korrelyatsiyalar bo'yicha avtomatik tuzilgan matn |
| | Eksport: respondent × to'lqin formatidagi CSV (har bir savolning xom javobi, umumiy ball, subshkalalar, demografiya) va treyninglar jurnali — SPSS, R, Excel uchun |
| | Namuna rejimi: 80 respondentlik simulyatsiya qilingan ma'lumotlarda barcha tahlillarni ko'rish |
| **Instrumentlar banki** | Har bir metodikaning savollari, javob shkalasi, hisoblash qoidasi, teskari savollar, subshkalalar, talqin chegaralari, manba va foydalanish shartlari |
| | Muallif metodikasi konstruktori: o'z so'rovnomangizni (savollar, javob shkalasi, teskari savollar, subshkalalar, talqin chegaralari) yaratib, tadqiqotlarda ishlatish |
| **Psixolog paneli** | Umumiy rozilik bergan talabalar monitoringi, xavf signallari, AI xulosa |
| **Gipotezalar** | Randomizatsiya vositasi va H2/H3 gipotezalarini tekshirish |

### Respondent uchun
| Bo'lim | Nima qiladi |
|---|---|
| **Tadqiqotlarim** | Kod yoki havola orqali tadqiqotga qo'shilish, rozilik, ochilgan o'lchovlar va tayinlangan treyninglar ro'yxati, tadqiqotdan chiqish (javoblar o'chiriladi) |
| **Testlar** | Bankdagi istalgan shkala bilan o'z-o'zini baholash va natijalar tarixi |
| **Treyninglar** | 12 ta mashq: taymerli nafas mashqlari, bosqichli va yozma KXT mashqlari; mashqdan oldin va keyin kayfiyat bahosi |
| **Kundalik**, **Suhbatdosh** | Kunlik holat, AI matn tahlili, KXT asosidagi AI-suhbatdosh (bepul Workers AI yoki Gemini orqali) |

### Instrumentlar banki
| Metodika | Soha | Savollar |
|---|---|---|
| PHQ-9 | Depressiya | 9 |
| GAD-7 | Xavotir | 7 |
| PSS-10 | Stress | 10 |
| WHO-5, SWLS | Farovonlik | 5, 5 |
| RSES | O'z-o'zini baholash | 10 |
| BRS, GSE | Bardoshlilik | 6, 10 |
| UCLA-3, MSPSS | Ijtimoiy munosabatlar | 3, 12 |
| AI'ga ishonch | AI bilan munosabat | 6 |
| Demografik anketa | Umumiy ma'lumot | 6 |

Treyninglar: 4-7-8 nafas, kvadrat nafas, 5-4-3-2-1 yerga tayanish, fikrlar kundaligi, progressiv mushak relaksatsiyasi, uchta yaxshi narsa, xulq-atvorni faollashtirish, muammoni hal qilish, o'ziga mehr ko'rsatish, uyqu gigiyenasi, xavotir vaqti, imtihon xavotirini boshqarish.

O'z metodikangizni **Instrumentlar banki → Muallif metodikasi yaratish** bo'limida kod yozmasdan qo'shishingiz mumkin. Standart bankni kengaytirish uchun [`public/js/banks.js`](public/js/banks.js) fayliga xuddi shu tuzilishda yozuv qo'shing.

## Cloudflare'ga joylash

Platforma bitta Cloudflare Worker sifatida ishlaydi: sahifa `public/` papkasidan beriladi, `/api/*` so'rovlarini [`src/worker.js`](src/worker.js) qayta ishlaydi, ma'lumotlar Cloudflare D1 bazasida saqlanadi. D1 bazasi birinchi deploy'da avtomatik yaratiladi, jadvallarni server birinchi so'rovda o'zi tuzadi.

### GitHub orqali (tavsiya etiladi)
1. Cloudflare panelida *Workers & Pages → Create → Import a repository* orqali shu repozitoriyni ulang. Deploy command: `npx wrangler deploy` (standart qiymat).
2. Worker nomi [`wrangler.toml`](wrangler.toml) dagi `name` bilan bir xil bo'lishi kerak (hozir `pspro`). Agar panelda boshqa nom bergan bo'lsangiz, `name` qatorini o'sha nomga o'zgartiring.
3. Worker sahifasida *Settings → Variables and Secrets → Add* orqali **Secret** turidagi `PSY_TOKEN` qo'shing — bu psixolog va tadqiqotchi kiradigan maxfiy kalit. Uzun tasodifiy satr tanlang, masalan `openssl rand -hex 24` buyrug'i bilan.
4. *Deployments* bo'limida qayta deploy qiling (yoki `main` branchga yangi commit yuklang).

Shundan keyin `main` branchga har bir push saytni avtomatik yangilaydi. Sayt `https://pspro.<hisobingiz>.workers.dev` ko'rinishidagi manzilda ochiladi.

### Buyruq qatori orqali
```bash
npm install
npx wrangler login
npm run deploy
npx wrangler secret put PSY_TOKEN
```

### AI provayderi (bepul variantlar)
AI-suhbatdosh, kundalik tahlili va psixolog uchun AI xulosa quyidagi provayderlardan biri bilan ishlaydi. Provayder [`wrangler.toml`](wrangler.toml) dagi `AI_PROVIDER` qatorida tanlanadi.

| Provayder | Narxi | Nima kerak | Izoh |
|---|---|---|---|
| `workers-ai` (standart) | Bepul: kuniga 10 000 «neyron» | Hech narsa — Cloudflare hisobiga kiritilgan | Standart model `@cf/google/gemma-3-12b-it`. O'zbek tilida javob sifati o'rtacha |
| `gemini` | Bepul tarif (daqiqalik va kunlik limit bilan) | [Google AI Studio](https://aistudio.google.com/apikey)da bepul kalit | O'zbek tilini yaxshiroq tushunadi. Kalitni `GEMINI_API_KEY` nomli Secret sifatida qo'shing |
| `anthropic` | Pullik | `ANTHROPIC_API_KEY` Secret | Eng yuqori sifat |

Bepul limit tugasa, platforma AI so'rovlariga «Bugungi limit tugadi» deb javob beradi; testlar, treyninglar va tadqiqotlar AI'siz ham to'liq ishlaydi.

**Maxfiylik bo'yicha muhim eslatma.** Google'ning bepul tarif shartlariga ko'ra, bepul Gemini API'ga yuborilgan ma'lumotlar Google mahsulotlarini yaxshilash uchun ishlatilishi mumkin. Respondentlarning kundalik yozuvlari va suhbatlari sezgir psixologik ma'lumot bo'lgani uchun, haqiqiy tadqiqotda Workers AI yoki pullik tarifni tanlang yoki rozilik matnida buni respondentlarga aniq ayting.

### Sozlamalar
| O'zgaruvchi | Vazifasi | Standart qiymat |
|---|---|---|
| `AI_PROVIDER` | `workers-ai`, `gemini` yoki `anthropic`; bo'sh bo'lsa, mavjud kalitga qarab tanlanadi | `workers-ai` |
| `WORKERS_AI_MODEL` | Workers AI modeli | `@cf/google/gemma-3-12b-it` |
| `GEMINI_MODEL` | Gemini modeli | `gemini-2.5-flash` |
| `ANTHROPIC_MODEL` | Claude modeli | `claude-opus-5-5` |
| `AI_DAILY_LIMIT` | Bitta IP manzildan kunlik AI so'rovlari soni (bepul kvotani tejash) | `50` |

Bu qiymatlar `wrangler.toml` da saqlanadi va har bir deploy'da qo'llanadi; ularni panelda emas, shu faylda o'zgartiring. Maxfiy kalitlar (`PSY_TOKEN`, `GEMINI_API_KEY`) esa panelda saqlanadi va deploy'da o'chmaydi.

### Mahalliy ishga tushirish
```bash
cp .dev.vars.example .dev.vars   # kalitlarni kiriting
npx wrangler login               # Workers AI har doim Cloudflare serverlarida ishlaydi
npm run dev                      # http://localhost:8787
```

## Foydalanish tartibi

Birinchi kirishda platforma «Respondent» yoki «Tadqiqotchi» rolini tanlashni so'raydi va faqat shu rolga kerakli bo'limlarni ko'rsatadi. Rolni istalgan vaqtda yon menyudagi tugma orqali almashtirish mumkin. Telefonda bo'limlar pastki menyuda joylashgan.

**Tadqiqotchi**
1. **Boshqaruv paneli**da tadqiqotchi kaliti (`PSY_TOKEN`) bilan kiradi. Panelda faol tadqiqotlar, respondentlar soni, so'nggi javoblar, ochiq xavf signallari va «Ishni boshlash» bo'yicha 4 qadam ko'rinadi.
2. **Yangi tadqiqot** tugmasini bosib, tayyor shablonni tanlaydi: ruhiy holat skriningi, farovonlik va bardoshlilik, intervensiya samaradorligi (RNT), metodikani validatsiya qilish yoki bo'sh tadqiqot.
3. Usta 4 qadamda olib boradi: asosiy ma'lumot va rozilik matni → metodikalar → o'lchovlar va guruhlar → tekshirish. Oxirida «Saqlash va e'lon qilish» bosiladi.
4. Tadqiqot sahifasida kod, havola va QR-kod chiqadi. «Taklif matnini nusxalash» Telegram yoki pochta uchun tayyor matn beradi, «Ekranda ko'rsatish» kod va QR-kodni auditoriyada proyektorga katta qilib chiqaradi.
5. Respondentlar ishtirokini kuzatadi, statistika, savollar tahlili va APA matnini ko'radi, ma'lumotlarni CSV ko'rinishida yuklab oladi.

**Respondent**
1. Taklif havolasi yoki QR-kod orqali kiradi (rol avtomatik tanlanadi) yoki bosh sahifada kodni kiritadi.
2. Rozilik matnini tasdiqlaydi. Bosh sahifada bugungi vazifalar, oxirgi natija va tezkor harakatlar (test, bugungi mashq, kunlik holat, suhbatdosh) ko'rinadi.
3. So'rovnomalar bitta ekranda bitta savol ko'rinishida ochiladi: javob tanlanganda keyingi savolga avtomatik o'tiladi. Xohlasa, «Hammasini ko'rsatish» tugmasi bilan barcha savollarni bir sahifada ko'radi.

## API
| Yo'l | Kim uchun | Vazifasi |
|---|---|---|
| `GET /api/health` | hamma | Server holati |
| `GET/PUT /api/me` | respondent | O'z hujjati (`x-participant-id` sarlavhasi bilan) |
| `GET /api/studies/code/:code` | hamma | Faol tadqiqotni kod bo'yicha topish |
| `GET /api/studies/:id` | respondent | Tadqiqot ma'lumoti (qoralama yashirin) |
| `POST /api/studies/:id/assign` | respondent | Muvozanatlashtirilgan randomizatsiya: guruhni tanlash |
| `GET /api/instruments` | hamma | Muallif metodikalari ro'yxati |
| `PUT/DELETE /api/instruments/:id` | tadqiqotchi | Muallif metodikasini saqlash yoki o'chirish |
| `GET /api/studies`, `PUT/DELETE /api/studies/:id` | tadqiqotchi | Tadqiqotlarni boshqarish |
| `GET /api/panel`, `GET/PATCH /api/panel/:id` | tadqiqotchi | Respondentlar ma'lumotlari, xavf signalini ko'rib chiqish |
| `POST /api/auth` | tadqiqotchi | Kalitni tekshirish |
| `POST /api/ai` | respondent | AI so'rovi (tanlangan provayder orqali) |

Tadqiqotchi so'rovlari `Authorization: Bearer <PSY_TOKEN>` sarlavhasini talab qiladi.

## Ma'lumotlar va maxfiylik

- Respondent ismi so'ralmaydi: brauzerda yaratilgan tasodifiy identifikator va anonim kod ishlatiladi.
- Tadqiqotga qo'shilish rozilik matnini tasdiqlashni talab qiladi. Respondent istalgan vaqtda chiqib ketishi mumkin, bu holda uning tadqiqotdagi javoblari o'chiriladi.
- Yozma treyninglarning matni faqat respondent qurilmasida qoladi; tadqiqotchi mashq bajarilganini va kayfiyat ko'rsatkichlarini ko'radi.
- Suhbat matni saqlanmaydi, faqat xavf signali sanasi qayd etiladi.
- AI kalitlari faqat serverda saqlanadi va brauzerga yuborilmaydi.

## Cheklovlar

- Metodikalarning o'zbekcha matnlari ishchi tarjima. Ilmiy tadqiqotda qo'llashdan oldin teskari tarjima va psixometrik validatsiya talab etiladi.
- «AI'ga ishonch» shkalasi muallif ishlanmasi va omilli tahlil orqali tekshirilishi kerak.
- Muvozanatlashtirilgan randomizatsiya Cloudflare serverida ishlaydi. Bir vaqtda qo'shilgan respondentlar bitta guruhga tushishi mumkin, shuning uchun guruhlar orasida 1–2 kishilik farq bo'lishi tabiiy.
- Muallif metodikalari psixometrik validatsiyadan o'tmagan; «Savollar tahlili» va Kronbax α validatsiyaning faqat birinchi qadami (omilli tahlil uchun ma'lumotlarni eksport qiling).
- APA matni avtomatik tuziladi: raqamlarni tekshirib, talqinni o'zingiz to'ldiring.
- Uch guruhli dizaynda platforma birinchi ikki guruhni solishtiradi; to'liq tahlil uchun ma'lumotlarni eksport qilib, ANOVA o'tkazing.
- Haqiqiy tadqiqotdan oldin etika qo'mitasi ruxsati talab etiladi.
- RuhAI tashxis qo'ymaydi va psixologni almashtirmaydi. Shoshilinch holatda: **103** (tez yordam) yoki **112**.
