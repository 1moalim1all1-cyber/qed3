import {firebaseConfig} from './firebase-config.js';
const am=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
const fs=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
const app=am.getApps().length?am.getApp():am.initializeApp(firebaseConfig);
const db=fs.getFirestore(app);
// Stable per-page keys for visible editorial content; product listings/forms are excluded.
const page=location.pathname.split('/').pop()?.replace('.html','')||'index';
document.querySelectorAll('main h1, main h2, main h3, main p, main img, footer p').forEach((el,index)=>{
 if(el.closest('form, .productCard, .cartItems, .accountCard, .modal, .checkoutForm')||el.hasAttribute('data-site-edit'))return;
 el.dataset.siteEdit=page+'.content.'+index;
});
let settings={};
const brand=document.querySelector('.brand b');if(brand)brand.dataset.siteEdit='storeTitle';
const ref=fs.doc(db,'siteSettings','public');
function apply(){if(typeof settings.storeTitle==='string'&&settings.storeTitle.trim()){document.title=settings.storeTitle+' | Qed3';if(brand)brand.textContent=settings.storeTitle}document.querySelectorAll('[data-site-edit]').forEach(el=>{const key=el.dataset.siteEdit,val=settings[key];if(typeof val!=='string')return;if(el.tagName==='IMG'){if(/^https:\/\/|^assets\//.test(val))el.src=val}else el.textContent=val});let address=document.getElementById('qed3StoreAddress');if(!address){address=document.createElement('div');address.id='qed3StoreAddress';address.className='qed3-address';document.querySelector('footer')?.prepend(address)}if(address){address.replaceChildren();if(settings.storeAddress){const label=document.createElement('span');label.textContent='📍 '+settings.storeAddress;address.appendChild(label)}if(Number.isFinite(settings.storeLat)&&Number.isFinite(settings.storeLng)){const map=document.createElement('a');map.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(settings.storeLat+','+settings.storeLng);map.target='_blank';map.rel='noopener noreferrer';map.textContent=' الاتجاهات على الخريطة ↗';address.appendChild(map)}}}
apply();try{const snap=await fs.getDoc(ref);if(snap.exists()){settings=snap.data();apply()}}catch(e){console.warn('Site settings are not available',e)}
// Edit mode is limited to a verified admin account, not a query flag alone.
if(new URLSearchParams(location.search).get('edit')==='1'){
 const au=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');const auth=au.getAuth(app);
 au.onAuthStateChanged(auth,async user=>{if(!user)return;const token=await user.getIdTokenResult(true);if(token.claims.admin!==true)return;const banner=document.createElement('div');banner.className='qed3-edit-banner';banner.textContent='وضع تعديل الموقع: اضغط على أي عنوان أو وصف أو صورة مميزة بعلامة التعديل';document.body.appendChild(banner);
 document.querySelectorAll('[data-site-edit]').forEach(el=>{el.classList.add('qed3-editable');el.title='اضغط لتعديل المحتوى';el.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();const key=el.dataset.siteEdit,old=settings[key]??(el.tagName==='IMG'?el.getAttribute('src'):el.textContent.trim());const next=prompt(el.tagName==='IMG'?'اكتب رابط الصورة الجديد (https:// أو assets/)':'اكتب النص الجديد',old);if(next===null||next.trim()===old)return;const clean=next.trim();if(!clean||clean.length>2000||(el.tagName==='IMG'&&!/^https:\/\/|^assets\//.test(clean)))return alert('القيمة غير صحيحة');try{await fs.setDoc(ref,{[key]:clean},{merge:true});settings[key]=clean;apply();alert('تم حفظ التعديل')}catch(e){alert('تعذر الحفظ: '+(e.code||e.message))}},true)})});
 });
}
