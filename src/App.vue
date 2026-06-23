<!--
 * 应用根组件
 * 提供路由视图和全局组件
 * 通过 provide/inject 提供全局方法
 -->
<template>
  <router-view />
  <GlobalLoading ref="loadingRef" />
</template>

<script setup>
/**
 * 应用根组件
 * 提供路由视图和全局组件
 */
defineOptions({ name: 'App' });

import { ref, provide } from 'vue';
import GlobalLoading from '@/components/common/GlobalLoading.vue';
import { ElMessage } from 'element-plus';

// 加载组件引用
const loadingRef = ref(null);

// 提供全局 loading 和 toast 方法
provide('loading', {
  show: (text) => loadingRef.value?.show(text),
  hide: () => loadingRef.value?.hide(),
});

provide('toast', {
  success: (msg) => ElMessage.success(msg),
  error: (msg) => ElMessage.error(msg),
  warning: (msg) => ElMessage.warning(msg),
  info: (msg) => ElMessage.info(msg),
});
</script>

<style>
/* 全局样式已在 style.css 中定义 */
</style>
