/**
 * 登入第二步：輸入 Email 驗證碼。
 *
 * 密碼正確、但這台電腦 30 天內沒有通過驗證時呼叫：寄碼 → 跳出輸入框 → 驗證成功後
 * signInWithCustomToken（新的 token 帶 mfaAt）。按「重新寄送」會再寄一封；關閉視窗＝取消登入。
 * 館後台帳號是櫃台共用，每台電腦各自驗證一次。
 */
import type { User } from 'firebase/auth';

import { ElMessage, ElMessageBox } from 'element-plus';
import { signInWithCustomToken } from 'firebase/auth';

import {
  AdminCodeError,
  requestAdminEmailCode,
  verifyAdminEmailCode,
} from './admin-mfa';
import { firebaseAuth } from './init';

export class EmailCodeCancelledError extends Error {
  constructor() {
    super('已取消登入');
    this.name = 'EmailCodeCancelledError';
  }
}

/** 需要重新寄碼才能繼續的失敗原因 */
const NEEDS_NEW_CODE = new Set([
  'expired',
  'no_code',
  'too_many_attempts',
  'used',
]);

async function sendCode(user: User): Promise<string> {
  try {
    const { sentTo } = await requestAdminEmailCode(user);
    return `驗證碼已寄到 ${sentTo}，10 分鐘內有效。驗證後，這台電腦 30 天內不用再輸入。`;
  } catch (error) {
    if (error instanceof AdminCodeError && error.reason === 'too_frequent') {
      // 60 秒內剛寄過（例如重新登入），沿用剛剛那封
      return `剛剛已寄出驗證碼，請查看信箱。${error.message}`;
    }
    throw error;
  }
}

export async function completeEmailCodeStep(user: User): Promise<void> {
  let message = await sendCode(user);
  for (;;) {
    let code: string;
    try {
      const result = await ElMessageBox.prompt(message, '輸入 Email 驗證碼', {
        cancelButtonText: '重新寄送',
        closeOnClickModal: false,
        confirmButtonText: '確認',
        distinguishCancelAndClose: true,
        inputErrorMessage: '請輸入 6 位數驗證碼',
        inputPattern: /^\s*\d{6}\s*$/,
        inputPlaceholder: '6 位數驗證碼',
      });
      code = String(result.value).trim();
    } catch (error) {
      if (error === 'cancel') {
        try {
          message = await sendCode(user);
        } catch (error) {
          message = (error as Error).message;
        }
        continue;
      }
      throw new EmailCodeCancelledError();
    }

    try {
      const { customToken } = await verifyAdminEmailCode(user, code);
      await signInWithCustomToken(firebaseAuth, customToken);
      return;
    } catch (error) {
      const reason = error instanceof AdminCodeError ? error.reason : undefined;
      ElMessage.error((error as Error).message);
      message =
        reason && NEEDS_NEW_CODE.has(reason)
          ? `${(error as Error).message}，請按「重新寄送」。`
          : `${(error as Error).message}，請再輸入一次。`;
    }
  }
}
