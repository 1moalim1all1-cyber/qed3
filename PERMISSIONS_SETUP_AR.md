# Qed3 — صلاحيات الموظفين
الملف `firestore.rules` بيدعم الأدوار التالية:
- `admin` (custom claim admin=true): المدير العام.
- `catalog_manager`: تعديل المنتجات وأسعار الجملة.
- `order_manager`: قراءة الطلبات وتعديلها دون حذفها.
- `support_agent`: قراءة الطلبات للمتابعة فقط.

**مهم:** رفع الملفات إلى GitHub لا ينشر Firestore Rules تلقائيًا. لازم مسؤول المشروع بعد مراجعة القواعد ينفذ نشر `firebase deploy --only firestore:rules --project qed3-2a2d8` من بيئة مسجّلة دخوله، ويختبر القواعد في Emulator قبل تفعيل موظفين حقيقيين.

## تعيين دور
من جهاز مسؤول موثوق فقط، بعد إعداد Firebase Admin SDK واعتماد هوية خدمة مناسبة:
```bash
npm install firebase-admin
node scripts/set-role.mjs FIREBASE_AUTH_UID catalog_manager
```
تقدر تستخدم `order_manager` أو `support_agent` أو `none` لإزالة الدور. ممنوع نشر ملفات Service Account على GitHub، وممنوع تشغيل سكربت الصلاحيات من المتصفح.

**حالة الواجهة:** لوحة `admin.html` الحالية ما زالت مخصصة للمدير العام فقط؛ تم تجهيز طبقة قواعد الموظفين، لكن يلزم واجهات مستقلة لكل دور قبل منحهم وصول تشغيلي.

تحذير: قواعد `orders` الحالية لا تفحص كل عناصر الطلب أو الأسعار على الخادم؛ يجب معالجة ذلك قبل استخدام الموقع في مبيعات مدفوعة أو منح الموظفين صلاحيات فعلية.
