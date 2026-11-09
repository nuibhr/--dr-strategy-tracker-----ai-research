# รัน DR Strategy Tracker บนเครื่องตัวเอง

## เปิดให้ทุกคนในวง LAN ใช้สแกน DR

ดับเบิลคลิก `Start-DR-LAN.cmd` ในโฟลเดอร์โปรเจกต์ หรือรัน:

```powershell
npm run start:lan
```

โปรแกรมจะ build แล้วเปิดหน้าเว็บพร้อม API ในเครื่องเดียวกันที่พอร์ต 3000 และแสดงลิงก์ LAN ที่ส่งต่อให้เพื่อนได้ เช่น `http://192.168.12.37:3000/dr` ทุกเครื่องต้องเชื่อมต่อเราเตอร์/เครือข่ายเดียวกัน เปิดได้ทั้งคอมพิวเตอร์และมือถือ หน้าราก `/` จะเปิดตัวสแกนเช่นกันในโหมดนี้

ครั้งแรกให้อนุญาต Windows Firewall เฉพาะ TCP พอร์ตนี้จากวง LAN โดยรันคำสั่งต่อไปนี้ แล้วกด Yes เมื่อ Windows ขอสิทธิ์ผู้ดูแลเครื่อง:

```powershell
powershell -NoProfile -File scripts/enable-lan-firewall.ps1
```

หน้า DR ในโหมด LAN ไม่ต้องล็อกอิน ทุกคนดูผลและกดสแกนได้ โดยใช้ผลร่วมกันและเว้นสแกนใหม่อย่างน้อย 5 นาที การสแกนเต็มรอบใช้ประมาณ 1–3 นาที เพราะเว้นจังหวะเรียก Settrade และลองใหม่เมื่อเจอ HTTP 429 ส่วนการบันทึกพอร์ต จัดการผู้ใช้ และส่ง Telegram ยังต้องล็อกอินด้วยสิทธิ์ที่เกี่ยวข้องที่ `/dashboard` และตั้งค่า `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` ก่อน

ต้องมี `BROKER_APP_ID` และ `BROKER_API_SECRET` ใน `.env` เพื่อเรียกข้อมูล Settrade จริง ค่าเหล่านี้อยู่ฝั่ง server และไม่ส่งไป browser การเปิดหน้าเว็บในวง LAN ไม่ต้องใช้ Fly/Cloudflare แต่เครื่องหลักต้องเปิดและไม่เข้า Sleep และยังต้องมีอินเทอร์เน็ตสำหรับ Settrade

หยุดด้วย `Ctrl+C` ในหน้าต่างที่เปิดโปรแกรม ไม่ต้องเปิดพอร์ตบนเราเตอร์หรือตั้ง Cloudflare Tunnel สำหรับโหมดนี้ หาก IP เปลี่ยน ให้ใช้ลิงก์ใหม่ที่โปรแกรมแสดง ต้องการพอร์ตอื่นให้ตั้ง `LAN_PORT` และใช้ `-Port` เดียวกันกับสคริปต์ Firewall

ผลสแกนเก็บในหน่วยความจำและจะสแกนใหม่หลังเปิดโปรแกรม ส่วนข้อมูลบัญชี/พอร์ตจะคงอยู่เมื่อมี `DATABASE_URL` ที่ใช้งานได้เท่านั้น หากค่านี้ว่าง ข้อมูลที่บันทึกในโหมด local จะหายเมื่อรีสตาร์ต

## การรันแบบเดิมพร้อมบัญชีผู้ใช้

ตั้งแอดมิน local ครั้งแรกได้ด้วย `node scripts/setup-local-admin.mjs` โปรแกรมจะสร้างเฉพาะค่าที่ยังไม่มี เก็บรหัสไว้ใน `logs/local-admin-credentials.txt` และไม่เปลี่ยนรหัส/JWT ที่ตั้งไว้แล้ว ต้อง restart server หลังตั้งค่าครั้งแรก ห้ามส่ง `.env` หรือไฟล์ใน `logs` เข้า Git

## ข้อกำหนดความปลอดภัยหลังตรวจ 9 พฤศจิกายน 2026

- แผน DR Picks เป็นรายการรวม: การเพิ่ม/แก้/ลบและรีเฟรชราคาต้องเป็นแอดมิน ผู้ชมที่ได้รับอนุญาตยังอ่านได้
- พอร์ตส่วนตัวและ position/alert ตรวจเจ้าของบัญชีก่อนอ่านหรือแก้ไข
- `/api/dr/price/:symbol` และ `/api/dr/prices` ต้องมี session หรือ Bearer `DR_TRACKER_SERVICE_TOKEN`; จำกัด 10 คำขอต่อนาทีต่อบัญชี/service และ batch สูงสุด 20 symbol ส่วนหน้า Scanner LAN ยังเปิดได้ตามเดิม
- Telegram callback ปิดไว้หากไม่ตั้ง `TELEGRAM_WEBHOOK_SECRET` ค่า 16–256 ตัวอักษร A–Z/a–z/0–9/_/- โดย secret ต้องตรงกับ header จาก Telegram การตั้ง webhook ใช้ POST `/api/telegram/webhook/set` พร้อม session แอดมินและ `PUBLIC_URL` แบบ HTTPS เท่านั้น GET ใช้เปลี่ยน webhook ไม่ได้
- โหมด LAN ปกติไม่ต้องเปิด callback เพื่อกดส่งแผน Telegram: outgoing bot token/chat ID ยังใช้เหมือนเดิม
- อ่านขอบเขตและข้อจำกัดการตรวจใน `docs/SECURITY-REVIEW-2026-11-09.txt` และรัน `npm run check:secrets` ก่อน commit

การรันแบบนี้เชื่อมฐานข้อมูลที่ตั้งใน `DATABASE_URL` ของ `.env` หากใช้ TiDB ข้อมูลจะอยู่ใน TiDB และไม่หายเมื่อปิดโปรแกรม

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
