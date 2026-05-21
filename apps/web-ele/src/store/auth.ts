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
      await cred.user.getIdToken(true);
      await syncFirebaseUserToStores(cred.user);

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
      if (error instanceof InvalidClaimsError) {
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
