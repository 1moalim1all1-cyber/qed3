const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
initializeApp();
const allowed=new Set(['catalog_manager','order_manager','support_agent','none']);
exports.setStaffRole=onCall({region:'us-central1',enforceAppCheck:false,maxInstances:3},async request=>{
 if(!request.auth||request.auth.token.admin!==true)throw new HttpsError('permission-denied','صلاحيات المدير العام فقط');
 const uid=request.data?.uid,role=request.data?.role;
 if(typeof uid!=='string'||uid.length<15||uid.length>160||!allowed.has(role))throw new HttpsError('invalid-argument','بيانات الحساب أو الدور غير صحيحة');
 if(uid===request.auth.uid)throw new HttpsError('failed-precondition','لا يمكنك تعديل صلاحية حسابك');
 const auth=getAuth();let target;
 try{target=await auth.getUser(uid)}catch{throw new HttpsError('not-found','المستخدم غير موجود')}
 if(target.customClaims?.admin===true)throw new HttpsError('failed-precondition','لا يمكن تعديل حساب مدير عام من هنا');
 const claims={...(target.customClaims||{})};if(role==='none')delete claims.role;else claims.role=role;
 await auth.setCustomUserClaims(uid,claims);
 return {uid,role,email:target.email||null,message:'تم حفظ الدور. اطلب من الموظف تسجيل الخروج والدخول مرة ثانية'};
});

const {defineSecret}=require('firebase-functions/params');
const openaiKey=defineSecret('OPENAI_API_KEY');
exports.askQed3AI=onCall({region:'us-central1',secrets:[openaiKey],maxInstances:3,timeoutSeconds:30},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','سجّل الدخول لاستخدام المساعد الذكي');
 const question=request.data?.question;
 if(typeof question!=='string'||question.trim().length<2||question.length>500)throw new HttpsError('invalid-argument','السؤال لازم يكون من 2 إلى 500 حرف');
 const key=openaiKey.value();
 if(!key)throw new HttpsError('failed-precondition','المساعد الذكي غير مفعّل من الإدارة');
 try{
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'gpt-4.1-mini',max_output_tokens:250,instructions:'أنت مساعد متجر Qed3 لقطع غيار السيارات في مصر. رد باللهجة المصرية باختصار. ساعد في تحديد فئة القطعة والتوافق العام وخطوات الطلب. لا تخترع أسعارًا أو مخزونًا أو وعود شحن، ولا تطلب بيانات حساسة. إذا كان توافق قطعة مع موديل سيارة غير مؤكد اطلب سنة الصنع ورقم القطعة وأكد أن المتجر سيراجع قبل الشراء.',input:question.trim()})});
  if(!response.ok)throw Error('AI provider '+response.status);
  const json=await response.json();const answer=(json.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();
  if(!answer)throw Error('Empty AI response');
  return {answer:answer.slice(0,2000)};
 }catch(e){console.error('Qed3 AI error',e.message);throw new HttpsError('unavailable','المساعد غير متاح حاليًا، جرّب لاحقًا')}
});
