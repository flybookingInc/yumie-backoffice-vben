import { beforeEach, describe, expect, it, vi } from 'vitest';

// 後台 Email 驗證碼：
// - isAdminMfaFresh：只有 30 天內的 mfaAt 算數
// - completeEmailCodeStep：寄碼 → 輸入 → 驗證 → signInWithCustomToken；錯碼可重輸、可重寄、關閉＝取消

const m = vi.hoisted(() => ({
  prompt: vi.fn(),
  error: vi.fn(),
  signInWithCustomToken: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: m.error },
  ElMessageBox: { prompt: m.prompt },
}));
vi.mock('firebase/auth', () => ({
  signInWithCustomToken: m.signInWithCustomToken,
}));
vi.mock('../init', () => ({ firebaseAuth: { name: 'auth' } }));
vi.mock('@vben/hooks', () => ({
  useAppConfig: () => ({ apiURL: '/v2' }),
}));

const { isAdminMfaFresh, ADMIN_MFA_VALID_SECONDS } = await import('../claims');
const { completeEmailCodeStep, EmailCodeCancelledError } =
  await import('../email-code-step');

const fetchCall = (i: number): any[] => m.fetch.mock.calls[i] ?? [];
const promptCall = (i: number): any[] => m.prompt.mock.calls[i] ?? [];

const user = { getIdToken: vi.fn().mockResolvedValue('password-id-token') };

function reply(status: number, body: unknown) {
  return Promise.resolve({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
  });
}

beforeEach(() => {
  m.prompt.mockReset();
  m.error.mockReset();
  m.signInWithCustomToken.mockReset().mockResolvedValue({});
  m.fetch.mockReset();
  vi.stubGlobal('fetch', m.fetch);
});

describe('isAdminMfaFresh', () => {
  const now = 1_800_000_000;
  it('requires mfaAt within 30 days for admin / superAdmin', () => {
    expect(isAdminMfaFresh({ rule: 'admin' }, now)).toBe(false);
    expect(isAdminMfaFresh({ rule: 'superAdmin', mfaAt: now - 60 }, now)).toBe(
      true,
    );
    expect(
      isAdminMfaFresh(
        { rule: 'admin', mfaAt: now - ADMIN_MFA_VALID_SECONDS },
        now,
      ),
    ).toBe(false);
    expect(isAdminMfaFresh({ rule: 'admin', mfaAt: now + 3600 }, now)).toBe(
      false,
    );
  });
  it('does not apply to other tokens', () => {
    expect(isAdminMfaFresh({}, now)).toBe(true);
  });
});

describe('completeEmailCodeStep', () => {
  it('sends a code, verifies it and signs in with the custom token', async () => {
    m.fetch
      .mockReturnValueOnce(
        reply(200, { code: 0, data: { sentTo: 'fr***@gmail.com' } }),
      )
      .mockReturnValueOnce(
        reply(200, { code: 0, data: { customToken: 'ct', mfaAt: 1 } }),
      );
    m.prompt.mockResolvedValueOnce({ value: ' 123456 ' });

    await completeEmailCodeStep(user as never);

    expect(fetchCall(0)[0]).toBe('/v2/admin-auth/email-code');
    expect(fetchCall(0)[1].headers.Authorization).toBe(
      'Bearer password-id-token',
    );
    expect(promptCall(0)[0]).toContain('fr***@gmail.com');
    expect(fetchCall(1)[0]).toBe('/v2/admin-auth/verify');
    expect(JSON.parse(fetchCall(1)[1].body)).toEqual({ code: '123456' });
    expect(m.signInWithCustomToken).toHaveBeenCalledWith(
      { name: 'auth' },
      'ct',
    );
  });

  it('lets the user retry after a wrong code', async () => {
    m.fetch
      .mockReturnValueOnce(
        reply(200, { code: 0, data: { sentTo: 'fr***@gmail.com' } }),
      )
      .mockReturnValueOnce(
        reply(400, {
          code: 4,
          data: { reason: 'wrong_code' },
          message: '驗證碼錯誤',
        }),
      )
      .mockReturnValueOnce(
        reply(200, { code: 0, data: { customToken: 'ct', mfaAt: 1 } }),
      );
    m.prompt
      .mockResolvedValueOnce({ value: '000000' })
      .mockResolvedValueOnce({ value: '123456' });

    await completeEmailCodeStep(user as never);

    expect(m.error).toHaveBeenCalledWith('驗證碼錯誤');
    expect(promptCall(1)[0]).toContain('請再輸入一次');
    expect(m.signInWithCustomToken).toHaveBeenCalledTimes(1);
  });

  it('resends when the user presses 重新寄送', async () => {
    m.fetch
      .mockReturnValueOnce(
        reply(200, { code: 0, data: { sentTo: 'fr***@gmail.com' } }),
      )
      .mockReturnValueOnce(
        reply(200, { code: 0, data: { sentTo: 'fr***@gmail.com' } }),
      )
      .mockReturnValueOnce(
        reply(200, { code: 0, data: { customToken: 'ct', mfaAt: 1 } }),
      );
    m.prompt
      .mockRejectedValueOnce('cancel')
      .mockResolvedValueOnce({ value: '123456' });

    await completeEmailCodeStep(user as never);

    expect(m.fetch.mock.calls.map((c: any[]) => c[0])).toEqual([
      '/v2/admin-auth/email-code',
      '/v2/admin-auth/email-code',
      '/v2/admin-auth/verify',
    ]);
  });

  it('reuses the last mail when a code was sent within 60 seconds', async () => {
    m.fetch
      .mockReturnValueOnce(
        reply(429, {
          code: 4,
          data: { reason: 'too_frequent' },
          message: '驗證碼寄送太頻繁，請 40 秒後再試',
        }),
      )
      .mockReturnValueOnce(
        reply(200, { code: 0, data: { customToken: 'ct', mfaAt: 1 } }),
      );
    m.prompt.mockResolvedValueOnce({ value: '123456' });

    await completeEmailCodeStep(user as never);
    expect(promptCall(0)[0]).toContain('剛剛已寄出驗證碼');
  });

  it('closing the dialog cancels the login', async () => {
    m.fetch.mockReturnValueOnce(
      reply(200, { code: 0, data: { sentTo: 'fr***@gmail.com' } }),
    );
    m.prompt.mockRejectedValueOnce('close');

    await expect(completeEmailCodeStep(user as never)).rejects.toBeInstanceOf(
      EmailCodeCancelledError,
    );
    expect(m.signInWithCustomToken).not.toHaveBeenCalled();
  });

  it('a send failure (e.g. daily limit) stops the login with the server message', async () => {
    m.fetch.mockReturnValueOnce(
      reply(429, {
        code: 4,
        data: { reason: 'daily_limit' },
        message: '今天寄送驗證碼的次數已達上限',
      }),
    );
    await expect(completeEmailCodeStep(user as never)).rejects.toThrow(
      '今天寄送驗證碼的次數已達上限',
    );
    expect(m.prompt).not.toHaveBeenCalled();
  });
});
