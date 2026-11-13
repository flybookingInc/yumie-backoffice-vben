import type { Recordable } from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { ElNotification } from 'element-plus';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { defineStore } from 'pinia';

import {
  InvalidClaimsError,
  syncFirebaseUserToStores,
} from '#/firebase/auth-sync';
import { isAdminMfaFresh, parseClaims } from '#/firebase/claims';
import {
  completeEmailCodeStep,
  EmailCodeCancelledError,
} from '#/firebase/email-code-step';
import { firebaseAuth } from '#/firebase/init';
import { $t } from '#/locales';

/**
 * Firebase Auth 版的 auth store。
 *
 * `authLogin` 走 signInWithEmailAndPassword + 立即同步 store（不依賴
 * onIdTokenChanged callback，避免 race）。失敗時清空 store + signOut。
 */
export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    if (
      typeof params.username !== 'string' ||
      typeof params.password !== 'string'
    ) {
      throw new TypeError('authLogin requires username + password strings');
    }
    loginLoading.value = true;
    try {
      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        params.username,
        params.password,
      );
      const passwordToken = await cred.user.getIdTokenResult(true);
      // 先確認是後台帳號（不是的話直接 InvalidClaimsError，不寄驗證碼）
      parseClaims(passwordToken.claims);
      // 第二步：這台電腦 30 天內沒有通過 Email 驗證碼 → 寄碼、輸入、換成帶 mfaAt 的登入
      if (!isAdminMfaFresh(passwordToken.claims)) {
        await completeEmailCodeStep(cred.user);
      }
      const user = firebaseAuth.currentUser ?? cred.user;
      await user.getIdToken(true);
      await syncFirebaseUserToStores(user);

      const userInfo = userStore.userInfo;
      if (accessStore.loginExpired) {
        accessStore.setLoginExpired(false);
      } else if (onSuccess) {
        await onSuccess();
      } else {
        await router.push(
          userInfo?.homePath || preferences.app.defaultHomePath,
        );
      }

      if (userInfo?.realName) {
        ElNotification({
          message: `${$t('authentication.loginSuccessDesc')}:${userInfo.realName}`,
          title: $t('authentication.loginSuccess'),
          type: 'success',
        });
      }
      return { userInfo };
    } catch (error) {
      try {
        await syncFirebaseUserToStores(null);
      } catch {
        // swallow
      }
      try {
        await firebaseAuth.signOut();
      } catch {
        // swallow
      }
      if (error instanceof EmailCodeCancelledError) {
        ElNotification({
          message: '已取消 Email 驗證碼，請重新登入',
          title: '登入取消',
          type: 'info',
        });
      } else if (error instanceof InvalidClaimsError) {
        ElNotification({
          message: '此帳號未設定正確的角色或飯店權限，請聯絡管理員',
          title: '登入失敗',
          type: 'error',
        });
      } else {
        ElNotification({
          message: (error as Error).message,
          title: '登入失敗',
          type: 'error',
        });
      }
      throw error;
    } finally {
      loginLoading.value = false;
    }
  }

  async function logout(redirect: boolean = true): Promise<void> {
    try {
      await firebaseAuth.signOut();
    } catch {
      // swallow — even if signOut fails, clear local state
    }
    await syncFirebaseUserToStores(null);
    resetAllStores();
    accessStore.setLoginExpired(false);

    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? { redirect: encodeURIComponent(router.currentRoute.value.fullPath) }
        : {},
    });
  }

  async function fetchUserInfo(): Promise<
    ReturnType<typeof useUserStore>['userInfo']
  > {
    // Firebase 版：user info 由 onIdTokenChanged / authLogin 同步進 store；
    // 這裡只回 store 當前內容。
    return userStore.userInfo;
  }

  function $reset(): void {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
