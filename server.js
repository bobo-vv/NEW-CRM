
// server.js — Mini CRM (full fresh build r3)
// Features: Auth (JWT), Users admin, Companies/Contacts/Deals/Activities, Daily Reports with photos, Attachments upload, KPI & CSV export
// Security: helmet, compression, CORS allowlist, rate limit
// Ops: daily JSON backups with node-cron, manual backup endpoints
// Storage: local JSON file DB + /uploads on persistent disk
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { nanoid } = require('nanoid');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5050;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'crm.json');
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const RATE_LIMIT_WINDOW_MIN = Number(process.env.RATE_LIMIT_WINDOW_MIN || 1);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);
const BACKUP_CRON = process.env.BACKUP_CRON || '0 17 * * *'; // 17:00 UTC ~ 00:00 Bangkok

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Minimal front fail-safe
if (!fs.existsSync(path.join(PUBLIC_DIR, 'index.html')))
  fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), `<!doctype html><meta charset="utf-8"><div id="app">Upload public/ files.</div>`);

// ---- Tiny JSON DB ----
const defaultData = { users: [], companies: [], contacts: [], deals: [], activities: [], attachments: [], audit: [], reports: [] };
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const json = JSON.parse(raw);
    return { ...defaultData, ...json };
  } catch (e) {
    console.error('DB load error:', e);
    return JSON.parse(JSON.stringify(defaultData));
  }
}
function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
let db = loadDB();

// Seed admin
(async () => {
  if (!db.users.length) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    db.users.push({ id: nanoid(10), email: ADMIN_EMAIL, name: 'Admin', role: 'admin', team: 'HQ', zone: 'BKK', password_hash: hash, created_at: new Date().toISOString() });
    saveDB(db);
    console.log(`✔ Seeded admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }
})();

// ---- Security middlewares ----
app.use(helmet());
const corsOrigin = (origin, cb) => {
  if (!origin) return cb(null, true);
  if (ALLOWED_ORIGIN === '*') return cb(null, true);
  const allow = ALLOWED_ORIGIN.split(',').map(s=>s.trim());
  if (allow.includes(origin)) return cb(null, true);
  return cb(new Error('Not allowed by CORS'), false);
};
app.use(cors({ origin: corsOrigin }));
app.use(compression());
app.use('/api/', rateLimit({ windowMs: RATE_LIMIT_WINDOW_MIN*60*1000, max: RATE_LIMIT_MAX }));

app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const today = new Date().toISOString().slice(0, 10);
    const dir = path.join(UPLOAD_DIR, today);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = String(file.originalname).replace(/[^a-zA-Z0-9_.\-ก-๙\s]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });

// ---- Helpers ----
const STAGES = ['new','qualify','proposal','negotiation','won','lost'];
function signToken(user) { return jwt.sign({ uid:user.id, role:user.role, team:user.team, zone:user.zone, name:user.name, email:user.email }, JWT_SECRET, { expiresIn:'12h' }); }
function auth(req,res,next){ const t=(req.headers.authorization||'').replace('Bearer ',''); if(!t) return res.status(401).json({ok:false,error:'no_token'}); try{ req.user=jwt.verify(t, JWT_SECRET); next(); }catch(e){ return res.status(401).json({ok:false,error:'invalid_token'}); } }
function admin(req,res,next){ if(req.user?.role!=='admin') return res.status(403).json({ok:false,error:'forbidden'}); next(); }
function canSee(user,row){ if(!user) return false; if(user.role==='admin') return true; if(row.owner_id===user.uid) return true; if(row.team&&user.team&&row.team===user.team) return true; return false; }
function listFilter(arr,user,q){ let out=arr.filter(r=>canSee(user,r)); if(!q) return out; const qq=(q.q||'').toLowerCase(); if(qq) out=out.filter(r=>JSON.stringify(r).toLowerCase().includes(qq)); if(q.stage) out=out.filter(r=>r.stage===q.stage); if(q.owner) out=out.filter(r=>r.owner_id===q.owner); if(q.team) out=out.filter(r=>(r.team||'')===q.team); if(q.month) out=out.filter(r=>(r.created_at||'').slice(0,7)===q.month); return out; }
function audit(user,action,entity,entity_id,detail){ db.audit.unshift({id:nanoid(10),at:new Date().toISOString(),by:user?.uid||null,action,entity,entity_id,detail}); saveDB(db); }

// ---- Backups ----
function backupNow() {
  const bdir = path.join(DATA_DIR, 'backups'); fs.mkdirSync(bdir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const file = path.join(bdir, `crm-${ts}.json`);
  const payload = { ...db, _meta:{ exported_at:new Date().toISOString() } };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return path.basename(file);
}
cron.schedule(BACKUP_CRON, () => { try { const f = backupNow(); console.log('✓ daily backup:', f); } catch(e){ console.error('backup failed', e); } });

// ---- Health ----
app.get('/health', (_,res)=>res.json({ok:true}));

// ---- Auth ----
app.post('/api/auth/login', async (req,res)=>{
  const { email, password } = req.body || {};
  const user = db.users.find(u=>u.email===email);
  if(!user) return res.status(400).json({ok:false,error:'invalid_credentials'});
  const ok = await bcrypt.compare(password||'', user.password_hash);
  if(!ok) return res.status(400).json({ok:false,error:'invalid_credentials'});
  res.json({ok:true, token:signToken(user), user:{id:user.id,email:user.email,name:user.name,role:user.role,team:user.team,zone:user.zone}});
});
app.get('/api/me', auth, (req,res)=>{
  const u=db.users.find(x=>x.id===req.user.uid);
  res.json({ok:true, user: u?{id:u.id,email:u.email,name:u.name,role:u.role,team:u.team,zone:u.zone}:null});
});
app.post('/api/me/password', auth, async (req,res)=>{
  const { current, next } = req.body || {};
  if (!next || String(next).length < 8) return res.status(400).json({ok:false,error:'password_min_8'});
  const u=db.users.find(x=>x.id===req.user.uid);
  if(!u) return res.status(404).json({ok:false,error:'user_not_found'});
  const ok = await bcrypt.compare(current||'', u.password_hash);
  if(!ok) return res.status(400).json({ok:false,error:'current_password_incorrect'});
  u.password_hash = await bcrypt.hash(String(next),10); saveDB(db); audit(req.user,'password_change','user',u.id,{});
  res.json({ok:true});
});

// ---- Admin: users & backups ----
app.get('/api/users', auth, admin, (req,res)=>{
  res.json({ok:true, data: db.users.map(u=>({id:u.id,email:u.email,name:u.name,role:u.role,team:u.team,zone:u.zone,created_at:u.created_at}))});
});
app.post('/api/users', auth, admin, async (req,res)=>{
  const { email, name, role='staff', team='HQ', zone='BKK', password='12345678' } = req.body || {};
  if(!password || String(password).length<8) return res.status(400).json({ok:false,error:'password_min_8'});
  if(db.users.some(u=>u.email===email)) return res.status(400).json({ok:false,error:'email_exists'});
  const row={id:nanoid(10), email, name, role, team, zone, password_hash: await bcrypt.hash(String(password),10), created_at:new Date().toISOString()};
  db.users.push(row); saveDB(db); audit(req.user,'create','user',row.id,{email,role});
  res.json({ok:true,data:{id:row.id,email,name,role,team,zone}});
});
app.put('/api/users/:id', auth, admin, async (req,res)=>{
  const i=db.users.findIndex(u=>u.id===req.params.id);
  if(i<0) return res.status(404).json({ok:false,error:'not_found'});
  if (db.users[i].role === 'admin' && req.body.role === 'staff') {
    const otherAdmins = db.users.filter(u => u.role === 'admin' && u.id !== db.users[i].id).length;
    if (otherAdmins === 0) return res.status(400).json({ ok:false, error:'cannot_demote_last_admin' });
  }
  const up = { ...db.users[i] };
  if (req.body.email) up.email = req.body.email;
  if (req.body.name) up.name = req.body.name;
  if (req.body.role) up.role = req.body.role;
  if (req.body.team) up.team = req.body.team;
  if (req.body.zone) up.zone = req.body.zone;
  if (req.body.password) {
    if (String(req.body.password).length < 8) return res.status(400).json({ ok:false, error:'password_min_8' });
    up.password_hash = await bcrypt.hash(String(req.body.password), 10);
  }
  db.users[i] = up; saveDB(db); audit(req.user,'update','user',up.id,{});
  res.json({ ok:true, data:{ id:up.id, email:up.email, name:up.name, role:up.role, team:up.team, zone:up.zone } });
});
app.delete('/api/users/:id', auth, admin, (req,res)=>{
  const id = req.params.id;
  if (id === req.user.uid) return res.status(400).json({ ok:false, error:'cannot_delete_self' });
  const i=db.users.findIndex(u=>u.id===id);
  if(i<0) return res.status(404).json({ok:false,error:'not_found'});
  if (db.users[i].role === 'admin') {
    const otherAdmins = db.users.filter(u => u.role === 'admin' && u.id !== id).length;
    if (otherAdmins === 0) return res.status(400).json({ ok:false, error:'cannot_delete_last_admin' });
  }
  const removed = db.users.splice(i,1)[0];
  saveDB(db); audit(req.user,'delete','user',removed.id,{});
  res.json({ ok:true });
});

// Backups
app.get('/api/admin/backups', auth, admin, (req,res)=>{
  const bdir = path.join(DATA_DIR, 'backups');
  fs.mkdirSync(bdir, { recursive: true });
  const files = fs.readdirSync(bdir).filter(f=>f.endsWith('.json')).sort().reverse();
  res.json({ ok:true, files });
});
app.post('/api/admin/backups/now', auth, admin, (req,res)=>{
  const name = backupNow();
  res.json({ ok:true, file:name });
});
app.get('/api/admin/backups/:name', auth, admin, (req,res)=>{
  const name = String(req.params.name).replace(/[^a-zA-Z0-9_.\-]/g,'');
  const p = path.join(DATA_DIR,'backups',name);
  if (!fs.existsSync(p)) return res.status(404).send('not_found');
  res.download(p);
});

// ---- Core entities ----
app.get('/api/companies', auth, (req,res)=> res.json({ok:true,data:listFilter(db.companies, req.user, req.query)}));
app.post('/api/companies', auth, (req,res)=>{
  const c={id:nanoid(10),created_at:new Date().toISOString(),owner_id:req.user.uid,team:req.user.team,zone:req.user.zone,...req.body};
  db.companies.unshift(c); saveDB(db); audit(req.user,'create','company',c.id,{name:c.name});
  res.json({ok:true,data:c});
});
app.put('/api/companies/:id', auth, (req,res)=>{
  const i=db.companies.findIndex(x=>x.id===req.params.id); if(i<0) return res.status(404).json({ok:false,error:'not_found'});
  db.companies[i]={...db.companies[i],...req.body,updated_at:new Date().toISOString()}; saveDB(db); audit(req.user,'update','company',db.companies[i].id,{});
  res.json({ok:true,data:db.companies[i]});
});

app.get('/api/contacts', auth, (req,res)=> res.json({ok:true,data:listFilter(db.contacts, req.user, req.query)}));
app.post('/api/contacts', auth, (req,res)=>{
  const c={id:nanoid(10),created_at:new Date().toISOString(),owner_id:req.user.uid,team:req.user.team,zone:req.user.zone,...req.body};
  db.contacts.unshift(c); saveDB(db); audit(req.user,'create','contact',c.id,{name:c.full_name});
  res.json({ok:true,data:c});
});
app.put('/api/contacts/:id', auth, (req,res)=>{
  const i=db.contacts.findIndex(x=>x.id===req.params.id); if(i<0) return res.status(404).json({ok:false,error:'not_found'});
  db.contacts[i]={...db.contacts[i],...req.body,updated_at:new Date().toISOString()}; saveDB(db); audit(req.user,'update','contact',db.contacts[i].id,{});
  res.json({ok:true,data:db.contacts[i]});
});

app.get('/api/deals', auth, (req,res)=> res.json({ok:true,data:listFilter(db.deals, req.user, req.query)}));
app.post('/api/deals', auth, (req,res)=>{
  const d={id:nanoid(10),title:'',stage:'new',value:0,company_id:null,owner_id:req.user.uid,team:req.user.team,zone:req.user.zone,...req.body,created_at:new Date().toISOString()};
  if(!STAGES.includes(d.stage)) d.stage='new';
  db.deals.unshift(d); saveDB(db); audit(req.user,'create','deal',d.id,{title:d.title,stage:d.stage});
  res.json({ok:true,data:d});
});
app.put('/api/deals/:id', auth, (req,res)=>{
  const i=db.deals.findIndex(x=>x.id===req.params.id); if(i<0) return res.status(404).json({ok:false,error:'not_found'});
  const up={...db.deals[i],...req.body,updated_at:new Date().toISOString()};
  if(!STAGES.includes(up.stage)) up.stage=db.deals[i].stage;
  db.deals[i]=up; saveDB(db); audit(req.user,'update','deal',up.id,{});
  res.json({ok:true,data:up});
});
app.post('/api/deals/:id/move', auth, (req,res)=>{
  const i=db.deals.findIndex(x=>x.id===req.params.id); if(i<0) return res.status(404).json({ok:false,error:'not_found'});
  const { stage } = req.body || {}; if(!STAGES.includes(stage)) return res.status(400).json({ok:false,error:'bad_stage'});
  db.deals[i].stage=stage; db.deals[i].updated_at=new Date().toISOString(); saveDB(db); audit(req.user,'move','deal',db.deals[i].id,{stage});
  res.json({ok:true,data:db.deals[i]});
});

app.get('/api/activities', auth, (req,res)=>{
  let list=listFilter(db.activities, req.user, req.query);
  const { deal_id } = req.query; if(deal_id) list=list.filter(a=>a.deal_id===deal_id);
  res.json({ok:true,data:list});
});
app.post('/api/activities', auth, (req,res)=>{
  const a={id:nanoid(10),type:'task',due_at:null,done:false,...req.body,owner_id:req.user.uid,team:req.user.team,zone:req.user.zone,created_at:new Date().toISOString()};
  db.activities.unshift(a); saveDB(db); audit(req.user,'create','activity',a.id,{type:a.type});
  res.json({ok:true,data:a});
});
app.put('/api/activities/:id', auth, (req,res)=>{
  const i=db.activities.findIndex(x=>x.id===req.params.id); if(i<0) return res.status(404).json({ok:false,error:'not_found'});
  db.activities[i]={...db.activities[i],...req.body,updated_at:new Date().toISOString()}; saveDB(db); audit(req.user,'update','activity',db.activities[i].id,{});
  res.json({ok:true,data:db.activities[i]});
});

// ---- Files & Attachments ----
app.post('/api/files', auth, upload.array('files', 12), (req,res)=>{
  const { entity, entity_id } = req.body || {};
  const files=(req.files||[]).map(f=>{
    const rel=path.relative(DATA_DIR,f.path).replace(/\\/g,'/');
    const url='/uploads/'+rel.split('/').slice(1).join('/');
    const a={id:nanoid(10),entity,entity_id,filename:f.originalname,url,uploaded_by:req.user.uid,team:req.user.team,zone:req.user.zone,created_at:new Date().toISOString()};
    db.attachments.push(a); return a;
  });
  saveDB(db); audit(req.user,'upload','file',entity_id,{count:files.length});
  res.json({ok:true,files});
});
app.get('/api/attachments', auth, (req,res)=>{
  let list=listFilter(db.attachments, req.user, req.query);
  const { entity, entity_id } = req.query;
  if(entity) list=list.filter(a=>a.entity===entity);
  if(entity_id) list=list.filter(a=>a.entity_id===entity_id);
  res.json({ok:true,data:list});
});

// ---- Daily Reports ----
app.get('/api/reports', auth, (req,res)=>{
  const list=listFilter(db.reports, req.user, req.query);
  res.json({ok:true,data:list});
});
app.post('/api/reports', auth, (req,res)=>{
  const { date, note, customer, location } = req.body || {};
  const r={ id:nanoid(10), date: date || new Date().toISOString().slice(0,10), note: note||'', customer: customer||'', location: location||'', owner_id:req.user.uid, team:req.user.team, zone:req.user.zone, created_at:new Date().toISOString() };
  db.reports.unshift(r); saveDB(db); audit(req.user,'create','report',r.id,{});
  res.json({ok:true, data:r});
});

// ---- KPI & Export ----
app.get('/api/kpi', auth, (req,res)=>{
  const deals=listFilter(db.deals, req.user, req.query);
  const total=deals.length, won=deals.filter(d=>d.stage==='won'), wonCount=won.length;
  const estSum=deals.reduce((s,d)=>s+(Number(d.value)||0),0);
  const wonSum=won.reduce((s,d)=>s+(Number(d.value)||0),0);
  const byStage=STAGES.map(s=>({stage:s,count:deals.filter(d=>d.stage===s).length}));
  res.json({ok:true,data:{total,wonCount,estSum,wonSum,byStage}});
});
app.get('/api/export/:entity.csv', auth, (req,res)=>{
  const map={deals:['id','title','stage','value','company_id','owner_id','team','zone','created_at'],companies:['id','name','phone','address','owner_id','team','zone','created_at'],contacts:['id','full_name','email','phone','company_id','owner_id','team','zone','created_at'],activities:['id','type','note','due_at','done','deal_id','owner_id','team','zone','created_at'],reports:['id','date','customer','location','note','owner_id','team','zone','created_at'],audit:['id','at','by','action','entity','entity_id']};
  const ent=req.params.entity; if(!map[ent]) return res.status(404).send('unknown_entity');
  const rows=listFilter(db[ent], req.user, req.query), csv=[map[ent].join(',')].concat(rows.map(r=>map[ent].map(c=>JSON.stringify(r[c]??'')).join(','))).join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition',`attachment; filename=${ent}.csv`); res.send(csv);
});

// ---- SPA fallback ----
app.get('*', (_,res)=> res.sendFile(path.join(PUBLIC_DIR,'index.html')));

// ---- Error handler ----
app.use((err, req, res, next)=>{
  console.error('Unhandled error:', err);
  res.status(500).json({ ok:false, error:'server_error', message: err?.message || 'internal' });
});

app.listen(PORT, ()=> console.log('CRM running on http://localhost:'+PORT));
