#!/usr/bin/env node
/**
 * Production hosting deploy — 加 confirm prompt 避免誤觸。
 *
 * 流程：
 *   1. 問使用者輸入 "yes" 確認部到 yumie-8e60e
 *   2. 跑 pnpm build:ele（vite --mode production，載 .env.production）
 *   3. 跑 firebase deploy --only hosting --project=production
 *
 * staging deploy 走另一個 script（無需 confirm）：
 *   pnpm deploy:ele:staging
 */
import { execSync } from 'node:child_process';
import readline from 'node:readline';

const PROJECT = 'production'; // .firebaserc alias → yumie-8e60e

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });
}

async function main() {
  console.log('\n⚠️  即將部署到 production: yumie-8e60e');
  console.log('   - .env.production: VITE_FIREBASE_PROJECT_ID=yumie-8e60e');
  console.log('   - hosting target: yumie-8e60e default site\n');

  const answer = await ask('輸入 "yes" 確認部署，其他鍵取消: ');
  if (answer !== 'yes') {
    console.log('✗ 已取消');
    process.exit(0);
  }

  console.log('\n→ pnpm build:ele');
  execSync('pnpm build:ele', { stdio: 'inherit' });

  console.log(`\n→ firebase deploy --only hosting --project=${PROJECT}`);
  execSync(`npx firebase deploy --only hosting --project=${PROJECT}`, {
    stdio: 'inherit',
  });

  console.log('\n✓ Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
