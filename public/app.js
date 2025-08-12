/* Mini CRM full r3 — Sidebar/Topbar/Modals/Toasts + Admin + Daily Reports (photos) */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
const app = $("#app");

const API = { base: "", token: localStorage.getItem("token") || "" };
const authHeaders = () => API.token ? { "Authorization": "Bearer " + API.token, "Content-Type":"application/json" } : { "Content-Type":"application/json" };
const GET = async (p)=> (await fetch(API.base+p,{headers:authHeaders()})).json();
const POST = async (p,b)=> (await fetch(API.base+p,{method:"POST",headers:authHeaders(),body:JSON.stringify(b)})).json();
const PUT = async (p,b)=> (await fetch(API.base+p,{method:"PUT",headers:authHeaders(),body:JSON.stringify(b)})).json();
const DEL = async (p)=> (await fetch(API.base+p,{method:"DELETE",headers:authHeaders()})).json();

function icon(name, cls="w-4 h-4"){ return `<i data-lucide="${name}" class="${cls}"></i>`; }
function badge(text){
  const map = { new:"sky", qualify:"amber", proposal:"violet", negotiation:"fuchsia", won:"emerald", lost:"rose" };
  const c = map[text] || "slate";
  return `<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-${c}-100 text-${c}-700">${text}</span>`;
}
function toast(msg, type="success"){
  const color = type==="error" ? "bg-rose-500" : type==="warn" ? "bg-amber-500" : "bg-emerald-500";
  const wrap = $("#toast") || (()=>{const d=document.createElement('div');d.id='toast';d.className='fixed right-4 bottom-4 z-[60] space-y-2';document.body.appendChild(d);return d;})();
  const el = document.createElement('div');
  el.className = `glass shadow-lg rounded-xl px-3 py-2 border ${color} text-white`;
  el.textContent = msg; wrap.appendChild(el);
  setTimeout(()=> el.remove(), 2600);
}
function modal(contentHTML){
  let m = $("#modal");
  if (!m){
    m = document.createElement('div');
    m.id = "modal";
    m.className = "fixed inset-0 z-50 hidden";
    m.innerHTML = `<div class="absolute inset-0 bg-slate-900/50"></div>
    <div class="min-h-full grid place-items-center p-4">
      <div class="glass rounded-2xl shadow-2xl border w-full max-w-lg" id="modalCard"></div>
    </div>`;
    document.body.appendChild(m);
  }
  $("#modalCard").innerHTML = contentHTML;
  m.classList.remove("hidden");
  m.onclick = (e)=>{ if (e.target === m) m.classList.add("hidden"); };
  return m;
}
function closeModal(){ const m=$("#modal"); if(m) m.classList.add("hidden"); }

function Sidebar(isAdmin){
  return `<aside class="hidden md:block w-64 sticky top-0 h-screen p-4">
    <div class="h-full rounded-3xl glass border shadow-sm p-4 flex flex-col">
      <div class="flex items-center gap-2 mb-6"><div class="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center font-bold">CRM</div><div class="font-semibold">Sales CRM</div></div>
      <nav class="space-y-1 flex-1">
        <button data-tab="dashboard" class="navbtn">${icon('layout-dashboard','w-5 h-5')}<span>แดชบอร์ด</span></button>
        <button data-tab="deals" class="navbtn">${icon('kanban','w-5 h-5')}<span>ดีล</span></button>
        <button data-tab="companies" class="navbtn">${icon('building-2','w-5 h-5')}<span>บริษัท</span></button>
        <button data-tab="contacts" class="navbtn">${icon('users','w-5 h-5')}<span>บุคคล</span></button>
        <button data-tab="tasks" class="navbtn">${icon('check-square','w-5 h-5')}<span>งาน</span></button>
        <button data-tab="reports" class="navbtn">${icon('notebook','w-5 h-5')}<span>รายงานประจำวัน</span></button>
        ${isAdmin ? `<button data-tab="users" class="navbtn">${icon('shield','w-5 h-5')}<span>ผู้ใช้ (Admin)</span></button>` : ''}
      </nav>
      <div class="mt-auto space-y-2">
        ${isAdmin ? `<button id="backupNow" class="w-full navbtn !bg-amber-50 !text-amber-700 hover:!bg-amber-100">${icon('hard-drive','w-5 h-5')}<span>สำรองข้อมูล</span></button>` : ''}
        <button id="logout" class="w-full navbtn !bg-rose-50 !text-rose-700 hover:!bg-rose-100">${icon('log-out','w-5 h-5')}<span>ออกจากระบบ</span></button>
      </div>
    </div>
  </aside>`;
}
function Topbar(){
  return `<header class="sticky top-0 z-40 p-4">
    <div class="glass rounded-3xl border shadow-sm px-4 py-3 flex items-center justify-between">
      <div class="font-semibold">Mini CRM — Doors & Flooring</div>
      <div class="flex items-center gap-2">
        <button id="changePw" class="px-3 py-1.5 rounded-xl border hover:bg-slate-50">${icon('key','w-4 h-4')} เปลี่ยนรหัส</button>
        <button id="exportDeals" class="px-3 py-1.5 rounded-xl border hover:bg-slate-50">${icon('download','w-4 h-4')} Export ดีล</button>
      </div>
    </div>
  </header>`;
}

function navBehavior(){
  $$(".navbtn").forEach(b=>{
    b.classList.add("w-full","text-left","flex","items-center","gap-2","px-3","py-2","rounded-xl","border","bg-white/70","hover:bg-white");
    b.onclick = ()=> {
      $$(".navbtn").forEach(x => x.classList.remove("ring-1","ring-brand-500","bg-white"));
      b.classList.add("ring-1","ring-brand-500","bg-white");
      const tab = b.getAttribute("data-tab");
      if (tab === "dashboard") renderDashboard();
      if (tab === "deals") renderDeals();
      if (tab === "companies") renderCompanies();
      if (tab === "contacts") renderContacts();
      if (tab === "tasks") renderTasks();
      if (tab === "reports") renderReports();
      if (tab === "users") renderUsers();
    };
  });
  const first = $("[data-tab='dashboard']"); if (first) first.click();
  if (window.lucide) lucide.createIcons();
}
function Layout(content, isAdmin){
  return `<div class="min-h-screen flex gap-4 p-4">
    ${Sidebar(isAdmin)}
    <div class="flex-1">
      ${Topbar()}
      <main class="px-1 md:px-2 lg:px-4 pb-24">${content}</main>
    </div>
  </div>`;
}

// ---- Login & Home ----
function viewLogin(){
  app.innerHTML = `
  <div class="min-h-screen grid place-items-center p-6">
    <div class="w-full max-w-sm glass rounded-3xl border shadow-xl p-6">
      <div class="text-center mb-4">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-brand-600 text-white grid place-items-center font-bold">CRM</div>
        <div class="mt-2 font-semibold text-lg">เข้าสู่ระบบ</div>
      </div>
      <label class="block mb-2"><span class="text-xs text-slate-500">Email</span><input id="email" class="w-full border rounded-xl px-3 py-2" value="admin@example.com"></label>
      <label class="block mb-4"><span class="text-xs text-slate-500">Password</span><input id="password" type="password" class="w-full border rounded-xl px-3 py-2" value="admin123"></label>
      <button id="loginBtn" class="w-full py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700">เข้าสู่ระบบ</button>
    </div>
  </div>`;
  $("#loginBtn").onclick = async ()=>{
    const j = await POST("/api/auth/login", { email: $("#email").value, password: $("#password").value });
    if (!j.ok) return toast(j.error || "login failed", "error");
    API.token = j.token; localStorage.setItem("token", j.token); window.__me = j.user;
    viewHome();
  };
}
async function viewHome(){
  const me = await GET("/api/me"); if (!me.ok || !me.user) return viewLogin();
  window.__me = me.user;
  app.innerHTML = Layout(`<div id="panel"></div>`, me.user.role === "admin");
  $("#logout").onclick = () => { localStorage.removeItem("token"); location.reload(); };
  $("#exportDeals").onclick = () => window.open("/api/export/deals.csv","_blank");
  $("#changePw").onclick = () => openPwModal();
  const backupBtn = $("#backupNow"); if (backupBtn) backupBtn.onclick = async () => { const r = await POST('/api/admin/backups/now',{}); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else toast('สำรองข้อมูลแล้ว'); };
  navBehavior();
}
function openPwModal(){
  const html = `<div class="p-4">
    <div class="text-lg font-semibold mb-3">เปลี่ยนรหัสผ่าน</div>
    <label class="block mb-2"><span class="text-xs text-slate-500">รหัสปัจจุบัน</span><input id="cpw" type="password" class="w-full border rounded-xl px-3 py-2"></label>
    <label class="block mb-4"><span class="text-xs text-slate-500">รหัสใหม่ (≥8)</span><input id="npw" type="password" class="w-full border rounded-xl px-3 py-2"></label>
    <div class="flex justify-end gap-2"><button class="px-3 py-2 rounded-xl border" id="m_cancel">ยกเลิก</button><button class="px-3 py-2 rounded-xl bg-brand-600 text-white" id="m_save">บันทึก</button></div>
  </div>`;
  modal(html);
  $("#m_cancel").onclick = closeModal;
  $("#m_save").onclick = async ()=>{
    const r = await POST('/api/me/password',{ current: $("#cpw").value, next: $("#npw").value });
    if (!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('เปลี่ยนรหัสแล้ว'); closeModal(); }
  };
}

// ---- Pages ----
async function renderDashboard(){
  const wrap = $("#panel");
  wrap.innerHTML = `<div class="grid gap-4 md:grid-cols-4">
    <div class="rounded-2xl p-4 shadow-sm glass border" id="card1"></div>
    <div class="rounded-2xl p-4 shadow-sm glass border" id="card2"></div>
    <div class="rounded-2xl p-4 shadow-sm glass border" id="card3"></div>
    <div class="rounded-2xl p-4 shadow-sm glass border" id="card4"></div>
    <div class="rounded-2xl p-4 shadow-sm glass border md:col-span-4" id="summary"></div>
  </div>`;
  const k = await GET("/api/kpi"); if (!k.ok) { wrap.innerHTML = "โหลดไม่สำเร็จ"; return; }
  const d = k.data;
  $("#card1").innerHTML = `<div class="text-xs text-slate-500">ดีลทั้งหมด</div><div class="mt-1 text-3xl font-bold">${d.total}</div>`;
  $("#card2").innerHTML = `<div class="text-xs text-slate-500">ชนะ</div><div class="mt-1 text-3xl font-bold">${d.wonCount}</div>`;
  $("#card3").innerHTML = `<div class="text-xs text-slate-500">มูลค่ารวม</div><div class="mt-1 text-3xl font-bold">${d.estSum.toLocaleString()}</div>`;
  $("#card4").innerHTML = `<div class="text-xs text-slate-500">ชนะ (มูลค่า)</div><div class="mt-1 text-3xl font-bold">${d.wonSum.toLocaleString()}</div>`;
  $("#summary").innerHTML = `<div class="font-semibold mb-2">สรุปตามสเตจ</div>
    <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
      ${d.byStage.map(s=>`<div class="rounded-xl border p-3 text-center bg-white/70"><div class="text-xs text-slate-500">${s.stage}</div><div class="text-xl font-semibold">${s.count}</div></div>`).join('')}
    </div>`;
  if (window.lucide) lucide.createIcons();
}

async function renderDeals(){
  const wrap = $("#panel");
  wrap.innerHTML = `<div class="glass border rounded-2xl p-4 shadow-sm mb-4">
    <div class="flex flex-wrap gap-2 items-end">
      <div><div class="text-xs text-slate-500">ค้นหา</div><input id="q" class="border rounded-xl px-3 py-2" placeholder="ชื่องาน/ลูกค้า/ฯลฯ"></div>
      <div><div class="text-xs text-slate-500">สเตจ</div>
        <select id="stage" class="border rounded-xl px-3 py-2"><option value="">ทั้งหมด</option><option>new</option><option>qualify</option><option>proposal</option><option>negotiation</option><option>won</option><option>lost</option></select>
      </div>
      <button id="add" class="px-3 py-2 rounded-xl border hover:bg-slate-50">${icon('plus','w-4 h-4')} ดีลใหม่</button>
    </div>
  </div>
  <div id="list" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3"></div>`;
  $("#q").oninput = load; $("#stage").onchange = load; $("#add").onclick = ()=> openDealModal();
  load();
  async function load(){
    const q=$("#q").value, stage=$("#stage").value;
    const j=await GET('/api/deals?'+new URLSearchParams({q,stage})); if(!j.ok) return;
    $("#list").innerHTML = j.data.map(x=>`
      <div class="rounded-2xl border glass p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="font-semibold">${x.title||'-'}</div>
          ${badge(x.stage)}
        </div>
        <div class="text-xs text-slate-500 mt-1">฿${(Number(x.value)||0).toLocaleString()}</div>
        <div class="mt-3 flex gap-2">
          <select data-stage="${x.id}" class="border rounded-lg px-2 py-1 text-sm">
            ${['new','qualify','proposal','negotiation','won','lost'].map(s=>`<option ${s===x.stage?'selected':''}>${s}</option>`).join('')}
          </select>
          <button data-edit="${x.id}" class="border rounded-lg px-2 py-1 text-sm">${icon('pencil','w-4 h-4')} แก้</button>
          <button data-files="${x.id}" class="border rounded-lg px-2 py-1 text-sm">${icon('paperclip','w-4 h-4')} ไฟล์</button>
        </div>
      </div>`).join('');
    $$("[data-edit]").forEach(b=> b.onclick = ()=> openDealModal(j.data.find(r=> r.id===b.getAttribute('data-edit'))));
    $$("[data-stage]").forEach(s=> s.onchange = async ()=>{ const id=s.getAttribute('data-stage'); const stage=s.value; const r=await POST('/api/deals/'+id+'/move',{stage}); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('อัปเดตสเตจแล้ว'); load(); } });
    $$("[data-files]").forEach(b=> b.onclick = ()=> openFilesModal('deal', b.getAttribute('data-files')));
    if (window.lucide) lucide.createIcons();
  }
  function openDealModal(row={}){
    const html = `<div class="p-4">
      <div class="text-lg font-semibold mb-3">${row.id?'แก้ดีล':'ดีลใหม่'}</div>
      <label class="block mb-3"><span class="text-xs text-slate-500">ชื่อดีล</span>
        <input id="m_title" class="w-full border rounded-xl px-3 py-2" value="${(row.title||'').replace(/"/g,'&quot;')}">
      </label>
      <label class="block mb-4"><span class="text-xs text-slate-500">มูลค่า</span>
        <input id="m_value" type="number" class="w-full border rounded-xl px-3 py-2" value="${row.value||0}">
      </label>
      <div class="flex justify-end gap-2">
        <button class="px-3 py-2 rounded-xl border" id="m_cancel">ยกเลิก</button>
        <button class="px-3 py-2 rounded-xl bg-brand-600 text-white" id="m_save">${row.id?'บันทึก':'สร้าง'}</button>
      </div>
    </div>`;
    const m = modal(html);
    $("#m_cancel").onclick = closeModal;
    $("#m_save").onclick = async ()=>{
      const payload = { title: $("#m_title").value, value: Number($("#m_value").value||0) };
      const r = row.id ? await PUT('/api/deals/'+row.id, payload) : await POST('/api/deals', payload);
      if (!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); load(); }
    };
  }
}

async function renderCompanies(){
  const wrap = $("#panel");
  wrap.innerHTML = `<div class="glass border rounded-2xl p-4 shadow-sm mb-3">
    <div class="flex flex-wrap gap-2"><input id="q" placeholder="ค้นหา" class="border rounded-xl px-3 py-2"/><button id="add" class="px-3 py-2 rounded-xl border hover:bg-slate-50">${icon('plus','w-4 h-4')} บริษัทใหม่</button></div>
  </div>
  <div class="glass border rounded-2xl p-4 shadow-sm overflow-x-auto">
    <table class="min-w-full text-sm" id="tbl"><thead><tr class="bg-slate-50/80"><th class="p-2">ชื่อ</th><th class="p-2">เบอร์</th><th class="p-2">ที่อยู่</th><th class="p-2"></th></tr></thead><tbody></tbody></table>
  </div>`;
  $("#add").onclick=()=>openModal(); $("#q").oninput=load; load();
  async function load(){
    const j=await GET('/api/companies?'+new URLSearchParams({q:$("#q").value})); if(!j.ok) return;
    const tb=$("#tbl tbody"); tb.innerHTML="";
    j.data.forEach(c=>{
      const tr=document.createElement('tr'); tr.className='border-t';
      tr.innerHTML = `<td class="p-2">${c.name||''}</td><td class="p-2">${c.phone||''}</td><td class="p-2">${c.address||''}</td>
        <td class="p-2"><button data-edit="${c.id}" class="border rounded px-2 py-1">${icon('pencil')}</button></td>`;
      tb.appendChild(tr);
    });
    $$("[data-edit]").forEach(b=> b.onclick=()=>openModal(j.data.find(x=>x.id===b.getAttribute('data-edit'))));
    if (window.lucide) lucide.createIcons();
  }
  function openModal(row={}){
    const html = `<div class="p-4">
      <div class="text-lg font-semibold mb-3">${row.id?'แก้บริษัท':'บริษัทใหม่'}</div>
      <label class="block mb-2"><span class="text-xs text-slate-500">ชื่อ</span><input id="n" class="w-full border rounded-xl px-3 py-2" value="${(row.name||'').replace(/"/g,'&quot;')}"></label>
      <label class="block mb-2"><span class="text-xs text-slate-500">เบอร์</span><input id="p" class="w-full border rounded-xl px-3 py-2" value="${(row.phone||'').replace(/"/g,'&quot;')}"></label>
      <label class="block mb-4"><span class="text-xs text-slate-500">ที่อยู่</span><input id="a" class="w-full border rounded-xl px-3 py-2" value="${(row.address||'').replace(/"/g,'&quot;')}"></label>
      <div class="flex justify-end gap-2"><button class="px-3 py-2 rounded-xl border" id="m_cancel">ยกเลิก</button><button class="px-3 py-2 rounded-xl bg-brand-600 text-white" id="m_save">${row.id?'บันทึก':'สร้าง'}</button></div>
    </div>`;
    modal(html); $("#m_cancel").onclick=closeModal; $("#m_save").onclick=async()=>{
      const payload={name:$("#n").value,phone:$("#p").value,address:$("#a").value};
      const r = row.id ? await PUT('/api/companies/'+row.id,payload) : await POST('/api/companies',payload);
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); load(); }
    };
  }
}

async function renderContacts(){
  const wrap = $("#panel");
  wrap.innerHTML = `<div class="glass border rounded-2xl p-4 shadow-sm mb-3">
    <div class="flex flex-wrap gap-2"><input id="q" placeholder="ค้นหา" class="border rounded-xl px-3 py-2"/><button id="add" class="px-3 py-2 rounded-xl border hover:bg-slate-50">${icon('plus','w-4 h-4')} บุคคลใหม่</button></div>
  </div>
  <div class="glass border rounded-2xl p-4 shadow-sm overflow-x-auto">
    <table class="min-w-full text-sm" id="tbl"><thead><tr class="bg-slate-50/80"><th class="p-2">ชื่อ</th><th class="p-2">อีเมล</th><th class="p-2">โทร</th><th class="p-2"></th></tr></thead><tbody></tbody></table>
  </div>`;
  $("#add").onclick=()=>openModal(); $("#q").oninput=load; load();
  async function load(){
    const j=await GET('/api/contacts?'+new URLSearchParams({q:$("#q").value})); if(!j.ok) return;
    const tb=$("#tbl tbody"); tb.innerHTML="";
    j.data.forEach(c=>{
      const tr=document.createElement('tr'); tr.className='border-t';
      tr.innerHTML = `<td class="p-2">${c.full_name||''}</td><td class="p-2">${c.email||''}</td><td class="p-2">${c.phone||''}</td>
        <td class="p-2"><button data-edit="${c.id}" class="border rounded px-2 py-1">${icon('pencil')}</button></td>`;
      tb.appendChild(tr);
    });
    $$("[data-edit]").forEach(b=> b.onclick=()=>openModal(j.data.find(x=>x.id===b.getAttribute('data-edit'))));
    if (window.lucide) lucide.createIcons();
  }
  function openModal(row={}){
    const html = `<div class="p-4">
      <div class="text-lg font-semibold mb-3">${row.id?'แก้บุคคล':'บุคคลใหม่'}</div>
      <label class="block mb-2"><span class="text-xs text-slate-500">ชื่อ</span><input id="n" class="w-full border rounded-xl px-3 py-2" value="${(row.full_name||'').replace(/"/g,'&quot;')}"></label>
      <label class="block mb-2"><span class="text-xs text-slate-500">อีเมล</span><input id="e" class="w-full border rounded-xl px-3 py-2" value="${(row.email||'').replace(/"/g,'&quot;')}"></label>
      <label class="block mb-4"><span class="text-xs text-slate-500">โทร</span><input id="p" class="w-full border rounded-xl px-3 py-2" value="${(row.phone||'').replace(/"/g,'&quot;')}"></label>
      <div class="flex justify-end gap-2"><button class="px-3 py-2 rounded-xl border" id="m_cancel">ยกเลิก</button><button class="px-3 py-2 rounded-xl bg-brand-600 text-white" id="m_save">${row.id?'บันทึก':'สร้าง'}</button></div>
    </div>`;
    modal(html); $("#m_cancel").onclick=closeModal; $("#m_save").onclick=async()=>{
      const payload={full_name:$("#n").value,email:$("#e").value,phone:$("#p").value};
      const r = row.id ? await PUT('/api/contacts/'+row.id,payload) : await POST('/api/contacts',payload);
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); load(); }
    };
  }
}

async function renderTasks(){
  const wrap = $("#panel");
  wrap.innerHTML = `<div class="glass border rounded-2xl p-4 shadow-sm mb-3">
    <div class="flex flex-wrap gap-2"><input id="q" placeholder="ค้นหา" class="border rounded-xl px-3 py-2"/><button id="add" class="px-3 py-2 rounded-xl border hover:bg-slate-50">${icon('plus','w-4 h-4')} เพิ่มงาน</button></div>
  </div><div id="list"></div>`;
  $("#add").onclick=()=>openModal(); $("#q").oninput=load; load();
  async function load(){
    const j=await GET('/api/activities?'+new URLSearchParams({q:$("#q").value})); if(!j.ok) return;
    $("#list").innerHTML = j.data.map(a=>`
      <div class="rounded-2xl border glass p-3 shadow-sm mb-2 flex items-center justify-between">
        <div><div class="font-medium">${a.type||'task'} · ${a.due_at||''}</div><div class="text-xs text-slate-500">${a.note||''}</div></div>
        <div class="flex gap-2"><button data-done="${a.id}" class="border rounded-lg px-2 py-1 text-sm">${icon('check','w-4 h-4')} ทำเสร็จ</button><button data-edit="${a.id}" class="border rounded-lg px-2 py-1 text-sm">${icon('pencil','w-4 h-4')} แก้</button></div>
      </div>`).join('');
    $$("[data-done]").forEach(b=> b.onclick=async()=>{ const id=b.getAttribute('data-done'); const r=await PUT('/api/activities/'+id,{done:true}); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); load(); } });
    $$("[data-edit]").forEach(b=> b.onclick=()=>openModal(j.data.find(x=>x.id===b.getAttribute('data-edit'))));
    if (window.lucide) lucide.createIcons();
  }
  function openModal(row={}){
    const html = `<div class="p-4">
      <div class="text-lg font-semibold mb-3">${row.id?'แก้งาน':'เพิ่มงาน'}</div>
      <label class="block mb-2"><span class="text-xs text-slate-500">ประเภท (call/meet/note/task)</span><input id="t" class="w-full border rounded-xl px-3 py-2" value="${(row.type||'task').replace(/"/g,'&quot;')}"></label>
      <label class="block mb-2"><span class="text-xs text-slate-500">กำหนดเสร็จ (YYYY-MM-DD)</span><input id="d" class="w-full border rounded-xl px-3 py-2" value="${(row.due_at||'').replace(/"/g,'&quot;')}"></label>
      <label class="block mb-4"><span class="text-xs text-slate-500">รายละเอียด</span><input id="n" class="w-full border rounded-xl px-3 py-2" value="${(row.note||'').replace(/"/g,'&quot;')}"></label>
      <div class="flex justify-end gap-2"><button class="px-3 py-2 rounded-xl border" id="m_cancel">ยกเลิก</button><button class="px-3 py-2 rounded-xl bg-brand-600 text-white" id="m_save">${row.id?'บันทึก':'สร้าง'}</button></div>
    </div>`;
    modal(html); $("#m_cancel").onclick=closeModal; $("#m_save").onclick=async()=>{
      const payload={type:$("#t").value,due_at:$("#d").value,note:$("#n").value};
      const r=row.id?await PUT('/api/activities/'+row.id,payload):await POST('/api/activities',payload);
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); load(); }
    };
  }
}

async function renderReports(){
  const wrap = $("#panel");
  wrap.innerHTML = `<div class="glass border rounded-2xl p-4 shadow-sm mb-3">
    <div class="grid md:grid-cols-2 gap-3">
      <label class="block"><span class="text-xs text-slate-500">วันที่</span><input id="r_date" type="date" class="w-full border rounded-xl px-3 py-2"></label>
      <label class="block"><span class="text-xs text-slate-500">ลูกค้า/โปรเจกต์</span><input id="r_customer" class="w-full border rounded-xl px-3 py-2" placeholder="เช่น โครงการบ้าน A"></label>
      <label class="block md:col-span-2"><span class="text-xs text-slate-500">รายละเอียด</span><textarea id="r_note" class="w-full border rounded-xl px-3 py-2" rows="3" placeholder="วันนี้ไปพบลูกค้า..."></textarea></label>
      <label class="block md:col-span-2"><span class="text-xs text-slate-500">แนบรูป (หลายไฟล์)</span><input id="r_files" type="file" multiple class="w-full"></label>
      <div class="md:col-span-2 flex justify-end"><button id="r_submit" class="px-4 py-2 rounded-xl bg-brand-600 text-white">${icon('send','w-4 h-4')} ส่งรายงาน</button></div>
    </div>
  </div>
  <div class="glass border rounded-2xl p-4 shadow-sm">
    <div class="flex items-center justify-between mb-3">
      <div class="font-semibold">รายงานล่าสุด</div>
      <button id="exportReports" class="px-3 py-1.5 rounded-xl border hover:bg-slate-50">${icon('download','w-4 h-4')} Export CSV</button>
    </div>
    <div id="r_list" class="space-y-3"></div>
  </div>`;
  const today = new Date().toISOString().slice(0,10);
  $("#r_date").value = today;
  $("#exportReports").onclick = ()=> window.open("/api/export/reports.csv","_blank");
  $("#r_submit").onclick = async ()=>{
    const j = await POST('/api/reports',{ date: $("#r_date").value, customer: $("#r_customer").value, note: $("#r_note").value, location: '' });
    if(!j.ok) return toast(j.error||'บันทึกไม่สำเร็จ','error');
    const id = j.data.id;
    const files = $("#r_files").files;
    if (files.length){
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      fd.append('entity','report'); fd.append('entity_id', id);
      const r = await fetch('/api/files',{ method:'POST', headers: API.token?{ 'Authorization':'Bearer '+API.token }:{}, body: fd });
      const jj = await r.json(); if(!jj.ok) toast(jj.error||'อัปโหลดรูปไม่สำเร็จ','error');
    }
    toast('ส่งรายงานแล้ว'); renderReports();
  };
  load();
  async function load(){
    const j = await GET('/api/reports'); if(!j.ok) return;
    const arr = j.data;
    let html='';
    for (const r of arr){
      // fetch attachments for each report
      const pics = await GET('/api/attachments?'+new URLSearchParams({entity:'report', entity_id:r.id}));
      const thumbs = (pics.data||[]).slice(0,6).map(p=>`<img src="${p.url}" class="thumb" title="${p.filename}">`).join('');
      html += `<div class="rounded-2xl border bg-white/70 p-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium">${r.date} · ${r.customer||'-'}</div>
            <div class="text-xs text-slate-500">${r.note||''}</div>
          </div>
          <div class="text-xs text-slate-500">โดย ${window.__me?.name||''}</div>
        </div>
        <div class="flex flex-wrap gap-2 mt-2">${thumbs}</div>
      </div>`;
    }
    $("#r_list").innerHTML = html || '<div class="text-slate-500">ยังไม่มีรายงาน</div>';
  }
}

async function renderUsers(){
  const wrap = $("#panel");
  wrap.innerHTML = `<div class="glass border rounded-2xl p-4 shadow-sm mb-3">
    <div class="flex items-center justify-between gap-2">
      <div class="font-semibold">จัดการผู้ใช้</div>
      <button id="addUser" class="px-3 py-2 rounded-xl border hover:bg-slate-50">${icon('user-plus','w-4 h-4')} ผู้ใช้ใหม่</button>
    </div>
  </div>
  <div class="glass border rounded-2xl p-4 shadow-sm overflow-x-auto">
    <table class="min-w-full text-sm" id="uTbl"><thead><tr class="bg-slate-50/80">
      <th class="p-2">อีเมล</th><th class="p-2">ชื่อ</th><th class="p-2">บทบาท</th><th class="p-2">ทีม</th><th class="p-2">โซน</th><th class="p-2">จัดการ</th>
    </tr></thead><tbody></tbody></table>
  </div>`;
  $("#addUser").onclick = ()=> openModal();
  load();
  async function load(){
    const j=await GET('/api/users'); if(!j.ok){ wrap.innerHTML='โหลดผู้ใช้ไม่สำเร็จ'; return; }
    const tb=$("#uTbl tbody"); tb.innerHTML="";
    j.data.forEach(u=>{
      const tr=document.createElement('tr'); tr.className='border-t';
      tr.innerHTML = `<td class="p-2">${u.email}</td><td class="p-2">${u.name||''}</td><td class="p-2">${u.role}</td><td class="p-2">${u.team||''}</td><td class="p-2">${u.zone||''}</td>
        <td class="p-2 flex gap-2">
          <button data-edit="${u.id}" class="border rounded px-2 py-1">${icon('pencil')}</button>
          <button data-reset="${u.id}" class="border rounded px-2 py-1">${icon('key')}</button>
          <button data-del="${u.id}" class="border rounded px-2 py-1">${icon('trash')}</button>
        </td>`;
      tb.appendChild(tr);
    });
    $$("[data-edit]").forEach(b=> b.onclick=()=> openModal(j.data.find(x=>x.id===b.getAttribute('data-edit'))));
    $$("[data-reset]").forEach(b=> b.onclick=async()=>{ const id=b.getAttribute('data-reset'); const pw=prompt("ตั้งรหัสใหม่ (≥8)"); if(pw==null) return; const r=await PUT('/api/users/'+id,{password:pw}); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('อัปเดตรหัสแล้ว'); load(); } });
    $$("[data-del]").forEach(b=> b.onclick=async()=>{ const id=b.getAttribute('data-del'); if(!confirm('ยืนยันลบผู้ใช้นี้?')) return; const r=await DEL('/api/users/'+id); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('ลบแล้ว'); load(); } });
    if (window.lucide) lucide.createIcons();
  }
  function openModal(row={}){
    const html = `<div class="p-4">
      <div class="text-lg font-semibold mb-3">${row.id?'แก้ผู้ใช้':'ผู้ใช้ใหม่'}</div>
      <label class="block mb-2"><span class="text-xs text-slate-500">อีเมล</span><input id="e" class="w-full border rounded-xl px-3 py-2" value="${(row.email||'').replace(/"/g,'&quot;')}"></label>
      <label class="block mb-2"><span class="text-xs text-slate-500">ชื่อ</span><input id="n" class="w-full border rounded-xl px-3 py-2" value="${(row.name||'').replace(/"/g,'&quot;')}"></label>
      <label class="block mb-2"><span class="text-xs text-slate-500">บทบาท</span><select id="r" class="w-full border rounded-xl px-3 py-2"><option ${row.role==='admin'?'selected':''}>admin</option><option ${row.role!=='admin'?'selected':''}>staff</option></select></label>
      <div class="grid grid-cols-2 gap-3 mb-4">
        <label class="block"><span class="text-xs text-slate-500">ทีม</span><input id="t" class="w-full border rounded-xl px-3 py-2" value="${(row.team||'HQ').replace(/"/g,'&quot;')}"></label>
        <label class="block"><span class="text-xs text-slate-500">โซน</span><input id="z" class="w-full border rounded-xl px-3 py-2" value="${(row.zone||'BKK').replace(/"/g,'&quot;')}"></label>
      </div>
      ${row.id?'':'<label class="block mb-4"><span class="text-xs text-slate-500">รหัสเริ่มต้น (≥8)</span><input id="p" class="w-full border rounded-xl px-3 py-2" value="12345678"></label>'}
      <div class="flex justify-end gap-2"><button class="px-3 py-2 rounded-xl border" id="m_cancel">ยกเลิก</button><button class="px-3 py-2 rounded-xl bg-brand-600 text-white" id="m_save">${row.id?'บันทึก':'สร้าง'}</button></div>
    </div>`;
    modal(html); $("#m_cancel").onclick=closeModal; $("#m_save").onclick=async()=>{
      const payload={ email:$("#e").value, name:$("#n").value, role:$("#r").value, team:$("#t").value, zone:$("#z").value };
      const r = row.id ? await PUT('/api/users/'+row.id, payload) : await POST('/api/users', { ...payload, password: $("#p").value });
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); load(); }
    };
  }
}

// ---- Generic files modal ----
function openFilesModal(entity, entity_id){
  const html = `<div class="p-4">
    <div class="text-lg font-semibold mb-3">อัปโหลดไฟล์</div>
    <input id="f_input" type="file" multiple class="w-full mb-3">
    <div class="flex justify-end gap-2"><button class="px-3 py-2 rounded-xl border" id="m_cancel">ปิด</button><button class="px-3 py-2 rounded-xl bg-brand-600 text-white" id="m_upload">อัปโหลด</button></div>
    <div class="mt-3 text-sm text-slate-500">ไฟล์จะถูกบันทึกในระบบและดูได้จากหน้าเกี่ยวข้อง</div>
  </div>`;
  modal(html);
  $("#m_cancel").onclick = closeModal;
  $("#m_upload").onclick = async ()=>{
    const input = $("#f_input"); const fd = new FormData();
    for (const f of input.files) fd.append('files', f);
    fd.append('entity', entity); fd.append('entity_id', entity_id);
    const r = await fetch('/api/files',{ method:'POST', headers: API.token?{ 'Authorization':'Bearer '+API.token }:{}, body: fd });
    const j = await r.json(); if(!j.ok) toast(j.error||'อัปโหลดไม่สำเร็จ','error'); else { toast('อัปโหลดแล้ว'); closeModal(); }
  };
}

// ---- boot ----
(async ()=>{
  if (!localStorage.getItem("token")) return viewLogin();
  const me=await GET("/api/me"); if(!me.ok||!me.user) return viewLogin();
  viewHome();
})();