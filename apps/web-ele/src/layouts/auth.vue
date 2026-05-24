<script lang="ts" setup>
import { computed } from 'vue';

import { AuthPageLayout } from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';

import yumieLoginIllustration from '#/assets/auth/yumie-login-illustration.svg';

const appName = computed(() => preferences.app.name);
const logo = computed(() => preferences.logo.source);
const logoDark = computed(() => preferences.logo.sourceDark);
const { isDark } = usePreferences();
const yumieWordmark = computed(() =>
  isDark.value
    ? '/assets/images/logo_white.png'
    : '/assets/images/logo_black.png',
);
</script>

<template>
  <AuthPageLayout
    :app-name="appName"
    :logo="logo"
    :logo-dark="logoDark"
    page-description="訂單、房況、加購與會員營運一站管理"
    page-title="Yumie 智慧旅宿管理後台"
    :slogan-image="yumieLoginIllustration"
  >
    <template #logo>
      <div class="absolute top-0 left-0 z-10 flex flex-1">
        <div class="mt-4 ml-4 flex flex-1 items-center">
          <img alt="Yumie" class="h-10 w-auto" :src="yumieWordmark" />
        </div>
      </div>
    </template>
    <!-- 自定义工具栏 -->
    <!-- <template #toolbar></template> -->
  </AuthPageLayout>
</template>
