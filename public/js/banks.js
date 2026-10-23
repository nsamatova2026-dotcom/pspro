// RuhAI instrumentlar banki: psixodiagnostik metodikalar va psixologik treyninglar.
// Barcha o'zbekcha matnlar ishchi tarjima: ilmiy tadqiqotda qo'llashdan oldin
// teskari tarjima (back-translation) va psixometrik validatsiya talab etiladi.
(() => {
const FREQ4 = ["Umuman yo'q", "Bir necha kun", "Kunlarning yarmidan ko'pida", "Deyarli har kuni"];
const AGREE5 = ["Mutlaqo qo'shilmayman", "Qo'shilmayman", "Bilmayman", "Qo'shilaman", "To'liq qo'shilaman"];
const AGREE4 = ["Mutlaqo qo'shilmayman", "Qo'shilmayman", "Qo'shilaman", "To'liq qo'shilaman"];
const AGREE7 = ["Mutlaqo qo'shilmayman", "Qo'shilmayman", "Biroz qo'shilmayman", "Betaraf", "Biroz qo'shilaman", "Qo'shilaman", "Mutlaqo qo'shilaman"];
const PHQ_LEAD = "Oxirgi 2 hafta davomida quyidagi holatlar sizni qanchalik tez-tez bezovta qildi?";

const INSTRUMENTS = {
  phq: {
    name: "PHQ-9", full: "Bemor salomatligi so'rovnomasi (depressiya)", domain: "Depressiya", minutes: 3,
    lead: PHQ_LEAD, opts: FREQ4, start: 0, scoring: "sum", min: 0, max: 27, sosItem: 8,
    items: [
      "Biror ishga qiziqish yoki undan zavq olishning kamligi",
      "Tushkunlik, g'amginlik yoki umidsizlik hissi",
      "Uxlab qolishda qiyinchilik, tez-tez uyg'onish yoki haddan tashqari ko'p uxlash",
      "Charchoq yoki kuch-quvvat yetishmasligi",
      "Ishtahaning pasayishi yoki haddan tashqari ko'p ovqatlanish",
      "O'zingizni yomon his qilish: o'zingizni muvaffaqiyatsiz deb hisoblash yoki o'zingizni va oilangizni umidsizlantirdim, deb o'ylash",
      "Diqqatni jamlashda qiyinchilik, masalan, kitob o'qish yoki video ko'rishda",
      "Atrofdagilar sezadigan darajada sekin harakatlanish yoki gapirish; yoki aksincha, bezovtalik va bir joyda tura olmaslik",
      "O'lish yaxshiroq degan yoki o'zingizga qandaydir zarar yetkazish haqidagi fikrlar"
    ],
    bands: [[0, 4, "Minimal", "ok"], [5, 9, "Yengil", "ok"], [10, 14, "O'rtacha", "warn"], [15, 19, "O'rtacha og'ir", "crit"], [20, 27, "Og'ir", "crit"]],
    source: "Kroenke K., Spitzer R.L., Williams J.B. (2001). The PHQ-9. J Gen Intern Med, 16(9), 606–613.",
    license: "Erkin foydalanish, ruxsat talab etilmaydi."
  },
  gad: {
    name: "GAD-7", full: "Umumlashgan xavotir buzilishi shkalasi", domain: "Xavotir", minutes: 2,
    lead: PHQ_LEAD, opts: FREQ4, start: 0, scoring: "sum", min: 0, max: 21,
    items: [
      "Asabiylashish, xavotir yoki tahlika hissi",
      "Xavotirlanishni to'xtata olmaslik yoki nazorat qila olmaslik",
      "Turli narsalar haqida haddan tashqari ko'p xavotirlanish",
      "Bo'shashish va dam olishning qiyinligi",
      "Bir joyda o'tira olmaydigan darajada bezovtalik",
      "Tez jahl chiqishi yoki tez ranjish",
      "Nimadir dahshatli voqea yuz berishidan qo'rquv"
    ],
    bands: [[0, 4, "Minimal", "ok"], [5, 9, "Yengil", "ok"], [10, 14, "O'rtacha", "warn"], [15, 21, "Og'ir", "crit"]],
    source: "Spitzer R.L., Kroenke K., Williams J.B., Löwe B. (2006). A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med, 166(10), 1092–1097.",
    license: "Erkin foydalanish, ruxsat talab etilmaydi."
  },
  pss: {
    name: "PSS-10", full: "Sezilgan stress shkalasi", domain: "Stress", minutes: 3,
    lead: "Oxirgi bir oy davomida quyidagi holatlar qanchalik tez-tez bo'ldi?",
    opts: ["Hech qachon", "Deyarli hech qachon", "Ba'zan", "Tez-tez", "Juda tez-tez"], start: 0,
    scoring: "sum", min: 0, max: 40, reverse: [4, 5, 7, 8],
    items: [
      "Kutilmagan voqea tufayli xafa bo'ldingiz",
      "Hayotingizdagi muhim narsalarni nazorat qila olmayotganingizni his qildingiz",
      "Asabiylashish va stress his qildingiz",
      "Shaxsiy muammolaringizni hal qila olishingizga ishonch his qildingiz",
      "Ishlar siz xohlagandek ketayotganini his qildingiz",
      "Qilishingiz kerak bo'lgan barcha ishlarni eplay olmasligingizni sezdingiz",
      "Hayotingizdagi asabiylashtiruvchi holatlarni nazorat qila oldingiz",
      "Vaziyatni to'liq nazorat qilayotganingizni his qildingiz",
      "Nazoratingizdan tashqaridagi narsalar tufayli jahlingiz chiqdi",
      "Qiyinchiliklar shunchalik ko'payib ketdiki, ularni yenga olmasligingizni his qildingiz"
    ],
    bands: [[0, 13, "Past stress", "ok"], [14, 26, "O'rtacha stress", "warn"], [27, 40, "Yuqori stress", "crit"]],
    source: "Cohen S., Kamarck T., Mermelstein R. (1983). A global measure of perceived stress. J Health Soc Behav, 24(4), 385–396.",
    license: "Notijorat ilmiy va ta'limiy maqsadlarda bepul."
  },
  who5: {
    name: "WHO-5", full: "JSST farovonlik indeksi", domain: "Farovonlik", minutes: 1,
    lead: "Oxirgi 2 hafta davomida o'zingizni qanday his qildingiz?",
    opts: ["Hech qachon", "Ba'zan", "Vaqtning yarmidan kamida", "Vaqtning yarmidan ko'pida", "Ko'pincha", "Har doim"], start: 0,
    scoring: "sum", min: 0, max: 25,
    items: [
      "Kayfiyatim yaxshi va ruhim tetik bo'ldi",
      "O'zimni xotirjam va bo'shashgan his qildim",
      "O'zimni faol va kuchga to'la his qildim",
      "Uyg'onganimda o'zimni tetik va dam olgan his qildim",
      "Kundalik hayotim meni qiziqtiradigan narsalarga to'la bo'ldi"
    ],
    bands: [[0, 7, "Juda past (depressiya ehtimoli)", "crit"], [8, 12, "Past farovonlik", "warn"], [13, 25, "Me'yoriy farovonlik", "ok"]],
    note: "Foiz ko'rinishi uchun xom ballni 4 ga ko'paytiring (0–100). 13 dan past ball chuqurroq tekshiruvni talab qiladi.",
    source: "Topp C.W., Østergaard S.D., Søndergaard S., Bech P. (2015). The WHO-5 Well-Being Index: a systematic review. Psychother Psychosom, 84(3), 167–176.",
    license: "Erkin foydalanish (JSST)."
  },
  rses: {
    name: "RSES", full: "Rozenbergning o'z-o'zini baholash shkalasi", domain: "O'z-o'zini baholash", minutes: 2,
    lead: "Quyidagi fikrlar sizga qanchalik mos keladi?", opts: AGREE4, start: 0,
    scoring: "sum", min: 0, max: 30, reverse: [2, 5, 6, 8, 9],
    items: [
      "Umuman olganda, o'zimdan mamnunman",
      "Ba'zan o'zimni umuman yaroqsiz deb o'ylayman",
      "Menda bir qator yaxshi fazilatlar bor, deb hisoblayman",
      "Ko'pchilik odamlar kabi ishlarni yaxshi bajara olaman",
      "Faxrlanadigan narsam ko'p emasdek tuyuladi",
      "Ba'zan o'zimni haqiqatan foydasiz his qilaman",
      "Men qadrli insonman, hech bo'lmaganda boshqalar bilan teng darajada",
      "O'zimni ko'proq hurmat qilishni istardim",
      "Umuman olganda, o'zimni omadsiz deb hisoblashga moyilman",
      "O'zimga ijobiy munosabatdaman"
    ],
    bands: [[0, 14, "Past", "warn"], [15, 25, "Me'yoriy", "ok"], [26, 30, "Yuqori", "ok"]],
    source: "Rosenberg M. (1965). Society and the Adolescent Self-Image. Princeton University Press.",
    license: "Ochiq foydalanish."
  },
  swls: {
    name: "SWLS", full: "Hayotdan qoniqish shkalasi", domain: "Farovonlik", minutes: 1,
    lead: "Quyidagi fikrlarga qanchalik qo'shilasiz?", opts: AGREE7, start: 1,
    scoring: "sum", min: 5, max: 35,
    items: [
      "Ko'p jihatdan hayotim idealimga yaqin",
      "Hayotim sharoitlari a'lo darajada",
      "Hayotimdan mamnunman",
      "Hozirgacha hayotda o'zim uchun muhim narsalarga erishdim",
      "Agar hayotimni qaytadan boshlasam, deyarli hech narsani o'zgartirmasdim"
    ],
    bands: [[5, 14, "Qoniqmaslik", "crit"], [15, 19, "O'rtachadan past", "warn"], [20, 25, "O'rtacha", "neutral"], [26, 35, "Yuqori qoniqish", "ok"]],
    source: "Diener E., Emmons R.A., Larsen R.J., Griffin S. (1985). The Satisfaction With Life Scale. J Pers Assess, 49(1), 71–75.",
    license: "Bepul, iqtibos keltirish sharti bilan."
  },
  brs: {
    name: "BRS", full: "Qisqa bardoshlilik (rezilientlik) shkalasi", domain: "Bardoshlilik", minutes: 1,
    lead: "Quyidagi fikrlarga qanchalik qo'shilasiz?", opts: AGREE5, start: 1,
    scoring: "mean", min: 1, max: 5, reverse: [2, 4, 6],
    items: [
      "Qiyin vaziyatlardan keyin tezda o'zimga kelaman",
      "Stressli voqealarni boshdan kechirish menga qiyin",
      "Stressli voqeadan keyin tiklanishim uchun ko'p vaqt kerak bo'lmaydi",
      "Biror yomon narsa yuz bersa, o'zimga kelishim qiyin",
      "Odatda qiyin davrlarni unchalik qiynalmay o'tkazaman",
      "Hayotimdagi muvaffaqiyatsizliklardan keyin o'zimga kelish uchun ko'p vaqt ketadi"
    ],
    bands: [[1, 2.99, "Past bardoshlilik", "warn"], [3, 4.3, "Me'yoriy", "ok"], [4.31, 5, "Yuqori", "ok"]],
    source: "Smith B.W. va boshq. (2008). The Brief Resilience Scale. Int J Behav Med, 15(3), 194–200.",
    license: "Ilmiy maqsadlarda bepul."
  },
  gse: {
    name: "GSE", full: "Umumiy o'z-o'zini samarali deb bilish shkalasi", domain: "Bardoshlilik", minutes: 2,
    lead: "Quyidagi fikrlar sizga qanchalik mos keladi?",
    opts: ["Mutlaqo noto'g'ri", "Deyarli noto'g'ri", "Ancha to'g'ri", "Mutlaqo to'g'ri"], start: 1,
    scoring: "sum", min: 10, max: 40,
    items: [
      "Yetarlicha harakat qilsam, qiyin muammolarni doim hal qila olaman",
      "Kimdir menga qarshilik qilsa ham, xohlaganimga erishish yo'lini topa olaman",
      "Maqsadlarimga sodiq qolish va ularga erishish men uchun oson",
      "Kutilmagan voqealarni samarali yenga olishimga ishonaman",
      "Topqirligim tufayli kutilmagan vaziyatlarni qanday hal qilishni bilaman",
      "Kerakli kuch sarflasam, ko'pchilik muammolarni hal qila olaman",
      "Qiyinchiliklarga xotirjam duch kela olaman, chunki o'z imkoniyatlarimga tayanaman",
      "Muammoga duch kelganimda, odatda bir nechta yechim topa olaman",
      "Muammoli vaziyatda odatda yechim haqida o'ylay olaman",
      "Nima bo'lishidan qat'i nazar, odatda uning uddasidan chiqa olaman"
    ],
    bands: [[10, 24, "Past", "warn"], [25, 34, "O'rtacha", "neutral"], [35, 40, "Yuqori", "ok"]],
    source: "Schwarzer R., Jerusalem M. (1995). Generalized Self-Efficacy scale. In: Measures in health psychology. NFER-NELSON, 35–37.",
    license: "Bepul, iqtibos keltirish sharti bilan."
  },
  ucla3: {
    name: "UCLA-3", full: "Yolg'izlik shkalasi (qisqa shakl)", domain: "Ijtimoiy munosabatlar", minutes: 1,
    lead: "Quyidagi holatlarni qanchalik tez-tez his qilasiz?",
    opts: ["Deyarli hech qachon", "Ba'zan", "Tez-tez"], start: 1,
    scoring: "sum", min: 3, max: 9,
    items: [
      "Sizga yaqin munosabat yetishmasligini",
      "O'zingizni chetda qolgandek",
      "O'zingizni boshqalardan ajralib qolgandek"
    ],
    bands: [[3, 5, "Yolg'izlik sezilmaydi", "ok"], [6, 9, "Yolg'izlik hissi", "warn"]],
    source: "Hughes M.E., Waite L.J., Hawkley L.C., Cacioppo J.T. (2004). A short scale for measuring loneliness. Res Aging, 26(6), 655–672.",
    license: "Ochiq foydalanish."
  },
  mspss: {
    name: "MSPSS", full: "Ijtimoiy qo'llab-quvvatlashni ko'p o'lchovli baholash shkalasi", domain: "Ijtimoiy munosabatlar", minutes: 3,
    lead: "Quyidagi fikrlarga qanchalik qo'shilasiz?", opts: AGREE7, start: 1,
    scoring: "mean", min: 1, max: 7,
    subscales: { "Muhim inson": [1, 2, 5, 10], "Oila": [3, 4, 8, 11], "Do'stlar": [6, 7, 9, 12] },
    items: [
      "Kerak bo'lganda yonimda bo'ladigan alohida bir inson bor",
      "Quvonch va qayg'ularimni baham ko'radigan alohida bir inson bor",
      "Oilam menga haqiqatan yordam berishga harakat qiladi",
      "Oilamdan kerakli emotsional yordam va qo'llab-quvvatlashni olaman",
      "Menga haqiqiy tasalli beradigan alohida bir inson bor",
      "Do'stlarim menga haqiqatan yordam berishga harakat qiladi",
      "Ishlar yomon ketganda do'stlarimga tayana olaman",
      "Muammolarim haqida oilam bilan gaplasha olaman",
      "Quvonch va qayg'ularimni baham ko'radigan do'stlarim bor",
      "Hayotimda his-tuyg'ularimga e'tibor beradigan alohida bir inson bor",
      "Oilam qaror qabul qilishimda yordam berishga tayyor",
      "Muammolarim haqida do'stlarim bilan gaplasha olaman"
    ],
    bands: [[1, 2.99, "Past qo'llab-quvvatlash", "warn"], [3, 5, "O'rtacha", "neutral"], [5.01, 7, "Yuqori", "ok"]],
    source: "Zimet G.D., Dahlem N.W., Zimet S.G., Farley G.K. (1988). The Multidimensional Scale of Perceived Social Support. J Pers Assess, 52(1), 30–41.",
    license: "Bepul, iqtibos keltirish sharti bilan."
  },
  trust: {
    name: "AI'ga ishonch", full: "Sun'iy intellekt suhbatdoshiga ishonch shkalasi", domain: "AI bilan munosabat", minutes: 1,
    lead: "AI-suhbatdosh haqidagi quyidagi fikrlarga qanchalik qo'shilasiz?", opts: AGREE5, start: 1,
    scoring: "sum", min: 6, max: 30,
    items: [
      "AI-suhbatdosh his-tuyg'ularimni tushunishga harakat qiladi",
      "AI bergan maslahatlarga ishonaman",
      "Shaxsiy muammolarimni AI bilan bo'lishishdan xavotirlanmayman",
      "AI bilan suhbat menga haqiqatan yordam berishi mumkin",
      "Ma'lumotlarim maxfiy saqlanishiga ishonaman",
      "Kerak bo'lsa, AI-suhbatdoshdan yana foydalanishga tayyorman"
    ],
    bands: [[6, 14, "Past ishonch", "warn"], [15, 22, "O'rtacha ishonch", "neutral"], [23, 30, "Yuqori ishonch", "ok"]],
    source: "Dissertatsiya muallifining ishchi shkalasi (H3 gipoteza uchun).",
    license: "Muallif ishlanmasi; omilli tahlil orqali validatsiya qilinishi kerak."
  },
  demo: {
    name: "Demografiya", full: "Demografik anketa", domain: "Umumiy ma'lumot", minutes: 1, type: "form",
    lead: "Quyidagi ma'lumotlar faqat umumlashtirilgan statistik tahlil uchun ishlatiladi.",
    fields: [
      { key: "yosh", label: "Yoshingiz", type: "number", min: 14, max: 80 },
      { key: "jins", label: "Jinsingiz", type: "select", options: ["Ayol", "Erkak", "Aytmaslikni afzal ko'raman"] },
      { key: "kurs", label: "Kurs", type: "select", options: ["1-kurs", "2-kurs", "3-kurs", "4-kurs", "Magistratura", "Boshqa"] },
      { key: "yonalish", label: "Ta'lim yo'nalishi", type: "text" },
      { key: "yashash", label: "Qayerda yashaysiz?", type: "select", options: ["Oila bilan", "Talabalar turar joyida", "Ijarada", "Boshqa"] },
      { key: "psixolog", label: "Ilgari psixologga murojaat qilganmisiz?", type: "select", options: ["Ha", "Yo'q"] }
    ],
    source: "Tadqiqot dizayniga moslashtiriladigan standart anketa.",
    license: "Erkin."
  }
};

const TRAININGS = {
  breath478: {
    title: "4-7-8 nafas mashqi", category: "Relaksatsiya", minutes: 2, kind: "timer",
    goal: "Vegetativ nerv tizimini tinchlantirish, xavotir va uyqusizlikni kamaytirish.",
    phases: [["Nafas oling", 4, 1], ["Ushlab turing", 7, 1], ["Sekin chiqaring", 8, 0.55]], cycles: 4,
    steps: ["Qulay o'tiring, yelkalaringizni bo'shashtiring.", "Burun orqali 4 soniya nafas oling.", "Nafasni 7 soniya ushlab turing.", "Og'iz orqali 8 soniya davomida sekin chiqaring."],
    source: "Weil A. Breathing techniques; nafas mashqlari bo'yicha meta-tahlil: Zaccaro A. va boshq. (2018), Front Hum Neurosci."
  },
  box: {
    title: "Kvadrat nafas", category: "Relaksatsiya", minutes: 2, kind: "timer",
    goal: "Diqqatni jamlash va stress holatida o'zini boshqarish.",
    phases: [["Nafas oling", 4, 1], ["Ushlab turing", 4, 1], ["Chiqaring", 4, 0.55], ["Ushlab turing", 4, 0.55]], cycles: 4,
    steps: ["To'rt bosqichning har biri 4 soniya davom etadi.", "Nafas olish, ushlash, chiqarish va yana ushlash."],
    source: "Ma'lumotnoma: Balban M.Y. va boshq. (2023). Brief structured respiration practices. Cell Rep Med, 4(1)."
  },
  grounding: {
    title: "5-4-3-2-1 yerga tayanish", category: "Xavotirni boshqarish", minutes: 3, kind: "steps",
    goal: "Kuchli xavotir yoki vahima paytida hozirgi lahzaga qaytish.",
    steps: [
      "Atrofingizdagi 5 ta narsani ko'ring va nomini ichingizda ayting.",
      "Tanangiz sezayotgan 4 ta narsani his qiling: kiyim, stul, oyog'ingiz ostidagi pol.",
      "Eshitayotgan 3 ta tovushni aniqlang.",
      "Sezayotgan 2 ta hidni toping.",
      "Og'zingizdagi 1 ta ta'mni seze oling yoki bir qultum suv iching."
    ],
    source: "Kognitiv-xulqiy terapiya amaliyotidagi standart grounding texnikasi."
  },
  thought: {
    title: "Fikrlar kundaligi", category: "Kognitiv-xulqiy terapiya", minutes: 10, kind: "form",
    goal: "Avtomatik salbiy fikrlarni aniqlash va ularni muvozanatli fikr bilan almashtirish.",
    fields: [
      { key: "vaziyat", label: "Vaziyat: nima bo'ldi, qayerda, kim bilan?" },
      { key: "fikr", label: "Avtomatik fikr: xayolingizdan nima o'tdi?" },
      { key: "his", label: "His-tuyg'u va uning kuchi (0–100)" },
      { key: "dalil_tarafdor", label: "Bu fikr foydasiga dalillar" },
      { key: "dalil_qarshi", label: "Bu fikrga qarshi dalillar" },
      { key: "muqobil", label: "Muqobil, muvozanatli fikr" },
      { key: "his_keyin", label: "Hozir his-tuyg'u kuchi (0–100)" }
    ],
    source: "Beck J.S. (2011). Cognitive Behavior Therapy: Basics and Beyond. Guilford Press."
  },
  pmr: {
    title: "Progressiv mushak relaksatsiyasi", category: "Relaksatsiya", minutes: 12, kind: "steps",
    goal: "Mushaklardagi taranglikni bo'shatish orqali jismoniy va ruhiy zo'riqishni kamaytirish.",
    steps: [
      "Qulay holatda o'tiring yoki yoting, ko'zingizni yuming.",
      "Qo'llar: mushtingizni 5 soniya qattiq siqing, keyin 10 soniya bo'shashtiring.",
      "Bilaklar va yelka: qo'llaringizni bukib taranglang, so'ng bo'shashtiring.",
      "Yuz: peshonangizni burishtiring, ko'zlaringizni qisib turing, keyin bo'shashtiring.",
      "Yelkalar: yelkangizni quloqqa tomon ko'taring, 5 soniyadan keyin tushiring.",
      "Qorin: qorin mushaklarini taranglang, so'ng bo'shashtiring.",
      "Oyoqlar: oyoq barmoqlaringizni o'zingizga tortib taranglang, keyin bo'shashtiring.",
      "Butun tanadagi yengillikni bir daqiqa kuzating."
    ],
    source: "Jacobson E. (1938). Progressive Relaxation. University of Chicago Press."
  },
  gratitude: {
    title: "Uchta yaxshi narsa", category: "Ijobiy psixologiya", minutes: 5, kind: "form",
    goal: "E'tiborni ijobiy voqealarga qaratish orqali kayfiyat va hayotdan qoniqishni oshirish.",
    fields: [
      { key: "bir", label: "Bugun yuz bergan 1-yaxshi narsa va nima uchun yuz berdi" },
      { key: "ikki", label: "2-yaxshi narsa va nima uchun yuz berdi" },
      { key: "uch", label: "3-yaxshi narsa va nima uchun yuz berdi" }
    ],
    source: "Seligman M.E.P., Steen T.A., Park N., Peterson C. (2005). Positive psychology progress. Am Psychol, 60(5), 410–421."
  },
  activation: {
    title: "Xulq-atvorni faollashtirish", category: "Kognitiv-xulqiy terapiya", minutes: 8, kind: "form",
    goal: "Yoqimli va mazmunli faoliyatlarni rejalashtirish orqali tushkunlik doirasini buzish.",
    fields: [
      { key: "faoliyat", label: "Bugun yoki ertaga qiladigan 1–3 ta yoqimli yoki foydali ish" },
      { key: "vaqt", label: "Qachon va qayerda qilasiz?" },
      { key: "kutilgan", label: "Kutilayotgan zavq darajasi (0–10)" },
      { key: "tosiq", label: "Nima xalaqit berishi mumkin va qanday yengasiz?" }
    ],
    source: "Martell C.R., Dimidjian S., Herman-Dunn R. (2010). Behavioral Activation for Depression. Guilford Press."
  },
  problem: {
    title: "Muammoni bosqichma-bosqich hal qilish", category: "Kognitiv-xulqiy terapiya", minutes: 10, kind: "form",
    goal: "Murakkab muammoni boshqariladigan qadamlarga bo'lish.",
    fields: [
      { key: "muammo", label: "Muammoni aniq va qisqa yozing" },
      { key: "variantlar", label: "Barcha mumkin bo'lgan yechimlar (baholamasdan yozing)" },
      { key: "baho", label: "Har bir yechimning afzallik va kamchiliklari" },
      { key: "tanlov", label: "Tanlangan yechim" },
      { key: "qadam", label: "Birinchi aniq qadam va uning muddati" }
    ],
    source: "D'Zurilla T.J., Nezu A.M. (2010). Problem-solving therapy. In: Handbook of CBT. Guilford Press."
  },
  compassion: {
    title: "O'ziga mehr ko'rsatish tanaffusi", category: "Emotsiyalarni boshqarish", minutes: 4, kind: "steps",
    goal: "O'zini ayblash va o'ta tanqidiylikni kamaytirish.",
    steps: [
      "Sizni qiynayotgan vaziyatni eslang va tanangizdagi noqulaylikni his qiling.",
      "O'zingizga ayting: «Bu og'ir lahza. Hozir menga qiyin.»",
      "Eslang: «Qiyinchilik hayotning bir qismi. Boshqalar ham shunday his qiladi.»",
      "Qo'lingizni yuragingiz ustiga qo'ying va ayting: «O'zimga mehribon bo'lay. Menga hozir nima kerak?»",
      "Yaqin do'stingizga qanday so'zlarni aytgan bo'lardingiz? Shu so'zlarni o'zingizga ayting."
    ],
    source: "Neff K. (2011). Self-Compassion. William Morrow."
  },
  sleep: {
    title: "Uyqu gigiyenasi", category: "Psixoedukatsiya", minutes: 5, kind: "steps",
    goal: "Uyqu sifatini yaxshilaydigan odatlarni shakllantirish.",
    steps: [
      "Har kuni bir xil vaqtda yoting va turing, dam olish kunlari ham.",
      "Uxlashdan 1 soat oldin telefon va kompyuterdan foydalanishni to'xtating.",
      "Kechqurun choy, qahva va energetik ichimliklardan saqlaning.",
      "To'shakda faqat uxlang: dars tayyorlash va ijtimoiy tarmoqlarni boshqa joyda qiling.",
      "20 daqiqada uxlay olmasangiz, turib, xira yorug'likda tinch ish qiling.",
      "Kunduzgi uyquni 30 daqiqadan oshirmang."
    ],
    source: "Irish L.A. va boshq. (2015). The role of sleep hygiene in promoting public health. Sleep Med Rev, 22, 23–36."
  },
  worry: {
    title: "Xavotir vaqti", category: "Xavotirni boshqarish", minutes: 15, kind: "form",
    goal: "Kun bo'yi davom etadigan xavotirni belgilangan vaqtga cheklash.",
    fields: [
      { key: "xavotirlar", label: "Bugun xayolingizni band qilgan xavotirlar" },
      { key: "nazorat", label: "Ulardan qaysi birini o'zgartira olasiz?" },
      { key: "harakat", label: "O'zgartira oladiganingiz uchun bitta aniq harakat" },
      { key: "qabul", label: "O'zgartira olmaydiganingizni qanday qabul qilasiz?" }
    ],
    source: "Borkovec T.D., Wilkinson L., Folensbee R., Lerman C. (1983). Stimulus control applications to the treatment of worry. Behav Res Ther, 21(3), 247–251."
  },
  exam: {
    title: "Imtihon xavotirini boshqarish", category: "Psixoedukatsiya", minutes: 6, kind: "steps",
    goal: "Imtihon oldidan va imtihon paytidagi xavotirni kamaytirish.",
    steps: [
      "Tayyorgarlikni kichik bo'laklarga bo'ling: har kuni 25 daqiqa o'qish + 5 daqiqa tanaffus.",
      "«Men albatta yiqilaman» kabi fikrlarni yozing va ularga qarshi dalillarni toping.",
      "Imtihon kuni ertalab kvadrat nafas mashqini bajaring.",
      "Imtihonda avval oson savollarga javob bering, qiyinlariga keyin qayting.",
      "Xavotir kuchaysa, 5-4-3-2-1 texnikasi bilan hozirgi lahzaga qayting.",
      "Imtihondan keyin natijadan qat'i nazar, o'zingizni harakatingiz uchun rag'batlantiring."
    ],
    source: "von der Embse N. va boshq. (2018). Test anxiety effects, predictors, and correlates. J Affect Disord, 227, 483–493."
  }
};

window.RUHAI_BANKS = { INSTRUMENTS, TRAININGS };
})();
