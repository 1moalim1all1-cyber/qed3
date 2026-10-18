import {firebaseConfig} from './firebase-config.js';
const am=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
const fs=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
const app=am.getApps().length?am.getApp():am.initializeApp(firebaseConfig);
const db=fs.getFirestore(app);
let settings={};
const ref=fs.doc(db,'siteSettings','public');
function apply(){document.querySelectorAll('[data-site-edit]').forEach(el=>{const key=el.dataset.siteEdit,val=settings[key];if(typeof val!=='string')return;if(el.tagName==='IMG'){if(/^https:\/\/|^assets\//.test(val))el.src=val}else el.textContent=val});let link=document.getElementById('qed3WhatsApp');if(!link){link=document.createElement('a');link.id='qed3WhatsApp';link.className='qed3-whatsapp';link.target='_blank';link.rel='noopener noreferrer';link.textContent='☎ واتساب';link.setAttribute('aria-label','مراسلة المتجر على واتساب');document.body.appendChild(link)}const phone=String(settings.whatsapp||'').replace(/\D/g,'');link.hidden=!/^[1-9]\d{9,14}$/.test(phone);if(!link.hidden)link.href='https://wa.me/'+phone+'?text='+encodeURIComponent('أهلاً، محتاج استفسر عن قطعة غيار من Qed3')}
try{const snap=await fs.getDoc(ref);if(snap.exists()){settings=snap.data();apply()}}catch(e){console.warn('Site settings are not available',e)}
// Edit mode is limited to a verified admin account, not a query flag alone.
if(new URLSearchParams(location.search).get('edit')==='1'){
 const au=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');const auth=au.getAuth(app);
 au.onAuthStateChanged(auth,async user=>{if(!user)return;const token=await user.getIdTokenResult(true);if(token.claims.admin!==true)return;const banner=document.createElement('div');banner.className='qed3-edit-banner';banner.textContent='وضع تعديل الموقع: اضغط على أي عنوان أو وصف أو صورة مميزة بعلامة التعديل';document.body.appendChild(banner);
 document.querySelectorAll('[data-site-edit]').forEach(el=>{el.classList.add('qed3-editable');el.title='اضغط لتعديل المحتوى';el.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();const key=el.dataset.siteEdit,old=settings[key]??(el.tagName==='IMG'?el.getAttribute('src'):el.textContent.trim());const next=prompt(el.tagName==='IMG'?'اكتب رابط الصورة الجديد (https:// أو assets/)':'اكتب النص الجديد',old);if(next===null||next.trim()===old)return;const clean=next.trim();if(!clean||clean.length>2000||(el.tagName==='IMG'&&!/^https:\/\/|^assets\//.test(clean)))return alert('القيمة غير صحيحة');try{await fs.setDoc(ref,{[key]:clean},{merge:true});settings[key]=clean;apply();alert('تم حفظ التعديل')}catch(e){alert('تعذر الحفظ: '+(e.code||e.message))}},true)})});
 });
}
