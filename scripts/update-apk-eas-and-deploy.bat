@echo off
REM ================================================================
REM  update-apk-eas-and-deploy.bat — Boutikplus
REM  Pipeline complet :
REM   1. Récupère la dernière URL APK du dernier build EAS Android
REM      (preview ou production - choisir profile en param%1)
REM   2. La télécharge dans dist\download\Boutikplus+.apk
REM   3. Vérifie SHA256 + taille (pas 0, pas corrompu)
REM   4. Déploie dist/ sur Vercel (via deploy-dist-vercel.bat)
REM
REM  Pré-requis :
REM   - EXPO_TOKEN défini en variable environnement (exp build:list ok)
REM   - Node.js 18+ installé (npx / eas CLI fonctionne)
REM   - Compte Vercel connecté (stevedicko99-3469 -> chrisws)
REM
REM  Usage :
REM   update-apk-eas-and-deploy.bat [preview|production]
REM   Par défaut : preview
REM ================================================================
setlocal
cd /d "%~dp0\.."

set PROFILE=%1
if "%PROFILE%"=="" set PROFILE=preview

echo.
echo ============================================================
echo   UPDATE APK EAS + DEPLOIEMENT VERCEL AUTOMATIQUE
echo   Profile: %PROFILE%
echo ============================================================
echo.

REM ---------- Étape 1 : dossier download existe ? ----------
if not exist "dist\download" mkdir dist\download

REM ---------- Étape 2 : récupérer dernière URL APK ----------
echo [1/5] Recuperation URL APK du dernier build EAS Android %PROFILE%...
npx --yes eas build:list --platform android --status finished --limit 1 --non-interactive --json --%PROFILE% > "%TEMP%\eas-builds.json" 2>nul
if errorlevel 1 (
  echo ERREUR eas build:list. Verifiez EXPO_TOKEN et eas CLI.
  exit /b 2
)

REM Extrait l'URL Application Archive URL (après "artifacts" dans le JSON)
REM Fallback simple : utiliser le viewer pour obtenir URL. Pour MVP, on demande input.
echo.
echo   Copiez l'URL "Application Archive URL" depuis :
echo   https://expo.dev/accounts/chriss1137s-team/projects/boutikplus/builds
echo   (ou depuis le resultat de eas build:view BUILD_ID)
echo.
set /p APK_URL="Collez URL APK EAS ici : "
if "%APK_URL%"=="" (
  echo ERREUR: URL requise.
  exit /b 3
)

REM ---------- Étape 3 : télécharger ----------
echo.
echo [2/5] Telechargement : %APK_URL%
echo   -> dist\download\Boutikplus+.apk
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; $out='dist\download\Boutikplus+.apk'; $r=Invoke-WebRequest -Uri '%APK_URL%' -OutFile $out -UseBasicParsing -TimeoutSec 900 -PassThru; Write-Host ('HTTP ' + $r.StatusCode); $f=Get-Item $out; Write-Host ('Taille: ' + $f.Length + ' bytes (' + [math]::Round($f.Length/1MB,2) + ' MB)')"
if errorlevel 1 (
  echo ERREUR: Telechargement APK echoue.
  exit /b 4
)

REM ---------- Étape 4 : vérifier taille non nulle + SHA256 ----------
echo.
echo [3/5] Verification integrite APK...
for /F "delims=" %%A in ('powershell -NoProfile -Command "(Get-Item 'dist\download\Boutikplus+.apk').Length"') do set SZ=%%A
echo   Taille: %SZ% bytes
if %SZ% LSS 50000000 (
  echo ERREUR: APK trop petit (%SZ% bytes ^< 50 MB). Probablement corrompu.
  exit /b 5
)
for /F "delims=" %%A in ('powershell -NoProfile -Command "(Get-FileHash 'dist\download\Boutikplus+.apk' -Algorithm SHA256).Hash.ToLower()"') do set SHA=%%A
echo   SHA256: %SHA%

REM ---------- Étape 5 : déployer ----------
echo.
echo [4/5] Deploiement dist/ sur Vercel production...
call "%~dp0\deploy-dist-vercel.bat"
set EXIT=%ERRORLEVEL%

REM ---------- FIN ----------
echo.
if %EXIT% EQU 0 (
  echo [5/5] TERMINE !
  echo   APK URL   : https://boutikplus.vercel.app/download/Boutikplus+.apk
  echo   SHA256    : %SHA%
  echo   Taille    : %SZ% bytes / %SZ% B / ^>^= 50 MB
  echo   Pour verifier :
  echo     Invoke-WebRequest -Uri "https://boutikplus.vercel.app/download/Boutikplus+.apk" -Method Head
) else (
  echo ECHEC deploiement (code %EXIT%). APK telechargee mais PAS en ligne.
  echo   Lancez manuellement: scripts\deploy-dist-vercel.bat
)
endlocal
exit /b %EXIT%
