/* Mini CRM — public/app.js (r3 full)
 * ทำงานกับ backend server.js (r3)
 * ฟีเจอร์: Auth, Dashboard KPI, Deals (kanban + drag&drop), Companies/Contacts, Tasks, Reports (แนบรูป), Users(Admin), Export CSV, Change password
 */

// ---------- helpers & fetch layer ----------
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
const API = { base: "", token: localStorage.getItem("token") || "" };
const headers = () => API.token ? { "Authorization":"Bearer "+API.token, "Content-Type":"application/json" } : { "Content-Type":"application/json" };
const GET = async (p) => (await fetch(API.base+p,{ headers: headers() })).json();
const POST = async (p,b) => (await fetch(API.base+p,{ method:"POST", headers: headers(), body: JSON.stringify(b) })).json();
const PUT  = async (p,b) => (await fetch(API.base+p,{ method:"PUT",  headers: headers(), body: JSON.stringify(b) })).json();
const DEL  = async (p)   => (await fetch(API.base+p,{ method:"DELETE", headers: headers() })).json();

function toast(msg, type="ok"){
  const color = type==="error" ? "bg-rose-600" : type==="warn" ? "bg-amber-500" : "bg-emerald-600";
  const el = document.createElement('div'); el.className = `text-white ${color} rounded-xl shadow-lift px-3 py-2`; el.textContent = msg;
  const box = $("#toast"); box.appendChild(el); setTimeout(()=>el.remove(), 2600);
}
function openModal(html){ $("#modalCard").innerHTML = html; $("#modal").classList.remove("hidden"); $("#modal").onclick=e=>{ if(e.target.id==="modal") closeModal(); }; }
function closeModal(){ $("#modal").classList.add("hidden"); }
function icon(name,cls="w-4 h-4"){ return `<i data-lucide="${name}" class="${cls}"></i>`; }
function chipStage(s){ const m={new:'sky',qualify:'amber',proposal:'violet',negotiation:'fuchsia',won:'emerald',lost:'rose'}; const c=m[s]||'slate'; return `<span class="chip bg-${c}-100 text-${c}-700">${s}</span>`; }

// ---------- layout ----------
function Shell(content){
  return `<div class="flex min-h-screen">
    <aside class="hidden lg:block w-72 p-4">
      <div class="glass rounded-3xl border shadow-soft p-4 h-full flex flex-col">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 grid place-items-center rounded-2xl bg-brand-600 text-white font-bold">CRM</div>
          <div class="leading-tight"><div class="font-semibold">Sales CRM</div><div class="text-xs text-slate-500">Doors & Flooring</div></div>
        </div>
        <nav class="flex-1 space-y-1" id="sidenav">
          ${nav('dashboard','แดชบอร์ด','layout-dashboard')}
          ${nav('deals','ดีล','kanban')}
          ${nav('companies','บริษัท','building-2')}
          ${nav('contacts','บุคคล','users')}
          ${nav('tasks','งาน','check-square')}
          ${nav('reports','รายงานประจำวัน','notebook')}
          <div id="adminOnly"></div>
        </nav>
        <div class="mt-auto space-y-2">
          <button id="btnBackup" class="btn w-full hidden">${icon('hard-drive')} สำรองข้อมูล</button>
          <button id="btnLogout" class="btn w-full">${icon('log-out')} ออกจากระบบ</button>
        </div>
      </div>
    </aside>
    <main class="flex-1 p-4 space-y-4">
      <header class="glass rounded-3xl border shadow-soft px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="font-semibold">Mini CRM — Doors & Flooring</div>
          <div class="hidden md:block text-slate-500 text-sm">บันทึกดีล งาน และรายงานประจำวัน</div>
        </div>
        <div class="flex items-center gap-2">
          <button id="btnExportDeals" class="btn">${icon('download')} Export ดีล</button>
          <button id="btnChangePw" class="btn">${icon('key')} เปลี่ยนรหัส</button>
        </div>
      </header>
      <div id="main" class="space-y-4">${content||''}</div>
    </main>
  </div>`;
}
function nav(tab,label,ico){ return `<button class="navbtn" data-tab="${tab}">${icon(ico)}<span>${label}</span></button>`; }
function setActive(tab){ $$("#sidenav .navbtn").forEach(b=> b.classList.toggle('active', b.dataset.tab===tab)); }

// ---------- pages ----------
async function pageDashboard(){
  const k = await GET('/api/kpi');
  if(!k.ok) return `<div class="card p-6">โหลดไม่สำเร็จ</div>`;
  const d = k.data;
  const card = (t,v,ico)=>`<div class="card p-5"><div class="flex items-center gap-2 text-slate-500 text-xs">${icon(ico)}${t}</div><div class="mt-1 text-3xl font-bold">${v}</div></div>`;
  const stages = d.byStage.map(s=>`<div class="rounded-xl border bg-white/70 p-3 text-center"><div class="text-xs text-slate-500">${s.stage}</div><div class="text-xl font-semibold">${s.count}</div></div>`).join('');
  return `<section class="grid md:grid-cols-4 gap-4">
    ${card('ดีลทั้งหมด', d.total, 'folder-kanban')}
    ${card('ชนะ', d.wonCount, 'trophy')}
    ${card('มูลค่ารวม', d.estSum.toLocaleString(), 'coins')}
    ${card('ชนะ (มูลค่า)', d.wonSum.toLocaleString(), 'banknote')}
  </section>
  <section class="card p-5">
    <div class="font-semibold mb-2">สรุปตามสเตจ</div>
    <div class="grid grid-cols-2 md:grid-cols-6 gap-3">${stages}</div>
  </section>`;
}

async function pageDeals(){
  const stages = ['new','qualify','proposal','negotiation','won','lost'];
  const toolbar = `<div class="glass rounded-2xl border shadow-soft p-3 flex flex-wrap gap-2 items-end">
    <div><div class="label">ค้นหา</div><input id="q" class="input" placeholder="ชื่องาน/ลูกค้า/คำค้น"></div>
    <div><div class="label">สเตจ</div><select id="stage" class="input"><option value="">ทั้งหมด</option>${stages.map(s=>`<option>${s}</option>`).join('')}</select></div>
    <button id="add" class="btn btn-primary ml-auto">${icon('plus')} ดีลใหม่</button>
  </div>
  <div id="board" class="grid lg:grid-cols-3 2xl:grid-cols-6 gap-3"></div>`;

  const column = (name,count,rows)=>`
    <div class="rounded-2xl border bg-white/70 p-3 flex flex-col gap-2" ondragover="event.preventDefault()" ondrop="dropTo('${name}', event)">
      <div class="flex items-center justify-between">
        <div class="font-semibold">${name.toUpperCase()}</div>
        <div class="chip bg-slate-100 text-slate-600">${count}</div>
      </div>
      <div class="flex-1 min-h-[80px] space-y-2">${rows}</div>
    </div>`;
  const item = (x)=>`
    <div class="rounded-xl border bg-white p-3 shadow-soft cursor-grab" draggable="true" ondragstart="dragDeal('${x.id}', event)">
      <div class="font-medium">${x.title||'-'}</div>
      <div class="text-xs text-slate-500 mt-0.5">฿${(Number(x.value)||0).toLocaleString()}</div>
      <div class="mt-2 flex gap-2">
        <button class="btn" onclick="editDeal('${x.id}')">${icon('pencil')} แก้</button>
        <button class="btn" onclick="openFilesModal('deal','${x.id}')">${icon('paperclip')} ไฟล์</button>
      </div>
    </div>`;

  async function draw(){
    const q=$("#q").value, stage=$("#stage").value;
    const j=await GET('/api/deals?'+new URLSearchParams({q,stage}));
    if(!j.ok) return;
    const groups = Object.fromEntries(stages.map(s=>[s,[]]));
    (j.data||[]).forEach(x=> (groups[x.stage]||groups['new']).push(x) );
    const html = stages.map(s=> column(s, groups[s].length, groups[s].map(item).join('')) ).join('');
    $("#board").innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  window.dragDeal = (id,e)=> e.dataTransfer.setData('text/id', id);
  window.dropTo = async (stage,e)=>{ const id=e.dataTransfer.getData('text/id'); const r=await POST('/api/deals/'+id+'/move',{stage}); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else draw(); };
  window.editDeal = (id)=>{
    openModal(`<div class="p-5">
      <div class="text-lg font-semibold mb-3">แก้ดีล</div>
      <label class="label">ชื่อดีล</label><input id="t" class="input mb-2">
      <label class="label">มูลค่า</label><input id="v" class="input mb-4" type="number">
      <div class="flex justify-end gap-2"><button class="btn" onclick="closeModal()">${icon('x')} ยกเลิก</button><button class="btn btn-primary" id="save">${icon('check')} บันทึก</button></div>
    </div>`);
    $("#save").onclick = async ()=>{
      const r=await PUT('/api/deals/'+id,{ title:$("#t").value, value:Number($("#v").value||0) });
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); draw(); }
    };
  };

  $("#main").innerHTML = toolbar;
  $("#add").onclick = ()=>{
    openModal(`<div class="p-5">
      <div class="text-lg font-semibold mb-3">ดีลใหม่</div>
      <label class="label">ชื่อดีล</label><input id="t" class="input mb-2">
      <label class="label">มูลค่า</label><input id="v" class="input mb-4" type="number">
      <div class="flex justify-end gap-2"><button class="btn" onclick="closeModal()">${icon('x')} ยกเลิก</button><button class="btn btn-primary" id="save">${icon('check')} สร้าง</button></div>
    </div>`);
    $("#save").onclick = async ()=>{
      const r=await POST('/api/deals',{ title:$("#t").value, value:Number($("#v").value||0) });
      if(!r.ok) toast(r.error||'สร้างไม่สำเร็จ','error'); else { toast('สร้างแล้ว'); closeModal(); draw(); }
    };
  };
  $("#q").oninput = draw; $("#stage").onchange = draw;
  await draw();
  return "";
}

async function pageCompanies(){
  $("#main").innerHTML = `<div class="glass rounded-2xl border shadow-soft p-3 flex items-center gap-2">
    <input id="q" class="input" placeholder="ค้นหาบริษัท">
    <button id="add" class="btn btn-primary ml-auto">${icon('plus')} บริษัทใหม่</button>
  </div>
  <div class="card p-0 overflow-hidden">
    <table class="min-w-full text-sm">
      <thead class="bg-slate-50 text-slate-600"><tr>
        <th class="text-left p-3">ชื่อ</th><th class="text-left p-3">เบอร์</th><th class="text-left p-3">ที่อยู่</th><th class="text-left p-3 w-28">จัดการ</th>
      </tr></thead><tbody id="rows"></tbody>
    </table>
  </div>`;
  $("#add").onclick = ()=> edit();
  $("#q").oninput = draw;

  async function draw(){
    const j = await GET('/api/companies?'+new URLSearchParams({q:$("#q").value}));
    const tb = $("#rows"); tb.innerHTML = "";
    (j.data||[]).forEach(c=>{
      const tr = document.createElement('tr'); tr.className="border-t";
      tr.innerHTML = `<td class="p-3">${c.name||''}</td><td class="p-3">${c.phone||''}</td><td class="p-3">${c.address||''}</td>
        <td class="p-3"><button class="btn" onclick="edit('${c.id}')">${icon('pencil')}</button></td>`;
      tb.appendChild(tr);
    });
    if (window.lucide) lucide.createIcons();
  }
  window.edit = (id)=>{
    openModal(`<div class="p-5">
      <div class="text-lg font-semibold mb-3">${id?'แก้บริษัท':'บริษัทใหม่'}</div>
      <label class="label">ชื่อ</label><input id="n" class="input mb-2">
      <label class="label">เบอร์</label><input id="p" class="input mb-2">
      <label class="label">ที่อยู่</label><input id="a" class="input mb-4">
      <div class="flex justify-end gap-2"><button class="btn" onclick="closeModal()">${icon('x')} ยกเลิก</button><button class="btn btn-primary" id="save">${icon('check')} บันทึก</button></div>
    </div>`);
    $("#save").onclick = async ()=>{
      const payload = { name:$("#n").value, phone:$("#p").value, address:$("#a").value };
      const r = id ? await PUT('/api/companies/'+id,payload) : await POST('/api/companies',payload);
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); draw(); }
    };
  };
  await draw(); return "";
}

async function pageContacts(){
  $("#main").innerHTML = `<div class="glass rounded-2xl border shadow-soft p-3 flex items-center gap-2">
    <input id="q" class="input" placeholder="ค้นหาบุคคล">
    <button id="add" class="btn btn-primary ml-auto">${icon('plus')} บุคคลใหม่</button>
  </div>
  <div class="card p-0 overflow-hidden">
    <table class="min-w-full text-sm">
      <thead class="bg-slate-50 text-slate-600"><tr>
        <th class="text-left p-3">ชื่อ</th><th class="text-left p-3">อีเมล</th><th class="text-left p-3">โทร</th><th class="text-left p-3 w-28">จัดการ</th>
      </tr></thead><tbody id="rows"></tbody>
    </table>
  </div>`;
  $("#add").onclick = ()=> editC();
  $("#q").oninput = draw;

  async function draw(){
    const j = await GET('/api/contacts?'+new URLSearchParams({q:$("#q").value}));
    const tb = $("#rows"); tb.innerHTML = "";
    (j.data||[]).forEach(c=>{
      const tr = document.createElement('tr'); tr.className="border-t";
      tr.innerHTML = `<td class="p-3">${c.full_name||''}</td><td class="p-3">${c.email||''}</td><td class="p-3">${c.phone||''}</td>
        <td class="p-3"><button class="btn" onclick="editC('${c.id}')">${icon('pencil')}</button></td>`;
      tb.appendChild(tr);
    });
    if (window.lucide) lucide.createIcons();
  }
  window.editC = (id)=>{
    openModal(`<div class="p-5">
      <div class="text-lg font-semibold mb-3">${id?'แก้ข้อมูล':'บุคคลใหม่'}</div>
      <label class="label">ชื่อ</label><input id="n" class="input mb-2">
      <label class="label">อีเมล</label><input id="e" class="input mb-2">
      <label class="label">โทร</label><input id="p" class="input mb-4">
      <div class="flex justify-end gap-2"><button class="btn" onclick="closeModal()">${icon('x')} ยกเลิก</button><button class="btn btn-primary" id="save">${icon('check')} บันทึก</button></div>
    </div>`);
    $("#save").onclick = async ()=>{
      const payload = { full_name:$("#n").value, email:$("#e").value, phone:$("#p").value };
      const r = id ? await PUT('/api/contacts/'+id,payload) : await POST('/api/contacts',payload);
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); draw(); }
    };
  };
  await draw(); return "";
}

async function pageTasks(){
  $("#main").innerHTML = `<div class="glass rounded-2xl border shadow-soft p-3 flex items-center gap-2">
    <input id="q" class="input" placeholder="ค้นหางาน">
    <button id="add" class="btn btn-primary ml-auto">${icon('plus')} เพิ่มงาน</button>
  </div><div id="list" class="space-y-2"></div>`;
  $("#add").onclick = ()=> editT();
  $("#q").oninput = draw;

  async function draw(){
    const j = await GET('/api/activities?'+new URLSearchParams({q:$("#q").value}));
    $("#list").innerHTML = (j.data||[]).map(a=>`
      <div class="card p-3 flex items-center justify-between">
        <div><div class="font-medium">${a.type||'task'} · ${a.due_at||''}</div><div class="text-xs text-slate-500">${a.note||''}</div></div>
        <div class="flex gap-2">
          <button class="btn" onclick="doneT('${a.id}')">${icon('check')} ทำเสร็จ</button>
          <button class="btn" onclick="editT('${a.id}')">${icon('pencil')} แก้</button>
        </div>
      </div>`).join('') || `<div class="card p-4 text-slate-500">ยังไม่มีงาน</div>`;
    if (window.lucide) lucide.createIcons();
  }
  window.doneT = async (id)=>{ const r=await PUT('/api/activities/'+id,{done:true}); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else draw(); };
  window.editT = (id)=>{
    openModal(`<div class="p-5">
      <div class="text-lg font-semibold mb-3">${id?'แก้งาน':'เพิ่มงาน'}</div>
      <label class="label">ประเภท (call/meet/note/task)</label><input id="t" class="input mb-2">
      <label class="label">กำหนดเสร็จ (YYYY-MM-DD)</label><input id="d" class="input mb-2">
      <label class="label">รายละเอียด</label><input id="n" class="input mb-4">
      <div class="flex justify-end gap-2"><button class="btn" onclick="closeModal()">${icon('x')} ยกเลิก</button><button class="btn btn-primary" id="save">${icon('check')} บันทึก</button></div>
    </div>`);
    $("#save").onclick = async ()=>{
      const payload = { type:$("#t").value, due_at:$("#d").value, note:$("#n").value };
      const r = id ? await PUT('/api/activities/'+id,payload) : await POST('/api/activities',payload);
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); draw(); }
    };
  };
  await draw(); return "";
}

async function pageReports(){
  $("#main").innerHTML = `<div class="card p-4">
    <div class="grid lg:grid-cols-2 gap-3">
      <div><div class="label">วันที่</div><input id="r_date" type="date" class="input"></div>
      <div><div class="label">ลูกค้า/โปรเจกต์</div><input id="r_customer" class="input" placeholder="เช่น โครงการบ้าน A"></div>
      <div class="lg:col-span-2"><div class="label">รายละเอียด</div><textarea id="r_note" class="input" rows="3" placeholder="วันนี้ไปพบลูกค้า..."></textarea></div>
      <div class="lg:col-span-2"><div class="label">แนบรูป (หลายไฟล์)</div><input id="r_files" type="file" multiple class="w-full"></div>
      <div class="lg:col-span-2 flex justify-end"><button id="r_submit" class="btn btn-primary">${icon('send')} ส่งรายงาน</button></div>
    </div>
  </div>
  <div class="glass rounded-2xl border shadow-soft p-4">
    <div class="flex items-center justify-between mb-3">
      <div class="font-semibold">รายงานล่าสุด</div>
      <button id="exportReports" class="btn">${icon('download')} Export CSV</button>
    </div>
    <div id="r_list" class="masonry"></div>
  </div>`;
  const today = new Date().toISOString().slice(0,10); $("#r_date").value = today;
  $("#exportReports").onclick = ()=> window.open("/api/export/reports.csv","_blank");
  $("#r_submit").onclick = submit;
  await draw();

  async function draw(){
    const j = await GET('/api/reports'); if(!j.ok) return;
    const list = $("#r_list"); let html='';
    for (const r of j.data){
      const pics = await GET('/api/attachments?'+new URLSearchParams({entity:'report', entity_id:r.id}));
      const thumbs = (pics.data||[]).map(p=>`<div class="masonry-item"><img src="${p.url}" class="rounded-2xl shadow-soft hover:shadow-lift transition" onclick="openLightbox('${p.url}')" /></div>`).join('');
      html += `<div class="masonry-item card p-4">
        <div class="flex items-center justify-between">
          <div><div class="font-medium">${r.date} · ${r.customer||'-'}</div><div class="text-xs text-slate-500">${r.note||''}</div></div>
          <div class="text-xs text-slate-500">โดย ${window.__me?.name||''}</div>
        </div>
        <div class="mt-3">${thumbs||'<div class="text-slate-500 text-sm">ไม่มีรูปแนบ</div>'}</div>
      </div>`;
    }
    list.innerHTML = html || '<div class="text-slate-500 text-sm">ยังไม่มีรายงาน</div>';
  }
  async function submit(){
    const j = await POST('/api/reports',{ date: $("#r_date").value, customer: $("#r_customer").value, note: $("#r_note").value, location: '' });
    if(!j.ok) return toast(j.error||'บันทึกไม่สำเร็จ','error');
    const id = j.data.id; const files = $("#r_files").files;
    if (files.length){
      const fd = new FormData(); for(const f of files) fd.append('files', f);
      fd.append('entity','report'); fd.append('entity_id', id);
      const r = await fetch('/api/files',{ method:'POST', headers: API.token?{ 'Authorization':'Bearer '+API.token }:{}, body: fd });
      const jj = await r.json(); if(!jj.ok) toast(jj.error||'อัปโหลดรูปไม่สำเร็จ','error');
    }
    toast('ส่งรายงานแล้ว'); pageReports();
  }
  return "";
}

// lightbox
window.openLightbox = (src)=>{
  openModal(`<div class="bg-black">
    <div class="flex justify-end p-2"><button class="btn text-white border-white" onclick="closeModal()">${icon('x')}</button></div>
    <img src="${src}" class="max-h-[80vh] mx-auto rounded-xl" />
  </div>`);
};

async function pageUsers(){
  $("#main").innerHTML = `<div class="glass rounded-2xl border shadow-soft p-3 flex items-center justify-between">
    <div class="font-semibold">ผู้ใช้ (Admin)</div>
    <div class="flex gap-2">
      <button id="backupNow" class="btn">${icon('hard-drive')} สำรองข้อมูล</button>
      <button id="addUser" class="btn btn-primary">${icon('user-plus')} ผู้ใช้ใหม่</button>
    </div>
  </div>
  <div class="card p-0 overflow-hidden">
    <table class="min-w-full text-sm">
      <thead class="bg-slate-50 text-slate-600"><tr>
        <th class="text-left p-3">อีเมล</th><th class="text-left p-3">ชื่อ</th><th class="text-left p-3">บทบาท</th>
        <th class="text-left p-3">ทีม</th><th class="text-left p-3">โซน</th><th class="text-left p-3 w-44">จัดการ</th>
      </tr></thead><tbody id="uRows"></tbody>
    </table>
  </div>`;
  $("#addUser").onclick = ()=> editU();
  $("#backupNow").onclick = async ()=>{ const r=await POST('/api/admin/backups/now',{}); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else toast('สำรองข้อมูลแล้ว'); };
  await draw();

  async function draw(){
    const j=await GET('/api/users'); if(!j.ok) return;
    const tb=$("#uRows"); tb.innerHTML="";
    (j.data||[]).forEach(u=>{
      const tr=document.createElement('tr'); tr.className="border-t";
      tr.innerHTML = `<td class="p-3">${u.email}</td><td class="p-3">${u.name||''}</td><td class="p-3">${u.role}</td><td class="p-3">${u.team||''}</td><td class="p-3">${u.zone||''}</td>
      <td class="p-3 flex gap-2"><button class="btn" onclick="editU('${u.id}')">${icon('pencil')}</button><button class="btn" onclick="resetU('${u.id}')">${icon('key')}</button><button class="btn" onclick="delU('${u.id}')">${icon('trash')}</button></td>`;
      tb.appendChild(tr);
    });
    if (window.lucide) lucide.createIcons();
  }
  window.editU = (id)=>{
    openModal(`<div class="p-5">
      <div class="text-lg font-semibold mb-3">${id?'แก้ผู้ใช้':'ผู้ใช้ใหม่'}</div>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="label">อีเมล</label><input id="e" class="input"></div>
        <div class="col-span-2"><label class="label">ชื่อ</label><input id="n" class="input"></div>
        <div><label class="label">บทบาท</label><select id="r" class="input"><option>admin</option><option selected>staff</option></select></div>
        <div><label class="label">ทีม</label><input id="t" class="input" value="HQ"></div>
        <div><label class="label">โซน</label><input id="z" class="input" value="BKK"></div>
        <div class="col-span-2" id="pwWrap"><label class="label">รหัสเริ่มต้น (≥8)</label><input id="p" class="input" value="12345678"></div>
      </div>
      <div class="flex justify-end gap-2 mt-4"><button class="btn" onclick="closeModal()">${icon('x')} ยกเลิก</button><button class="btn btn-primary" id="save">${icon('check')} บันทึก</button></div>
    </div>`);
    $("#save").onclick = async ()=>{
      const payload={ email:$("#e").value, name:$("#n").value, role:$("#r").value, team:$("#t").value, zone:$("#z").value };
      const r = id ? await PUT('/api/users/'+id, payload) : await POST('/api/users',{...payload,password:$("#p").value});
      if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('บันทึกแล้ว'); closeModal(); pageUsers(); }
    };
  };
  window.resetU = async (id)=>{ const pw=prompt("ตั้งรหัสใหม่ (≥8)"); if(pw==null) return; const r=await PUT('/api/users/'+id,{password:pw}); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('อัปเดตรหัสแล้ว'); pageUsers(); } };
  window.delU   = async (id)=>{ if(!confirm('ยืนยันลบผู้ใช้นี้?')) return; const r=await DEL('/api/users/'+id); if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('ลบแล้ว'); pageUsers(); } };
  return "";
}

// ---------- auth views ----------
function viewLogin(){
  $("#app").innerHTML = `<div class="min-h-screen grid place-items-center p-6">
    <div class="glass rounded-3xl border shadow-lift p-6 w-full max-w-md">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 grid place-items-center rounded-2xl bg-brand-600 text-white font-bold">CRM</div>
        <div><div class="font-semibold text-lg">เข้าสู่ระบบ</div><div class="text-xs text-slate-500">Sales CRM</div></div>
      </div>
      <label class="label">Email</label><input id="email" class="input" value="admin@example.com">
      <label class="label mt-3">Password</label><input id="password" type="password" class="input" value="admin123">
      <button id="loginBtn" class="btn btn-primary w-full mt-4">${icon('log-in')} เข้าสู่ระบบ</button>
    </div>
  </div>`;
  $("#loginBtn").onclick = async ()=>{
    const j = await POST('/api/auth/login', { email:$("#email").value, password:$("#password").value });
    if(!j.ok) return toast(j.error||'login failed','error');
    API.token = j.token; localStorage.setItem('token', j.token); window.__me = j.user;
    viewApp();
  };
}
async function viewApp(){
  $("#app").innerHTML = Shell(`<div class="card p-6">กำลังโหลด...</div>`);
  $("#btnLogout").onclick = ()=>{ localStorage.removeItem('token'); location.reload(); };
  $("#btnChangePw").onclick = openChangePw;
  $("#btnExportDeals").onclick = ()=> window.open('/api/export/deals.csv','_blank');

  // admin-only nav
  const me = await GET('/api/me');
  window.__me = me?.user;
  if(me?.user?.role==='admin'){
    $("#adminOnly").innerHTML = nav('users','ผู้ใช้ (Admin)','shield');
    $("#btnBackup").classList.remove('hidden');
  }

  // side nav click
  $$("#sidenav .navbtn").forEach(b=> b.onclick = ()=> route(b.dataset.tab) );
  await route('dashboard');
  if (window.lucide) lucide.createIcons();
}

async function route(tab){
  setActive(tab);
  let html='';
  if(tab==='dashboard') html = await pageDashboard();
  if(tab==='deals')      html = await pageDeals();
  if(tab==='companies')  html = await pageCompanies();
  if(tab==='contacts')   html = await pageContacts();
  if(tab==='tasks')      html = await pageTasks();
  if(tab==='reports')    html = await pageReports();
  if(tab==='users')      html = await pageUsers();
  if(html) $("#main").innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

function openChangePw(){
  openModal(`<div class="p-5">
    <div class="text-lg font-semibold mb-3">เปลี่ยนรหัสผ่าน</div>
    <label class="label">รหัสปัจจุบัน</label><input id="cpw" type="password" class="input mb-2">
    <label class="label">รหัสใหม่ (≥8)</label><input id="npw" type="password" class="input mb-4">
    <div class="flex justify-end gap-2"><button class="btn" onclick="closeModal()">${icon('x')} ยกเลิก</button><button class="btn btn-primary" id="save">${icon('check')} บันทึก</button></div>
  </div>`);
  $("#save").onclick = async ()=>{
    const r=await POST('/api/me/password',{ current:$("#cpw").value, next:$("#npw").value });
    if(!r.ok) toast(r.error||'ไม่สำเร็จ','error'); else { toast('เปลี่ยนรหัสแล้ว'); closeModal(); }
  };
}

// files modal (shared)
window.openFilesModal = (entity, entity_id)=>{
  openModal(`<div class="p-5">
    <div class="text-lg font-semibold mb-3">อัปโหลดไฟล์</div>
    <input id="f_input" type="file" multiple class="w-full mb-3">
    <div class="flex justify-end gap-2"><button class="btn" onclick="closeModal()">${icon('x')} ปิด</button><button class="btn btn-primary" id="m_upload">${icon('upload')} อัปโหลด</button></div>
  </div>`);
  $("#m_upload").onclick = async ()=>{
    const fd = new FormData(); const files = $("#f_input").files;
    for(const f of files) fd.append('files', f);
    fd.append('entity', entity); fd.append('entity_id', entity_id);
    const r = await fetch('/api/files',{ method:'POST', headers: API.token?{ 'Authorization':'Bearer '+API.token }:{}, body: fd });
    const j = await r.json(); if(!j.ok) toast(j.error||'อัปโหลดไม่สำเร็จ','error'); else { toast('อัปโหลดแล้ว'); closeModal(); }
  };
};

// ---------- boot ----------
(async ()=>{
  if(!localStorage.getItem('token')) return viewLogin();
  const me = await GET('/api/me'); if(!me.ok || !me.user) return viewLogin();
  window.__me = me.user;
  viewApp();
})();