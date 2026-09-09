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

อย่าตั้ง `LOCAL_DEV_BYPASS_AUTH=true` หากเปิดให้คนอื่นเข้าผ่านลิงก์ เพราะค่านี้มีไว้สำหรับทดสอบส่วนตัวเท่านั้น

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

## ลิงก์ใช้งานแบบ manual

หลังล็อกอินแล้วใช้ลิงก์แยกได้:

- `/dr` — หน้า DR80 Scanner และปุ่มส่ง Telegram ด้วยตนเอง
- `/manual-plan` — Admin กรอก Entry/TP1/TP2/SL และเผยแพร่แผนเอง

โหมดนี้ไม่ต้องใช้ Cloudflare Container หรือ scheduled worker การส่งแผนและการสแกนจะเกิดเมื่อกดปุ่มเอง

## ถ้าต้องการให้คนอื่นเปิดจากอินเทอร์เน็ต

เครื่องที่รัน server ต้องเปิดค้างไว้ จากนั้นใช้ Cloudflare Tunnel แบบชั่วคราว (ไม่มี Container และไม่มีค่า Worker):

```powershell
cloudflared tunnel --url http://localhost:3000
```

คำสั่งจะแสดง URL `trycloudflare.com` ให้ส่งต่อได้ ลิงก์จะเปลี่ยนเมื่อเริ่มใหม่ และต้องใส่ `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DATABASE_URL` ให้ครบก่อนเปิดแชร์ ห้ามใช้ `LOCAL_DEV_BYPASS_AUTH=true`

ถ้าพอร์ต 3000 ถูกใช้อยู่ ให้ใช้พอร์ตที่โปรแกรมแจ้ง เช่น `cloudflared tunnel --url http://localhost:3001`

Cloudflare Pages อย่างเดียวไม่สามารถรัน Express, เชื่อม TiDB หรือเรียก Settrade ได้ จึงไม่ควรตัด backend ออกแล้วคาดหวังให้หน้า static ทำงานครบ

## 5. เปิดโหมด Production หลัง Build

```powershell
npm start
```

หยุดโปรแกรมด้วย `Ctrl+C` ได้ ข้อมูลใน TiDB จะยังคงอยู่
