@echo off
REM ============================================================
REM Boutikplus — Lancer EAS Build Android APK (preview)
REM   → Double-cliquez ou exécutez dans PowerShell/CMD
REM   → Une fenêtre navigateur s'ouvre pour se connecter à Expo.
REM ============================================================
chcp 65001 >nul
cd /d "%~dp0.."

echo.
echo ════════════════════════════════════════════════════════════
echo  BOUTIKPLUS — EAS BUILD ANDROID (PREVIEW APK)
echo ════════════════════════════════════════════════════════════
echo.
echo COMPTE EXPÉDITEUR ATTENDU : owner=chriss1137s-team
echo PROJET                  : Boutikplus (package=com.boutikplus.app)
echo PROFIL DEMANDÉ          : preview → APK interne signée
echo DURÉE ESTIMÉE           : ~12 minutes
echo.

REM 1. Login (ouvre navigateur pour OAuth)
echo [1/3] Connexion à Expo...
call npx --no-install eas login
if errorlevel 1 (
    echo.
    echo ❌ Connexion échouée. Connectez-vous manuellement : eas login
    echo Puis relancez : eas build -p android --profile preview
    pause
    exit /b 1
)
echo ✅ Connecté.
echo.

REM 2. Vérifier whoami
echo [2/3] Vérification compte...
call npx --no-install eas whoami
echo.

REM 3. Lancer le build cloud
echo [3/3] Lancement build cloud Android preview...
echo     (Restez connecté pour voir l'URL de suivi du build)
echo.
call npx --no-install eas build -p android --profile preview

echo.
echo ════════════════════════════════════════════════════════════
echo BUILD TERMINÉ — Téléchargez l'APK :
echo   • eas build:list --platform android --status finished
echo   • eas build:view ^<BUILD-UUID^>
echo   • Ou via dashboard : https://expo.dev/accounts/chriss1137s-team/projects/boutikplus
echo ════════════════════════════════════════════════════════════
pause
