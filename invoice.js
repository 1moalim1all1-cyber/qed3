import {firebaseConfig} from './firebase-config.js';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const id=new URLSearchParams(location.search).get('id');let item;
const msg=m=>$('message').textContent=m;
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
function saveCsv(){if(!item)return;const {x,products}=item;const rows=[['رقم الطلب','العميل','هاتف','الصنف','رقم القطعة','الكمية','الإجمالي المؤكد','حالة الطلب'],...(x.items||[]).map(i=>[id,x.buyer?.name,x.buyer?.phone,products[i.productId]?.name||i.productId,i.productId,i.quantity,x.confirmedTotal,x.status])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='QED3-'+id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('pdfBtn').onclick=()=>window.print();$('csvBtn').onclick=saveCsv;
if(!id||!/^[\w-]{8,150}$/.test(id))msg('رابط الطلب غير صحيح.');
else start();
async function start(){try{
const am=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),au=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),fs=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
const a=am.initializeApp(firebaseConfig),auth=au.getAuth(a),db=fs.getFirestore(a);
au.onAuthStateChanged(auth,async u=>{if(!u){msg('سجّل دخولك كمدير من لوحة الإدارة أولًا.');return}const token=await u.getIdTokenResult(true);if(token.claims.admin!==true){msg('ليس لديك صلاحية الاطلاع على الفاتورة.');return}
try{const doc=await fs.getDoc(fs.doc(db,'orders',id));if(!doc.exists()){msg('الطلب غير موجود.');return}const x=doc.data(),products={};for(const i of x.items||[]){if(!products[i.productId]){const p=await fs.getDoc(fs.doc(db,'products',i.productId));products[i.productId]=p.exists()?p.data():{name:i.productId}}}item={x,products};
$('number').textContent='رقم الطلب: '+id;$('date').textContent=x.createdAt?.toDate?.().toLocaleDateString('ar-EG')||'بدون تاريخ';
$('buyer').textContent=[x.buyer?.name,x.buyer?.phone,x.buyer?.governorate,x.buyer?.address].filter(Boolean).join(' — ');
$('orderInfo').textContent=[x.requestedMode==='wholesale'?'جملة':'قطاعي','الدفع عند الاستلام',x.status,x.trackingNumber&&'شحنة: '+x.trackingNumber].filter(Boolean).join(' — ');
$('lines').innerHTML=(x.items||[]).map(i=>'<tr><td>'+esc(products[i.productId]?.name||i.productId)+'</td><td>'+Number(i.quantity||0)+'</td></tr>').join('');
$('total').textContent=x.confirmedTotal!=null?'الإجمالي المؤكد: '+Number(x.confirmedTotal).toLocaleString('ar-EG')+' ج.م':'الإجمالي: لم يتم تأكيده بعد';
$('invoice').hidden=false;$('message').hidden=true;$('pdfBtn').disabled=false;$('csvBtn').disabled=false
}catch(e){msg('تعذر تحميل الطلب: '+(e.code||'خطأ اتصال'))}});
}catch(e){msg('تعذر الاتصال بـ Firebase: '+e.message)}}
