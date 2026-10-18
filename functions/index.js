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
