// Use ONLY on a trusted administrator machine, never in browser code.
// npm install firebase-admin
// Authenticate with GOOGLE_APPLICATION_CREDENTIALS to a private service account JSON
// or with gcloud application-default login for the intended Firebase project.
import admin from 'firebase-admin';
const [uid, role] = process.argv.slice(2);
const allowed = new Set(['catalog_manager','order_manager','support_agent','none']);
if (!uid || !allowed.has(role)) {
 console.error('Usage: node scripts/set-role.mjs <firebase-auth-uid> <catalog_manager|order_manager|support_agent|none>');
 process.exit(1);
}
admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:'qed3-2a2d8'});
const user = await admin.auth().getUser(uid);
if (user.customClaims?.admin === true) {
 console.error('Cannot change the owner/admin account with this role helper.');
 process.exit(1);
}
const claims = {...(user.customClaims || {})};
if (role === 'none') delete claims.role; else claims.role = role;
await admin.auth().setCustomUserClaims(uid, claims);
console.log('Role updated for UID:',uid,'=>',role,'; user must refresh their sign-in token.');
