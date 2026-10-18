import {firebaseConfig} from './firebase-config.js';
const $=id=>document.getElementById(id),show=(id,msg)=>$(id).textContent=msg;
const am=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),au=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),fs=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
const app=am.getApps().length?am.getApp():am.initializeApp(firebaseConfig),auth=au.getAuth(app),db=fs.getFirestore(app);
let authorized=false,users=[],activeUid=null,stopMessages=null;
const cleanUid=s=>String(s||'').trim();
const roles={none:'عميل',catalog_manager:'إدارة المنتجات',order_manager:'إدارة الطلبات',support_agent:'خدمة العملاء'};
const sanitizeText=s=>String(s||'').slice(0,500);
async function loadUsers(){
 if(!authorized)return;
 show('staffStatus','جاري تحميل الحسابات…');
 try{const [us,staff]=await Promise.all([fs.getDocs(fs.query(fs.collection(db,'users'),fs.limit(200))),fs.getDocs(fs.collection(db,'staffRoles'))]);const map=new Map(staff.docs.map(d=>[d.id,d.data().role]));users=us.docs.map(d=>({uid:d.id,...d.data(),assignedRole:map.get(d.id)||'none'}));drawUsers();show('staffStatus','عدد الحسابات المعروضة: '+users.length)}
 catch(e){show('staffStatus','تعذر تحميل الحسابات: '+(e.code||e.message))}
}
function drawUsers(){const container=$('staffUsers');container.replaceChildren();const q=$('staffSearch').value.trim().toLowerCase();const list=users.filter(p=>[p.name,p.phone,p.email,p.uid].some(x=>String(x||'').toLowerCase().includes(q))).slice(0,80);
 for(const p of list){const row=document.createElement('div');row.className='siteContentItem';const title=document.createElement('b');title.textContent=(p.name||'حساب')+' · '+(p.phone||p.email||'بدون هاتف');const sub=document.createElement('p');sub.className='hint';sub.textContent='الدور الحالي: '+(roles[p.assignedRole]||'عميل')+' · UID: '+p.uid;const select=document.createElement('button');select.type='button';select.textContent='تحديد الحساب';select.onclick=()=>{$('staffUid').value=p.uid;$('staffRole').value=p.assignedRole;show('staffStatus','اختر الدور ثم اضغط حفظ')};row.append(title,sub,select);container.append(row)}
 if(!list.length)container.textContent='لا توجد حسابات مطابقة. ممكن تستخدم UID مباشرة.'}
$('staffSearch').oninput=drawUsers;$('refreshStaff').onclick=loadUsers;
$('saveStaffRole').onclick=async()=>{
 if(!authorized)return;
 const uid=cleanUid($('staffUid').value),role=$('staffRole').value;if(!uid||uid.length<15||!roles[role])return show('staffStatus','اختار UID صحيح وصلاحية معتمدة');
 if(uid===auth.currentUser.uid)return show('staffStatus','مينفعش تغيّر صلاحية حسابك الإداري بنفسك');
 if(!confirm('تأكيد تغيير الصلاحية للحساب المحدد إلى: '+roles[role]+'؟'))return;
 try{await fs.setDoc(fs.doc(db,'staffRoles',uid),{role,updatedAt:fs.serverTimestamp()});show('staffStatus','✅ تم حفظ الدور. الموظف يعمل تسجيل خروج ودخول لتحديث صلاحياته.');loadUsers()}
 catch(e){show('staffStatus','فشل تغيير الدور: '+(e.code||e.message))}
};
async function loadThreads(){
 if(!authorized)return;
 show('supportStatus','جاري تحميل المحادثات…');
 try{const snap=await fs.getDocs(fs.query(fs.collection(db,'supportChats'),fs.limit(80)));const area=$('supportThreads');area.replaceChildren();const threads=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0));
 for(const item of threads){const b=document.createElement('button');b.type='button';b.className='supportThread';b.textContent=(users.find(u=>u.uid===item.id)?.name||'عميل '+item.id.slice(0,8))+' — '+sanitizeText(item.lastMessage).slice(0,75);b.onclick=()=>openThread(item.id);area.appendChild(b)}
 if(!threads.length)area.textContent='لا توجد محادثات لسه.';show('supportStatus','المحادثات المعروضة: '+threads.length)}
 catch(e){show('supportStatus','تعذر تحميل المحادثات: '+(e.code||e.message))}
}
function openThread(uid){if(stopMessages)stopMessages();activeUid=uid;$('activeSupportTitle').textContent='محادثة '+(users.find(u=>u.uid===uid)?.name||uid.slice(0,10));const ref=fs.query(fs.collection(db,'supportChats',uid,'messages'),fs.orderBy('createdAt','asc'),fs.limit(100));
 stopMessages=fs.onSnapshot(ref,snap=>{const area=$('supportMessages');area.replaceChildren();snap.forEach(d=>{const data=d.data(),p=document.createElement('div');p.className='supportBubble'+(data.senderId===auth.currentUser?.uid?' mine':'');p.textContent=(data.senderId===uid?'العميل: ':'الإدارة: ')+sanitizeText(data.text);area.append(p)});area.scrollTop=area.scrollHeight},e=>show('supportStatus',e.code||e.message))}
$('refreshChats').onclick=loadThreads;
$('supportReply').onsubmit=async e=>{e.preventDefault();if(!authorized||!activeUid)return show('supportStatus','اختار محادثة الأول');const text=$('supportText').value.trim();if(!text||text.length>500)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{await fs.addDoc(fs.collection(db,'supportChats',activeUid,'messages'),{senderId:auth.currentUser.uid,text,createdAt:fs.serverTimestamp()});await fs.updateDoc(fs.doc(db,'supportChats',activeUid),{lastMessage:text,updatedAt:fs.serverTimestamp()});$('supportText').value='';show('supportStatus','✅ تم إرسال الرد')}catch(err){show('supportStatus','تعذر إرسال الرد: '+(err.code||err.message))}finally{btn.disabled=false}};
au.onAuthStateChanged(auth,async u=>{authorized=false;if(stopMessages){stopMessages();stopMessages=null}if(!u)return;try{const token=await u.getIdTokenResult(true);if(token.claims.admin!==true)return;authorized=true;await loadUsers();await loadThreads()}catch(e){console.warn('Admin staff/support init',e)}});
