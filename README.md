# Mini CRM — Doors & Flooring (Full r3)

## ฟีเจอร์หลัก
- ผู้ใช้/สิทธิ์: admin & staff, เปลี่ยนรหัสผ่าน (≥8)
- ลูกค้า (Companies), บุคคล (Contacts), ดีล (Deals) พร้อมสเตจ
- งาน (Activities) + ทำเสร็จ
- รายงานประจำวัน (Daily Reports) พร้อม **แนบรูปหลายไฟล์**
- แนบไฟล์กับดีล/เอนทิตีอื่น ๆ ได้
- Dashboard KPI, Export CSV
- ความปลอดภัย: helmet, CORS allowlist, rate-limit, compression
- แบ็กอัปอัตโนมัติรายวัน → /data/backups + ปุ่มสำรองตอนนี้ (เฉพาะแอดมิน)

## ติดตั้ง (Local)
```bash
npm install
node server.js
# เปิด http://localhost:5050
# ล็อกอิน: admin@example.com / admin123 (เปลี่ยนใน .env หรือ Render Env Vars)
```

## Deploy บน Render
- อัปไฟล์ทั้งหมดขึ้น Git repo ของคุณ แล้วเชื่อมกับ Render (Web Service)
- ใช้ `render.yaml` นี้ได้เลย
- ตั้ง Environment Variables:
  - JWT_SECRET = ค่าสุ่มของคุณ
  - ADMIN_EMAIL / ADMIN_PASSWORD = ผู้ดูแลเริ่มต้น
  - DATA_DIR = /data (มีแล้วใน yaml)
  - ALLOWED_ORIGIN = https://โดเมนของคุณ (ชั่วคราวใส่ * ได้)
- เปิด Persistent Disk 5GB (ใน yaml มีให้แล้ว)

## โครงสร้าง
- server.js — API + DB ไฟล์ + อัปโหลด + แบ็กอัป
- public/index.html, public/app.js — SPA (Tailwind + Lucide)
- package.json, render.yaml, README.md

## หมายเหตุ
- ทุกอย่างเก็บในไฟล์ `/data/crm.json` และไฟล์แนบ `/data/uploads/...`
- คำสั่ง Export CSV: `/api/export/deals.csv` (และ entities อื่น ๆ)
- สร้างผู้ใช้เพิ่มได้จากแท็บ “ผู้ใช้ (Admin)”
