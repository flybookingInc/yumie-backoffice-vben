/**
 * Firebase 入口 — 從 import.meta.env 讀 config，回傳已初始化的 app / auth / firestore / appCheck。
 *
 * 開發環境（VITE_FIREBASE_PROJECT_ID=yumie-test）：
 *   AppCheck 預設關閉 (VITE_USE_APPCHECK=false)
 * 生產環境（VITE_FIREBASE_PROJECT_ID=yumie-8e60e）：
 *   AppCheck 開啟，需 reCAPTCHA v3 site key
 */
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import type { AppCheck } from 'firebase/app-check';

export const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
});

export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

let appCheckInstance: AppCheck | null = null;
if (import.meta.env.VITE_USE_APPCHECK === 'true') {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    console.warn('AppCheck enabled but VITE_RECAPTCHA_SITE_KEY is empty');
  } else {
    appCheckInstance = initializeAppCheck(firebaseApp, {
      isTokenAutoRefreshEnabled: true,
      provider: new ReCaptchaV3Provider(siteKey),
    });
  }
}
export const appCheck = appCheckInstance;
