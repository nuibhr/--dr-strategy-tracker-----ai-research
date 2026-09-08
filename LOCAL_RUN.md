# รัน DR Strategy Tracker บนเครื่องตัวเอง

การรันแบบนี้ใช้ฐานข้อมูล TiDB เดิมผ่าน `DATABASE_URL` ใน `.env` ข้อมูลจึงไม่เก็บไว้ในเครื่องและไม่หายเมื่อปิดโปรแกรม

## 1. เตรียมค่าใน `.env`

ต้องมีอย่างน้อย:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_ORIGIN=http://localhost:3000`
- `BROKER_CREDENTIALS_ENCRYPTION_KEY` (ถ้ามี credentials Settrade ที่บันทึกไว้ ให้ใช้ key เดิม)

ห้ามใส่ค่าลับเหล่านี้ใน `VITE_*` เพราะจะถูกส่งไปฝั่ง browser โดยตรง

ถ้าเปิดโปรแกรมแล้วเห็นข้อความ `Missing .env values` ให้เติมชื่อตัวแปรที่แจ้งก่อนใช้งานจริง โดยเฉพาะ `DATABASE_URL` หากเว้นว่าง ระบบจะใช้ข้อมูลชั่วคราวในหน่วยความจำและข้อมูลจะหายเมื่อรีสตาร์ต

ถ้าจะใช้ Settrade หรือ Telegram ใน Local ให้เติม `BROKER_APP_ID`, `BROKER_API_SECRET`, `TELEGRAM_BOT_TOKEN` และ `TELEGRAM_CHAT_ID` ด้วย

## 2. ติดตั้ง dependencies (ทำครั้งแรก)

```powershell
pnpm install
```

หาก pnpm แจ้งว่า build scripts ถูกบล็อก ให้รัน `pnpm approve-builds` และอนุญาต `esbuild` กับ `@tailwindcss/oxide`

## 3. ตรวจและ Build

```powershell
npm run check
npm run build
```

## 4. เปิดโหมดพัฒนา

```powershell
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

การล็อกอินด้วยอีเมล/รหัสผ่านใช้ `ADMIN_EMAIL` และ `ADMIN_PASSWORD` จาก `.env` เดียวกัน ไม่ได้ใช้ข้อมูลจาก Cloudflare หรือ Fly

## 5. เปิดโหมด Production หลัง Build

```powershell
npm start
```

หยุดโปรแกรมด้วย `Ctrl+C` ได้ ข้อมูลใน TiDB จะยังคงอยู่
