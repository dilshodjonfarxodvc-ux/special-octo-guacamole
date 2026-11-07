# XON BALIQ — Oʻzbekona baliqxona (React + Express)

Sayt dizayni yapon sushi restoranidan oʻzbekona baliqxona ruhiga oʻzgartirildi: milliy ranglar, Xon Baliq brendi, baliq taomlari va oʻzbekona menyu.

## Ishga tushirish
1. Node.js o'rnatilgan bo'lsin.
2. Terminalda loyiha papkasiga kiring va `npm install` bajaring.
3. `.env.example` faylidan nusxa olib `.env` deb nomlang.
4. Birinchi terminalda `npm run server` bilan backendni ishga tushiring.
5. Ikkinchi terminalda `npm run dev` bilan frontendni ishga tushiring.
6. Brauzerda Vite ko'rsatgan localhost manzilini oching.

## Admin panel
Saytdagi **Kirish** tugmasidan foydalaning.
Standart lokal admin:
- Email: `admin@xonbaliq.uz`
- Parol: `ChangeMe123!`

Birinchi ishga tushirishdan oldin `.env` ichidagi `ADMIN_PASSWORD` va `JWT_SECRET` qiymatlarini o'zgartiring.

## Telegram xabarlari
Telegram BotFather orqali bot oching, bot tokenini oling va botga `/start` yuboring. `.env` ichidagi `TELEGRAM_BOT_TOKEN` va `TELEGRAM_CHAT_ID` ni to'ldiring, so'ng serverni qayta ishga tushiring. Tokenni frontend kodiga yozmang.

## Muhim
- Roʻyxatdan oʻtish, login, buyurtma va stol bandlovlari `server/data.json` fayliga yoziladi.
- Telegram sozlanmagan boʻlsa, buyurtma va bandlov serverga saqlanadi, ammo Telegram xabari yuborilmaydi.
- Menyudagi nomlar, narxlar, telefon va manzil namunaviy. Restoranning haqiqiy maʼlumotlariga almashtiring.
- Bu lokal demo loyiha. Ommaviy ishga chiqarishdan oldin HTTPS, kuchli maxfiy kalitlar, rate limit va haqiqiy maʼlumotlar bazasini sozlang.
