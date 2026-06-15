# CODE_MAP — Yumie Backoffice

本專案是 [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) monorepo 的客製版，為 **Yumie 旅館訂房後台**。實際開發與部署的 app 只有 **`apps/web-ele`**（Element Plus 版），串接 **Firebase Auth + Firestore（只讀）+ `/v2` REST 後端**。

> Vben 上游的 `web-antd`、`packages/*`、`internal/*` 基本維持原樣，平常不動。客製內容幾乎全部集中在 `apps/web-ele/src`。先看這裡。

---

## 1. 全貌

```
yumie-backoffice-vben/
├─ apps/
│  ├─ web-ele/          ← 唯一在維護的 app（Element Plus）。本文件 99% 在講它
│  ├─ web-antd/         ← Vben 上游 Ant Design 版，未使用
│  └─ backend-mock/     ← Vben 內建 Nitro mock，v3 已停用（VITE_NITRO_MOCK=false）
├─ packages/            ← Vben 框架套件（@core/effects/stores/preferences/...），少動
├─ internal/            ← 建置/lint/tsconfig 等工具設定
├─ scripts/deploy-prod-hosting.mjs  ← production 部署（含 confirm）
├─ firebase.json        ← hosting target=backoffice，/v2/** rewrite 到 api function (asia-east1)
└─ .firebaserc          ← staging=yumie-test / production=yumie-8e60e
```

### 部署 / 環境

| 環境 | Firebase project | 指令 | 說明 |
| --- | --- | --- | --- |
| dev | yumie-test | `pnpm dev:ele`（port 5777） | 直連 yumie-test backend / functions emulator |
| staging | yumie-test | `pnpm deploy:ele:staging` | 無 confirm |
| production | yumie-8e60e (`yumie-backoffice`) | `pnpm deploy:prod` | 有 confirm prompt |

環境變數在 `apps/web-ele/.env*`：`.env`（共用）、`.env.development`、`.env.staging`、`.env.production`。 `VITE_GLOB_API_URL` 指向 `/v2` API，`VITE_FIREBASE_*` 為 Firebase config，`VITE_USE_APPCHECK` 控制 AppCheck（dev 關、prod 開）。`VITE_GLOB_BOOKING_BASE_URL`（`.env` 共用，預設 `https://yumie.flybooking.io`）為顧客端訂房站 base URL，供合作夥伴頁產生預約 QR Code（`{base}/{hotelId}?ref={code}`）；staging/dev 要指向測試前端時於對應 `.env.*` 覆寫。

---

## 2. `apps/web-ele/src` 導覽

```
src/
├─ bootstrap.ts        ← 啟動序列（見 §3）
├─ main.ts             ← 呼叫 bootstrap()
├─ preferences.ts      ← 專案層 Vben 設定覆寫（accessMode='backend'、defaultHomePath、logo、locale=zh-TW）
├─ firebase/           ← Firebase 整合層（見 §4）★ 客製核心
├─ store/              ← Pinia stores（auth / hotel）（見 §5）
├─ api/                ← /v2 REST client + 各模組 API（見 §6）
├─ composables/        ← Firestore 即時訂閱 hooks（見 §7）
├─ components/         ← 全域共用元件（HotelSwitcher / HotelDocSubscriber / ImageUpload）
├─ router/             ← 路由與守衛（見 §8）
├─ views/yumie/        ← 所有業務頁面（見 §9）
├─ views/_core/        ← Vben 內建頁（登入 / profile / 403/404 fallback）
├─ adapter/            ← Vben 表單 / vxe-table / Element 元件適配
└─ layouts/            ← BasicLayout / AuthLayout（Vben 預設）
```

---

## 3. 啟動序列 — `bootstrap.ts`

關鍵順序（不可隨意調動）：

1. 初始化元件 / 表單適配器（`adapter/component`、`adapter/form`）
2. i18n、Pinia stores（namespace = `VITE_APP_NAMESPACE`）
3. **`setupAuthListener()` + `await authReady`** — 必須在 router 載入前，否則 route guard 會在 Firebase user 尚未 restore 時就跑（race）。
4. 註冊權限指令、tippy、router、Motion plugin
5. `app.mount('#app')`

---

## 4. `firebase/` — 客製核心 ★

整個前端的 auth / 資料存取邊界都在這四個檔。**請優先讀懂這裡**。

| 檔案 | 職責 |
| --- | --- |
| `init.ts` | 從 `import.meta.env` 讀 config，匯出 `firebaseApp` / `firebaseAuth` / `firestore` / `appCheck` |
| `claims.ts` | 解析 Firebase custom claims：`rule`（`admin` \| `superAdmin`）、`hotelGroup: string[]`。**嚴格驗證**，缺欄位丟 `InvalidClaimsError`（半殘登入不通過） |
| `auth-sync.ts` | Firebase Auth ↔ Vben store 同步。`setupAuthListener()`（掛 onIdTokenChanged）、`authReady`（首次 token 同步的 Promise，guard/request/login 全 await 它）、`syncFirebaseUserToStores(user)`（純同步函式） |
| `firestore-readonly.ts` | **只讀** onSnapshot wrappers（`watchHotelDoc` / `watchOrders`）。前端**禁止** import setDoc/updateDoc/addDoc/deleteDoc/batch/transaction — 寫入一律走 `/v2` REST |

> **鐵則**：讀資料可走 Firestore 即時訂閱（只讀）；**所有寫入走 `/v2` REST**，由後端統一處理權限與 trigger。

---

## 5. `store/` — Pinia

| Store | 內容 |
| --- | --- |
| `auth.ts` (`useAuthStore`) | `authLogin`（signInWithEmailAndPassword + 立即同步 store，不靠 callback 避免 race）、`logout`、`fetchUserInfo`。失敗時清 store + signOut；`InvalidClaimsError` 有專屬提示 |
| `hotel.ts` (`useHotelStore`) | 多飯店切換單一資料源：`hotelGroup`（來自 claims）、`currentHotelId`（localStorage 持久化）、`currentHotelMeta`（`qk-list/{hotelId}` 的即時 snapshot）。`switchHotel()` / `setHotelGroup()` |

> Vben 框架自身的 `useAccessStore` / `useUserStore` 來自 `@vben/stores`，由 `auth-sync` 餵資料。

---

## 6. `api/` — `/v2` REST

`request.ts` 是核心 HTTP client（基於 `@vben/request`），所有 request 前置處理都在這：

- 每次 request `await authReady` 後取 `Authorization: Bearer <Firebase idToken>`
- 預插 `X-Firebase-AppCheck`（後端目前 bypass）、`Accept-Language`
- **自動注入 `hotelId`**（依 method / payload 型態：GET/DELETE→params；FormData→append；object→spread；無 body→`{hotelId}`）
- Response 統一 `{ code, data, message }`，`successCode=0`
- 401 → `useAuthStore().logout()`（**不**做 token refresh，Firebase SDK 自動 refresh）

每個業務模組一個資料夾，慣例：`index.ts`（API 方法）+ `types.ts`（型別）。模組：`core`(auth/menu/user)、`orders`、`customers`、`extras`、`hotels`、`inventory`、 `membership-benefits`、`memberships`(含 phone)、`partners`(異業合作)、`plans`、`room-types`、`sms`、`users`。

範例（`api/orders/index.ts`）：`ordersApi.list()` / `.createByAdmin()` / `.updateStatus()`。`sms` 模組除 `records`/`billing` 外另有 `verificationCode(phone)`（櫃檯查當下驗證碼）與 `lookupLogs(range)`（superAdmin 查稽核）。

---

## 7. `composables/` — Firestore 即時訂閱

跟著 `hotelStore.currentHotelId` 自動重訂閱，component unmount 自動 unsubscribe。底層都用 `firestore-readonly.ts`（只讀）。

`useHotelDocSnapshot` · `useOrdersSnapshot` · `useAvailabilitySnapshot` · `useExtrasSnapshot` · `usePlansSnapshot`

> 即時資料常是**原樣 raw**（snake_case / 加密電話）；正規化後的資料由 `/v2` GET 回傳，view 通常用 v2 結果顯示、用 snapshot 觸發「新訂單/取消立即反映」。

`components/HotelDocSubscriber.vue`：在 BasicLayout 內 mount 一次，是 `qk-list/{hotelId}` 的**全域唯一**訂閱點，推進 `currentHotelMeta`，並在切到 loyalty 未啟用的飯店時把使用者踢離 requiresLoyalty 頁。

---

## 8. `router/` — 路由與權限

| 檔案 | 內容 |
| --- | --- |
| `routes/modules/yumie.ts` | 業務路由樹（1:1 對齊舊 navbar）。`meta.authority: ['superAdmin']` 限權；`meta.requiresLoyalty` 需飯店啟用會員 |
| `access.ts` | `accessMode='backend'` — 選單由後端 `/v2/menu/all` 產生（`getAllMenusApi`），前端只提供 component/layout map |
| `guard.ts` | 三道守衛：`CommonGuard`（進度條）、`AccessGuard`（await authReady → token 檢查 → 生成動態路由）、`LoyaltyGuard`（requiresLoyalty 且飯店未啟用會員 → 擋下，superAdmin 例外） |

選單樹（見 `routes/modules/yumie.ts`，但 `accessMode='backend'` 實際以 `/v2/menu/all` 為準）： `訂單`(occupy/booking)、`房況`(inventory/availability)、`加購`、 `數據`(customers*/sms/sms-code-lookup/sms-lookup-audit*/sms-billing*/partner-performance/partner-settlement)、`設定`(room-types/plans/partners/hotel/membership-benefits†/users*/super-admin*) 　　`*` = 限 superAdmin，`†` = requiresLoyalty。`partners`（合作夥伴）、`partner-performance`（合作成效，即時分析）、`partner-settlement`（合作結算，回饋帳本/月結/撥款）為異業合作功能，hotel-scoped admin 可管（非 superAdmin-only）。`sms-code-lookup`（驗證碼查詢，所有 admin）讓櫃檯依電話查客人當下簡訊驗證碼念給收不到簡訊的客人；`sms-lookup-audit`（查詢稽核，superAdmin）列出每次查詢的稽核（操作者/IP/電話/結果）。

預設首頁 `/orders/occupy`（見 `preferences.ts` 與 `auth-sync.ADMIN_HOME`）。

---

## 9. `views/yumie/` — 業務頁面

| 路徑 | 頁面 |
| --- | --- |
| `orders/occupy.vue` | 訂單列表（即時，依日期分組） |
| `orders/booking.vue` | 手動建單（admin） |
| `rooms/inventory.vue` · `rooms/availability.vue` | 房量 / 時段 |
| `extras/index.vue` | 加購品項 |
| `reports/customers.vue` · `reports/sms.vue` · `reports/sms-billing.vue` · `reports/partner-performance.vue` · `reports/partner-settlement.vue` | 數據報表（含異業合作成效 + 回饋帳本結算） |
| `reports/sms-code-lookup.vue` · `reports/sms-lookup-audit.vue` | 驗證碼查詢（櫃檯依電話查當下驗證碼 + 倒數，所有 admin，呼叫 `smsApi.verificationCode`）/ 查詢稽核（superAdmin，`smsApi.lookupLogs` 列操作者/IP/電話/結果） |
| `settings/*` | room-types / plans / partners / hotel / membership-benefits / users / super-admin（`partners` 含 QR + **夥伴登入帳號管理**：建立/停用/啟用/重設，呼叫 `api/partners` 的 `partnerAccountApi`；帳號狀態欄由 `accountStatus` 顯示） |
| `memberships/manual-upgrade.vue` | 會員手動升級 |

頁面慣例：`<script setup>` + Element Plus 元件，從 `#/api/*` 取資料、`#/composables/*` 訂閱即時、 `#/store/hotel` 取當前飯店。

---

## 10. 改動指南（常見任務）

- **新增一個業務頁面**：在 `views/yumie/` 建 `.vue` → 在 `router/routes/modules/yumie.ts` 加 route（注意後端 `/v2/menu/all` 也要回對應選單，否則 backend accessMode 下不顯示）。
- **新增一個 API 模組**：在 `api/<module>/` 建 `index.ts` + `types.ts`，用 `requestClient`（會自動帶 token + hotelId）。
- **新增即時訂閱**：在 `firebase/firestore-readonly.ts` export 新的 `watchXxx`，再包一個 `composables/useXxxSnapshot.ts`。 **不要**直接在 view 裡 import `firebase/firestore`。
- **任何寫入**：呼叫 `/v2` REST，**不要**用 Firestore 寫 API。
- **權限**：route 加 `meta.authority`（角色）或 `meta.requiresLoyalty`（飯店會員功能）。

---

## 11. 常用指令

```bash
pnpm dev:ele               # 本機開發（port 5777，連 yumie-test）
pnpm build:ele             # production build
pnpm deploy:ele:staging    # 部署 staging（yumie-test）
pnpm deploy:prod           # 部署 production（yumie-8e60e，含 confirm）
pnpm check:type            # turbo typecheck
pnpm lint                  # vsh lint
```
