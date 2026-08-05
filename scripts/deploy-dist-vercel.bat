@echo off
REM ================================================================
REM  deploy-dist-vercel.bat — Boutikplus
REM  Déploie le dossier dist/ (incluant dist\download\*.apk 78MB)
REM  VERS PRODUCTION Vercel, SANS passer par un rebuild cloud
REM  (qui écraserait l'APK mise à jour localement).
REM
REM  Pourquoi ce script ?
REM  - root .gitignore ignore "dist/" donc Vercel CLI depuis racine
REM    n'uploade JAMAIS l'APK local ni les fichiers modifiés dans dist.
REM  - Le buildCommand vercel.json = "expo export..." recrée dist FROM
REM    SCRATCH dans le cloud -> perte systématique de l'APK.
REM  - Solution : on CD dans dist/ PUIS on lance vercel --prod.
REM    Vu depuis dist/, le root .gitignore n'applique pas "dist/".
REM
REM  Usage : double-clic, ou en PS : .\scripts\deploy-dist-vercel.bat
REM  Durée : ~1-2 min (upload APK 78MB + déploiement)
REM ================================================================
setlocal
cd /d "%~dp0\.."

echo.
echo ===========================================================
echo   DEPLOIEMENT DIST ENTIER (avec APK) SUR VERCEL — PROD
echo ===========================================================
echo.

if not exist "dist\index.html" (
  echo ERREUR: dossier dist\ vide. Executez d'abord :
  echo   npx expo export --platform web --output-dir dist
  exit /b 1
)
if not exist "dist\download\Boutikplus+.apk" (
  echo ATTENTION: dist\download\Boutikplus+.apk absent.
  echo   (Le build web va etre deploye SANS APK de telechargement.)
  echo   Continuez ? Ctrl+C pour annuler, Entree pour continuer.
  pause
)

cd dist
echo --- Contenu de dist\ deploye ---
dir
echo.
echo --- Lancement Vercel Production ---
call npx --yes vercel --prod --yes
set EXIT=%ERRORLEVEL%

echo.
if %EXIT% EQU 0 (
  echo =========================================================
  echo   DEPLOIEMENT REUSSI !
  echo   URL : https://boutikplus.vercel.app
  echo   APK verifier par :
  echo     Invoke-WebRequest -Uri "https://boutikplus.vercel.app/download/Boutikplus+.apk" -Method Head
  echo =========================================================
) else (
  echo ECHEC deploiement. Code sortie : %EXIT%
)
cd ..
endlocal
exit /b %EXIT%
