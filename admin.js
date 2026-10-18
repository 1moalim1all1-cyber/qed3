import {firebaseConfig} from './firebase-config.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=m=>$('status').textContent=m;
if(!firebaseConfig.apiKey||firebaseConfig.apiKey.startsWith('YOUR_')) notice('أضف إعدادات Firebase إلى firebase-config.js أولًا.');
else start();
async function start(){try{
 const am=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),au=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),fs=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
 const app=am.initializeApp(firebaseConfig),auth=au.getAuth(app),db=fs.getFirestore(app);
 $('loginForm').onsubmit=async e=>{e.preventDefault();try{await au.signInWithEmailAndPassword(auth,$('adminEmail').value,$('adminPassword').value)}catch(e){notice('فشل الدخول: '+e.code)}};
 $('logoutBtn').onclick=()=>au.signOut(auth);
 au.onAuthStateChanged(auth,async user=>{
 $('adminPanel').hidden=true;$('loginForm').hidden=false;if(!user){notice('سجّل الدخول بحساب مدير مُعتمد.');return}
 const token=await user.getIdTokenResult(true);if(token.claims.admin!==true){notice('هذا الحساب ليس مديرًا. فعّل admin custom claim بشكل آمن من Firebase Admin SDK.');return}
 $('loginForm').hidden=true;$('adminPanel').hidden=false;notice('مدير مسجل: '+user.email);load();
 });
 const products=fs.collection(db,'products'),prices=fs.collection(db,'wholesalePrices'),orders=fs.collection(db,'orders');
 let latestOrders=[]; $('exportOrders').onclick=()=>{const cols=['رقم الطلب','اسم العميل','الهاتف','المحافظة','العنوان','طريقة البيع','الدفع','الحالة','الإجمالي المؤكد','بوليصة الشحن','الأصناف'];const cell=v=>'"'+String(v??'').replaceAll('\"','\"\"')+'"';const lines=[cols,...latestOrders.map(({id,x})=>[id,x.buyer?.name,x.buyer?.phone,x.buyer?.governorate,x.buyer?.address,x.requestedMode,x.paymentMethod,x.status,x.confirmedTotal,x.trackingNumber,(x.items||[]).map(i=>i.productId+' x '+i.quantity).join(' / ')])];const blob=new Blob(['\ufeff'+lines.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),el=document.createElement('a');el.href=url;el.download='orders.csv';el.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}; async function load(){try{const p=await fs.getDocs(products);$('rows').innerHTML=p.docs.map(d=>{const x=d.data();return `<div><span>${esc(x.name)}<small style="display:block;color:#9fa7ac">${esc(x.brand)} · ${esc(d.id)}</small></span><b>${esc(x.retail)} ج.م</b><button data-id="${esc(d.id)}" class="deleteBtn" type="button">حذف</button></div>`}).join('')||'<p>لا توجد منتجات.</p>';document.querySelectorAll('.deleteBtn').forEach(b=>b.onclick=async()=>{if(!confirm('حذف المنتج؟'))return;await fs.deleteDoc(fs.doc(products,b.dataset.id));await fs.deleteDoc(fs.doc(prices,b.dataset.id));load()});$('statProducts').textContent=p.size;const o=await fs.getDocs(fs.query(orders,fs.limit(100)));latestOrders=o.docs.map(d=>({id:d.id,x:d.data()}));$('statOrders').textContent=latestOrders.length;$('statPending').textContent=latestOrders.filter(r=>r.x.status==='pending_review').length;$('statRevenue').textContent=latestOrders.filter(r=>['confirmed','shipped','delivered'].includes(r.x.status)).reduce((n,r)=>n+(Number(r.x.confirmedTotal)||0),0).toLocaleString('ar-EG')+' ج.م';$('ordersRows').innerHTML=o.docs.map(d=>{const x=d.data(),b=x.buyer||{},itemLines=(x.items||[]).map(i=>`${esc(i.productId)} × ${Number(i.quantity)||0}`).join('، ');return `<div style="display:block"><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between"><span><b>طلب: ${esc(d.id)}</b><small style="display:block">${esc(x.requestedMode)} · ${esc(x.paymentMethod||'غير محدد')} · ${esc(x.status)}</small><small style="display:block">${esc(b.name||'لا يوجد')} — ${esc(b.phone||'')} — ${esc(b.governorate||'')}</small><small style="display:block">${esc(b.address||'')}</small><small style="display:block">الأصناف (المعرّفات والكميات): ${itemLines}</small></span><div><select data-order="${esc(d.id)}"><option ${x.status==='pending_review'?'selected':''} value="pending_review">تحت المراجعة</option><option ${x.status==='confirmed'?'selected':''} value="confirmed">تم التأكيد</option><option ${x.status==='shipped'?'selected':''} value="shipped">تم الشحن</option><option ${x.status==='delivered'?'selected':''} value="delivered">تم التسليم</option><option ${x.status==='cancelled'?'selected':''} value="cancelled">ملغي</option></select><button class="saveOrder" data-id="${esc(d.id)}">حفظ</button></div></div><label>الإجمالي المتفق عليه بعد مراجعة المخزون والشحن (ج.م): <input type="number" min="0" step="0.01" data-total="${esc(d.id)}" value="${x.confirmedTotal??''}" placeholder="لم يتم التسعير"></label><a class="invoiceLink" target="_blank" rel="noopener" href="invoice.html?id=${encodeURIComponent(d.id)}">فتح الفاتورة / PDF / Excel ↗</a><br><label>رقم بوليصة الشحن: <input maxlength="100" data-tracking="${esc(d.id)}" value="${esc(x.trackingNumber||'')}"></label></div>`}).join('')||'<p>لا توجد طلبات.</p>';const filterOrders=()=>{const q=$('adminOrderSearch').value.trim(),s=$('adminOrderStatus').value;document.querySelectorAll('#ordersRows > div').forEach((el,i)=>{const r=latestOrders[i];if(!r)return;el.hidden=!!((s&&r.x.status!==s)||(q&&!((r.id+' '+(r.x.buyer?.phone||'')+' '+(r.x.buyer?.name||'')).includes(q))))})};$('adminOrderSearch').oninput=filterOrders;$('adminOrderStatus').onchange=filterOrders;document.querySelectorAll('.saveOrder').forEach(b=>b.onclick=async()=>{const id=b.dataset.id,v=document.querySelector(`[data-order="${id}"]`).value,t=document.querySelector(`[data-total="${id}"]`).value,tracking=document.querySelector(`[data-tracking="${id}"]`).value.trim();if(['confirmed','shipped','delivered'].includes(v)&&(!t||!Number.isFinite(Number(t))||Number(t)<0))return notice('أدخل الإجمالي المؤكد قبل تأكيد الطلب');try{await fs.updateDoc(fs.doc(orders,id),{status:v,confirmedTotal:t===''?null:Number(t),trackingNumber:tracking,updatedAt:fs.serverTimestamp()});notice('تم حفظ حالة الطلب '+id.slice(0,8));}catch(e){notice('تعذر الحفظ: '+e.code)}});}catch(e){notice('خطأ في تحميل البيانات: '+e.code)}}

 // Cloudinary unsigned uploads: suitable for a limited demo preset; production should sign uploads server-side.
 const cfgName=$('cloudName'),cfgPreset=$('cloudPreset');
 cfgName.value=localStorage.getItem('qed3CloudName')||'xtfe29zu';
 cfgPreset.value=localStorage.getItem('qed3CloudPreset')||'Qed3-web';
 $('cloudSettings').open=false;
 $('saveCloudConfig').onclick=()=>{
   const cloud=cfgName.value.trim(),preset=cfgPreset.value.trim();
   if(!/^[a-zA-Z0-9_-]{2,80}$/.test(cloud)||!/^[a-zA-Z0-9_-]{2,100}$/.test(preset))return notice('اكتب Cloud name وUpload preset صحيحين');
   localStorage.setItem('qed3CloudName',cloud);localStorage.setItem('qed3CloudPreset',preset);
   notice('تم حفظ إعداد Cloudinary في المتصفح');$('cloudSettings').open=false;
 };
 $('pfile').onchange=()=>{
   const file=$('pfile').files[0],preview=$('pimgPreview');
   if(preview.dataset.objectUrl)URL.revokeObjectURL(preview.dataset.objectUrl);
   if(!file){preview.hidden=true;return}
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){$('pfile').value='';preview.hidden=true;notice('مسموح JPG أو PNG أو WebP بحد أقصى 5 ميجابايت');return}
   preview.dataset.objectUrl=URL.createObjectURL(file);preview.src=preview.dataset.objectUrl;preview.hidden=false;
 };
 async function uploadProductPhoto(file){
   const cloud=cfgName.value.trim(),preset=cfgPreset.value.trim();
   if(!/^[a-zA-Z0-9_-]{2,80}$/.test(cloud)||!/^[a-zA-Z0-9_-]{2,100}$/.test(preset))throw Error('اضبط Cloud name وUnsigned upload preset أولاً');
   const form=new FormData();form.append('file',file);form.append('upload_preset',preset);
   const response=await fetch('https://api.cloudinary.com/v1_1/'+encodeURIComponent(cloud)+'/image/upload',{method:'POST',body:form});
   const data=await response.json();
   if(!response.ok||!data.secure_url)throw Error(data.error?.message||'تعذر رفع الصورة إلى Cloudinary');
   return data.secure_url;
 }
 const productStatus=$('productFormStatus'),addButton=$('addProductBtn');
 const productNotice=m=>{productStatus.textContent=m;notice(m)};
 $('pform').addEventListener('invalid',e=>{const el=e.target;productStatus.textContent='راجع الحقل المطلوب: '+(el.placeholder||el.id||'بيانات المنتج')},true);
 $('pform').onsubmit=async e=>{
   e.preventDefault();
   if(addButton.disabled)return;
   const name=$('pname').value.trim(),retail=Number($('pretail').value),wholesale=Number($('pwholesale').value);
   if(!name||retail<0||wholesale<0||!Number.isFinite(retail)||!Number.isFinite(wholesale))return productNotice('اكتب اسم المنتج وأسعار صحيحة');
   if($('pstock').value!==''&&(!Number.isSafeInteger(Number($('pstock').value))||Number($('pstock').value)<0))return productNotice('المخزون لازم يكون رقم صحيح موجب أو صفر');
   addButton.disabled=true;addButton.textContent='جارٍ حفظ المنتج…';
   try{
     let photo=$('pimg').value.trim();const file=$('pfile').files[0];
     if(file){
       if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('الصورة لازم تكون JPG أو PNG أو WebP وأقل من 5 ميجابايت');
       productNotice('جارٍ رفع الصورة إلى Cloudinary…');$('uploadState').textContent='جارٍ رفع الصورة…';
       photo=await uploadProductPhoto(file);
       $('uploadState').textContent='تم رفع الصورة بنجاح';
     }
     if(photo&&!(photo.startsWith('https://')||photo.startsWith('assets/')))throw Error('رابط الصورة لازم يبدأ بـ https://');
     productNotice('تم رفع الصورة. جاري حفظ المنتج في Firebase…');
     const id=fs.doc(products).id,batch=fs.writeBatch(db);
     batch.set(fs.doc(products,id),{name,brand:$('pbrand').value.trim(),retail,sku:$('psku').value.trim(),stock:$('pstock').value===''?null:Number($('pstock').value),description:$('pdesc').value.trim(),img:photo||'assets/prod1.png',createdAt:fs.serverTimestamp()});
     batch.set(fs.doc(prices,id),{price:wholesale});
     await batch.commit();
     $('pform').reset();$('pimgPreview').hidden=true;$('uploadState').textContent='اختار صورة من الكمبيوتر، أو استخدم رابط صورة.';
     productNotice('✅ تمت إضافة المنتج بنجاح، وهتظهر صورته في المتجر');
     setTimeout(()=>{if(productStatus.textContent.startsWith('✅ تمت إضافة'))productStatus.textContent=''},3500);
     await load();
   }catch(err){
     const reason=err?.message||err?.code||'خطأ غير معروف';
     productNotice('❌ فشل إضافة المنتج: '+reason);
     $('uploadState').textContent='لم يتم حفظ المنتج. راجع الخطأ أسفل الزر.';
   }finally{addButton.disabled=false;addButton.textContent='إضافة المنتج'}
 };
 }catch(e){notice('خطأ إعدادات Firebase: '+e.message)}}
