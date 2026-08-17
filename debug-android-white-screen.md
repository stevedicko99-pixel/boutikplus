# [OPEN] Debug Session: android-white-screen

## Description du bug
APK installée sur appareil Android physique → splash orange s'affiche puis **page blanche infinie**.
Aucun rendu React. L'app ne plante pas (reste en avant-plan, écran blanc vierge).

## Environnement
- Appareil : Téléphone Android physique (USB Debug activé)
- Build : EAS preview APK (v1.3.2, commit 22d7653 / 184f1d4)
- SDK : Expo 52.0.0, RN 0.76.x
- Corrections précédentes déjà incluses : gesture-handler / enableScreens / SecureStore fallback

## Statut actuel
- Étape 1: Observe & Hypothesize → EN COURS
- USB connecté → logcat peut être tiré immédiatement

## Hypothèses (falsifiables)
1. **H1 Splash hide timing** : SplashScreen (expo-splash) n'est jamais masqué car React Native n'a jamais fini le premier frame JS (le JS bundle a throw pendant require).
2. **H2 Bundle require error top-level** : Un module importé par App.tsx / RootNavigator throw PENDANT l'évaluation du bundle (avant ErrorBoundary). Le bridge JS n'appelle même pas `renderApplication`.
3. **H3 expo-secure-store / AsyncStorage require crash** : Même avec fallback lazy, le require de `@react-native-async-storage/async-storage` lui-même peut throw (souvent Xiaomi/Android Go si module autolinké incorrectement).
4. **H4 expo-file-system / expo-av native crash** : expo-av (playback video/audio) et expo-file-system utilisent des modules natifs lourds. S'ils throw au `require()` top-level dans mediaUpload.ts (importé par ChatScreen → AppNavigator), tout crash.
5. **H5 variables d'env EXPO_PUBLIC_ non injectées dans APK** : build.preview.env est mal propagé à l'APK, donc `supabaseUrl === ''` → `createClient` avec placeholder mais supabase.ts importe `secureStoreAdapter` qui throw.

## Prochaines étapes
1. Télécharger `adb logcat *:E ReactNative:V ReactNativeJS:V AndroidRuntime:E BTIK:V` depuis l'APK installée.
2. Identifier exactement quelle erreur throw dans `AndroidRuntime` / `ReactNative`.
3. Instrumenter App.tsx + supabase.ts + AppEntry simulé avec progress beacons.
4. Build APK instrumenté.
5. Lire logs → valider/rejeter H1-H5.
6. Appliquer fix minimal.
