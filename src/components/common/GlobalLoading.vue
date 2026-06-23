<!--
 * 全局加载组件
 * 提供全屏加载遮罩和加载动画
 * 支持计数器，多次调用 show 需要相同次数的 hide
 -->
<template>
  <div v-if="visible" class="global-loading">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p class="loading-text">{{ text || '加载中...' }}</p>
    </div>
  </div>
</template>

<script setup>
/**
 * 全局加载组件
 * 提供全屏加载遮罩和加载动画
 */
defineOptions({ name: 'GlobalLoading' });

import { ref } from 'vue';

// 是否可见
const visible = ref(false);
// 加载提示文本
const text = ref('');
// 加载计数器，支持嵌套调用
let loadingCount = ref(0);

/**
 * 显示加载状态
 * @param {string} loadingText - 加载提示文本
 */
function show(loadingText = '加载中...') {
  text.value = loadingText;
  loadingCount.value++;
  visible.value = true;
}

/**
 * 隐藏加载状态
 * 使用计数器管理，确保所有加载完成后才隐藏
 */
function hide() {
  loadingCount.value--;
  if (loadingCount.value <= 0) {
    loadingCount.value = 0;
    visible.value = false;
  }
}

// 暴露方法供外部调用
defineExpose({
  show,
  hide,
});
</script>

<style scoped>
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loading-content {
  background: #fff;
  padding: 40px 50px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: loading-fade-in 0.3s ease;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #11998e;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes loading-fade-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
