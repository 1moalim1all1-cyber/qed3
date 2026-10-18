@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Install Node.js LTS from https://nodejs.org/ first.
 pause
 exit /b 1
)
echo Logging in to Firebase CLI...
call npx --yes firebase-tools login
if errorlevel 1 goto fail
echo Deploying hosting and secure Firestore rules to qed3-2a2d8...
call npx --yes firebase-tools deploy --only hosting,firestore --project qed3-2a2d8
if errorlevel 1 goto fail
echo Deployment completed. PLEASE DO NOT ACCEPT REAL SALES UNTIL AUTH AND ADMIN SETUP ARE VERIFIED.
pause
exit /b 0
:fail
echo Deployment failed; check the Firebase CLI error above.
pause
exit /b 1
