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
| | Statistika: n, M (SD) umumiy va guruhlar bo'yicha, Kronbax α, guruhlar farqi (Welch t-testi, Koen d), T0 dan tanlangan to'lqingacha o'zgarish, korrelyatsiya matritsasi, tanlanma tavsifi, treyninglar samarasi |
| | Eksport: respondent × to'lqin formatidagi CSV (har bir savolning xom javobi, umumiy ball, subshkalalar, demografiya) va treyninglar jurnali — SPSS, R, Excel uchun |
| | Namuna rejimi: 80 respondentlik simulyatsiya qilingan ma'lumotlarda barcha tahlillarni ko'rish |
| **Instrumentlar banki** | Har bir metodikaning savollari, javob shkalasi, hisoblash qoidasi, teskari savollar, subshkalalar, talqin chegaralari, manba va foydalanish shartlari |
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

Yangi metodika yoki treyning qo'shish uchun [`public/js/banks.js`](public/js/banks.js) fayliga xuddi shu tuzilishda yozuv qo'shing.

## Cloudflare'ga joylash

Platforma Cloudflare Pages'da ishlaydi: sahifa `public/` papkasida, server funksiyalari `functions/` papkasida, ma'lumotlar Cloudflare D1 bazasida saqlanadi.

### 1. Tayyorgarlik
```bash
npm install
npx wrangler login
```

### 2. Ma'lumotlar bazasi
```bash
npx wrangler d1 create ruhai-db
```
Buyruq bergan `database_id` ni [`wrangler.toml`](wrangler.toml) faylidagi `database_id` qatoriga qo'ying, so'ng jadvallarni yarating:
```bash
npm run db:init
```

### 3. Loyiha va maxfiy kalit
```bash
npx wrangler pages project create ruhai --production-branch main
npx wrangler pages secret put PSY_TOKEN --project-name ruhai
```
`PSY_TOKEN` — psixolog va tadqiqotchi kiradigan maxfiy kalit. Uzun tasodifiy satr tanlang, masalan `openssl rand -hex 24` buyrug'i bilan.

### AI provayderi (bepul variantlar)
AI-suhbatdosh, kundalik tahlili va psixolog uchun AI xulosa quyidagi provayderlardan biri bilan ishlaydi. Provayder [`wrangler.toml`](wrangler.toml) dagi `AI_PROVIDER` qatorida tanlanadi.

| Provayder | Narxi | Nima kerak | Izoh |
|---|---|---|---|
| `workers-ai` (standart) | Bepul: kuniga 10 000 «neyron» | Hech narsa — Cloudflare hisobiga kiritilgan | Standart model `@cf/google/gemma-3-12b-it`. O'zbek tilida javob sifati o'rtacha |
| `gemini` | Bepul tarif (daqiqalik va kunlik limit bilan) | [Google AI Studio](https://aistudio.google.com/apikey)da bepul kalit | O'zbek tilini yaxshiroq tushunadi. Kalitni kiriting: `npx wrangler pages secret put GEMINI_API_KEY --project-name ruhai` |
| `anthropic` | Pullik | `ANTHROPIC_API_KEY` | Eng yuqori sifat |

Bepul limit tugasa, platforma AI so'rovlariga «Bugungi limit tugadi» deb javob beradi; testlar, treyninglar va tadqiqotlar AI'siz ham to'liq ishlaydi.

**Maxfiylik bo'yicha muhim eslatma.** Google'ning bepul tarif shartlariga ko'ra, bepul Gemini API'ga yuborilgan ma'lumotlar Google mahsulotlarini yaxshilash uchun ishlatilishi mumkin. Respondentlarning kundalik yozuvlari va suhbatlari sezgir psixologik ma'lumot bo'lgani uchun, haqiqiy tadqiqotda Workers AI yoki pullik tarifni tanlang yoki rozilik matnida buni respondentlarga aniq ayting.

### 4. Joylash
```bash
npm run deploy
```
Sayt `https://ruhai.pages.dev` ko'rinishidagi manzilda ochiladi.

**Muqobil yo'l (GitHub orqali avtomatik):** Cloudflare panelida *Workers & Pages → Create → Pages → Connect to Git* orqali shu repozitoriyni ulang. Build command bo'sh, build output directory `public`. *Settings → Bindings* bo'limida D1 bazasini `DB` nomi bilan va Workers AI'ni `AI` nomi bilan bog'lang, *Settings → Variables and Secrets* bo'limida `PSY_TOKEN` ni (Gemini ishlatsangiz `GEMINI_API_KEY` ni ham) kiriting. Shundan keyin `main` branchga har bir push saytni avtomatik yangilaydi.

### Sozlamalar
| O'zgaruvchi | Vazifasi | Standart qiymat |
|---|---|---|
| `AI_PROVIDER` | `workers-ai`, `gemini` yoki `anthropic`; bo'sh bo'lsa, mavjud kalitga qarab tanlanadi | `workers-ai` |
| `WORKERS_AI_MODEL` | Workers AI modeli | `@cf/google/gemma-3-12b-it` |
| `GEMINI_MODEL` | Gemini modeli | `gemini-2.5-flash` |
| `ANTHROPIC_MODEL` | Claude modeli | `claude-opus-5-5` |
| `AI_DAILY_LIMIT` | Bitta IP manzildan kunlik AI so'rovlari soni (bepul kvotani tejash) | `50` |

### Mahalliy ishga tushirish
```bash
cp .dev.vars.example .dev.vars   # kalitlarni kiriting
npm run db:init:local
npm run dev                      # http://localhost:8788
```
Workers AI har doim Cloudflare serverlarida ishlaydi, shuning uchun mahalliy rejimda ham `npx wrangler login` qilingan bo'lishi kerak.

## Foydalanish tartibi

1. Tadqiqotchi saytni ochadi, **Psixolog paneli** bo'limida `PSY_TOKEN` kaliti bilan kiradi.
2. **Tadqiqotlar → Yangi tadqiqot**: nomi, rozilik matni, metodikalar, to'lqinlar, guruhlar va treyninglarni belgilaydi, holatini «Faol» qilib saqlaydi.
3. Tadqiqot sahifasidagi kod yoki taklif havolasini respondentlarga yuboradi.
4. Respondent havolani ochadi, rozilik beradi va tasodifiy ravishda guruhga taqsimlanadi. O'lchovlar belgilangan kunlarda ochiladi.
5. Tadqiqotchi respondentlar ishtirokini kuzatadi, statistikani ko'radi va ma'lumotlarni CSV ko'rinishida yuklab oladi.

## API
| Yo'l | Kim uchun | Vazifasi |
|---|---|---|
| `GET /api/health` | hamma | Server holati |
| `GET/PUT /api/me` | respondent | O'z hujjati (`x-participant-id` sarlavhasi bilan) |
| `GET /api/studies/code/:code` | hamma | Faol tadqiqotni kod bo'yicha topish |
| `GET /api/studies/:id` | respondent | Tadqiqot ma'lumoti (qoralama yashirin) |
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
- Guruhlarga taqsimlash oddiy tasodifiy usulda bajariladi; kichik tanlanmalarda guruhlar soni teng bo'lmasligi mumkin.
- Uch guruhli dizaynda platforma birinchi ikki guruhni solishtiradi; to'liq tahlil uchun ma'lumotlarni eksport qilib, ANOVA o'tkazing.
- Haqiqiy tadqiqotdan oldin etika qo'mitasi ruxsati talab etiladi.
- RuhAI tashxis qo'ymaydi va psixologni almashtirmaydi. Shoshilinch holatda: **103** (tez yordam) yoki **112**.
