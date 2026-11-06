const API = '';
const $ = (s, root=document) => root.querySelector(s);
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function request(url, options={}) {
  const res = await fetch(API + url, { headers:{'Content-Type':'application/json'}, ...options });
  const data = await res.json().catch(()=>({message:'Unexpected server response'}));
  if(!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}
function message(el, text, type='success'){ if(el){el.textContent=text;el.className=`message ${type}`;} }
function activeNav(){ const page=location.pathname.split('/').pop()||'index.html'; document.querySelectorAll('.nav a').forEach(a=>{if(a.getAttribute('href')===page)a.classList.add('active')}); }
activeNav();

async function home(){
 try{const h=await request('/api/health');$('#db-state').textContent='Connected · '+h.database;$('#student-count').textContent=h.counts.students;$('#course-count').textContent=h.counts.courses;$('#registration-count').textContent=h.counts.registrations;}
 catch(e){$('#db-state').textContent='Database error: '+e.message;['student-count','course-count','registration-count'].forEach(id=>$('#'+id).textContent='—');}
}
async function studentsList(){
 const tbody=$('#students-body'), search=$('#student-search');
 async function load(){try{const rows=await request('/api/students');const q=search.value.toLowerCase();const filtered=rows.filter(s=>[s.name,s.roll_no,s.branch,s.email].some(v=>String(v||'').toLowerCase().includes(q)));tbody.innerHTML=filtered.length?filtered.map(s=>`<tr><td>${s.student_id}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.roll_no)}</td><td>${esc(s.branch)}</td><td>${esc(s.email)}</td><td><a class="btn secondary" href="update-student.html?id=${s.student_id}">Edit</a></td></tr>`).join(''):'<tr><td colspan="6" class="empty">No students found.</td></tr>';}
 catch(e){tbody.innerHTML=`<tr><td colspan="6" class="empty">${esc(e.message)}</td></tr>`;}}
 search.addEventListener('input',load);load();
}
async function insertStudent(){const form=$('#student-form'),msg=$('#form-message');form.addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));try{await request('/api/students',{method:'POST',body:JSON.stringify(data)});form.reset();message(msg,'Student inserted successfully.','success');}catch(err){message(msg,err.message,'error');}});}
async function updateStudent(){
 const select=$('#student-select'),form=$('#student-form'),msg=$('#form-message');let rows=[];
 try{rows=await request('/api/students');select.innerHTML='<option value="">Choose a student</option>'+rows.map(s=>`<option value="${s.student_id}">${esc(s.roll_no)} — ${esc(s.name)}</option>`).join('');}
 catch(e){message(msg,e.message,'error');return;}
 const requested=new URLSearchParams(location.search).get('id');if(requested)select.value=requested;
 function fill(){const s=rows.find(x=>String(x.student_id)===select.value);['name','roll_no','branch','email'].forEach(k=>form.elements[k].value=s?.[k]||'');}
 select.addEventListener('change',fill);if(select.value)fill();
 form.addEventListener('submit',async e=>{e.preventDefault();if(!select.value)return message(msg,'Choose a student first.','error');const data=Object.fromEntries(new FormData(form));try{await request('/api/students/'+select.value,{method:'PUT',body:JSON.stringify(data)});message(msg,'Student details updated successfully.','success');rows=await request('/api/students');}catch(err){message(msg,err.message,'error');}});
}
async function deleteStudent(){
 const select=$('#student-select'),info=$('#student-info'),msg=$('#form-message');let rows=[];
 try{rows=await request('/api/students');select.innerHTML='<option value="">Choose a student</option>'+rows.map(s=>`<option value="${s.student_id}">${esc(s.roll_no)} — ${esc(s.name)}</option>`).join('');}
 catch(e){return message(msg,e.message,'error');}
 select.addEventListener('change',()=>{const s=rows.find(x=>String(x.student_id)===select.value);info.textContent=s?`${s.name} · ${s.roll_no} · ${s.branch} · ${s.email}`:'';});
 $('#delete-button').addEventListener('click',async()=>{if(!select.value)return message(msg,'Choose a student first.','error');const s=rows.find(x=>String(x.student_id)===select.value);if(!confirm(`Delete ${s.name} (${s.roll_no})? This cannot be undone.`))return;try{await request('/api/students/'+select.value,{method:'DELETE'});message(msg,'Student deleted successfully.','success');rows=rows.filter(x=>String(x.student_id)!==select.value);select.innerHTML='<option value="">Choose a student</option>'+rows.map(x=>`<option value="${x.student_id}">${esc(x.roll_no)} — ${esc(x.name)}</option>`).join('');info.textContent='';}catch(e){message(msg,e.message,'error');}});
}
async function pendingStudents(){
 const tbody=$('#pending-body'),course=$('#course-select'),msg=$('#form-message');
 try{const [students,regs,courses]=await Promise.all([request('/api/students'),request('/api/registrations'),request('/api/courses')]);const registered=new Set(regs.filter(r=>r.status!=='Cancelled').map(r=>Number(r.student_id)));const pending=students.filter(s=>!registered.has(Number(s.student_id)));course.innerHTML='<option value="">Choose course</option>'+courses.map(c=>`<option value="${c.course_id}">${esc(c.course_code)} — ${esc(c.course_name)}</option>`).join('');
 tbody.innerHTML=pending.length?pending.map(s=>`<tr><td>${s.student_id}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.roll_no)}</td><td>${esc(s.branch)}</td><td><button class="btn" data-student="${s.student_id}">Register</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">No students are currently pending registration.</td></tr>';
 tbody.querySelectorAll('button[data-student]').forEach(btn=>btn.addEventListener('click',async()=>{if(!course.value)return message(msg,'Choose a course above before registering.','error');try{await request('/api/registrations',{method:'POST',body:JSON.stringify({student_id:Number(btn.dataset.student),course_id:Number(course.value)})});message(msg,'Student registered successfully.','success');pendingStudents();}catch(e){message(msg,e.message,'error');}}));
 if(!courses.length)message(msg,'No courses found. Add course records to the courses table before registering students.','error');
 }catch(e){tbody.innerHTML=`<tr><td colspan="5" class="empty">${esc(e.message)}</td></tr>`;}
}
