#!/usr/bin/env node
/**
 * Production hosting deploy — 加 confirm prompt 避免誤觸。
 *
 * 流程：
 *   1. 問使用者輸入 "yes" 確認部署到 yumie-backoffice
 *   2. 跑 pnpm build:ele（vite --mode production，載 .env.production）
 *   3. 跑 firebase deploy --only hosting:backoffice --project=production
 *
 * staging deploy 走另一個 script（無需 confirm）：
 *   pnpm deploy:ele:staging
 */
import { execSync } from 'node:child_process';
import readline from 'node:readline';

const PROJECT = 'production'; // .firebaserc alias → yumie-8e60e
const HOSTING_TARGET = 'backoffice'; // .firebaserc target → yumie-backoffice

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
  console.log('\n⚠️  即將部署到 production: yumie-backoffice');
  console.log('   - .env.production: VITE_FIREBASE_PROJECT_ID=yumie-8e60e');
  console.log('   - hosting target: yumie-backoffice\n');

  const answer = await ask('輸入 "yes" 確認部署，其他鍵取消: ');
  if (answer !== 'yes') {
    console.log('✗ 已取消');
    process.exit(0);
  }

  console.log('\n→ pnpm build:ele');
  execSync('pnpm build:ele', { stdio: 'inherit' });

  console.log(
    `\n→ firebase deploy --only hosting:${HOSTING_TARGET} --project=${PROJECT}`,
  );
  execSync(
    `npx firebase deploy --only hosting:${HOSTING_TARGET} --project=${PROJECT}`,
    {
      stdio: 'inherit',
    },
  );

  console.log('\n✓ Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
