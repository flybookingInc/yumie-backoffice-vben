/**
 * Firebase Auth ↔ vben store 同步層。
 *
 * 兩個入口：
 *   - `setupAuthListener()`：bootstrap 時呼叫一次，掛上 onIdTokenChanged。
 *   - `authReady`: Promise，resolves 完第一次 onIdTokenChanged 回呼後（不論 user 有無）。
 *     router guard / request interceptor / login 流程 **都 await 這個** 以避免 race。
 *
 * `syncFirebaseUserToStores(user)` 是同步 store 的純函式，login 流程也直接呼叫
 * （**不**依賴 callback — callback 是 async 且不保證在 router.push 之前完成）。
 *
 * Claims 嚴格驗證 → 缺欄位拋 `InvalidClaimsError`，半殘登入不會通過。
 */
import type { User } from 'firebase/auth';

import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { onIdTokenChanged } from 'firebase/auth';

import { useHotelStore } from '#/store/hotel';

import {
  AdminMfaRequiredError,
  InvalidClaimsError,
  isAdminMfaFresh,
  parseClaims,
} from './claims';
import { firebaseAuth } from './init';

export { AdminMfaRequiredError, InvalidClaimsError };

const ADMIN_HOME = '/orders/occupy';

export async function syncFirebaseUserToStores(
  user: null | User,
): Promise<void> {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const hotelStore = useHotelStore();

  if (user) {
    const tokenResult = await user.getIdTokenResult();
    const claims = parseClaims(tokenResult.claims);
    // 只用密碼登入（或驗證超過 30 天）的 token 不算登入完成：後端 API 與 Firestore rules 都會擋
    if (!isAdminMfaFresh(tokenResult.claims)) {
      throw new AdminMfaRequiredError();
    }

    accessStore.setAccessToken(tokenResult.token);
    accessStore.setAccessCodes([claims.rule]);
    userStore.setUserInfo({
      avatar: user.photoURL ?? preferences.app.defaultAvatar,
      desc: '',
      homePath: ADMIN_HOME,
      realName: user.displayName ?? user.email ?? '',
      roles: [claims.rule],
      token: tokenResult.token,
      userId: user.uid,
      username: user.email ?? user.uid,
    });
    hotelStore.setHotelGroup(claims.hotelGroup);
  } else {
    accessStore.setAccessToken(null);
    accessStore.setAccessCodes([]);
    accessStore.setAccessMenus([]);
    accessStore.setAccessRoutes([]);
    accessStore.setIsAccessChecked(false);
    userStore.setUserInfo(null);
    hotelStore.$reset();
  }
}

let resolveReady: () => void = () => {
  // overwritten when authReady Promise is constructed below
};
export const authReady = new Promise<void>((r) => {
  resolveReady = r;
});

let initialized = false;
export function setupAuthListener(): void {
  if (initialized) return;
  initialized = true;
  onIdTokenChanged(firebaseAuth, async (user) => {
    try {
      await syncFirebaseUserToStores(user);
    } catch (error) {
      if (error instanceof AdminMfaRequiredError) {
        // 密碼正確但還沒輸入 Email 驗證碼：清空畫面狀態，但不登出
        // （登入流程正在等使用者輸入驗證碼；30 天到期時會回登入頁重新驗證）
        await syncFirebaseUserToStores(null);
        return;
      }
      console.error('syncFirebaseUserToStores failed:', error);
      try {
        await syncFirebaseUserToStores(null);
        await firebaseAuth.signOut();
      } catch {
        // swallow
      }
    } finally {
      resolveReady();
    }
  });
}
