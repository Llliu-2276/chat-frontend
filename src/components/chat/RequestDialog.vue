<!--
 * 请求弹窗（好友申请 / 加群申请）
 * 使用 ElDialog + 正常 Vue 模板，替代原 ElMessageBox.prompt HTML拼接方案
 * 支持两种模式：friend（好友申请）和 group（加群申请）
 -->
<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="dialogTitle"
    class="request-dialog"
    :close-on-click-modal="false"
    :show-close="true"
    @close="handleCancel"
  >
    <!-- 信息卡片：头像首字 + 名称/详情 -->
    <div class="request-dialog-card">
      <div class="request-dialog-avatar">{{ targetName.charAt(0) || '?' }}</div>
      <div class="request-dialog-info">
        <div class="request-dialog-name">{{ targetName }}</div>
        <div class="request-dialog-sub">
          账号：{{ targetAccount }}
          <template v-if="targetExtra"> · {{ targetExtra }}</template>
        </div>
      </div>
    </div>

    <span class="request-dialog-label">申请留言</span>
    <el-input
      v-model="inputText"
      type="textarea"
      :rows="3"
      :placeholder="inputPlaceholder"
      maxlength="100"
      show-word-limit
    />

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :disabled="!inputText.trim()" @click="handleConfirm">
        {{ confirmButtonText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 请求弹窗组件
 * 好友申请模式和加群申请模式复用同一组件，差异通过 props 控制
 */
defineOptions({ name: 'RequestDialog' });

import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 'friend' | 'group' */
  mode: { type: String, default: 'friend' },
  /** 目标用户名/群名 */
  targetName: { type: String, default: '' },
  /** 目标账号/群号 */
  targetAccount: { type: String, default: '' },
  /** 附加信息（如群聊人数） */
  targetExtra: { type: String, default: '' },
  /** 默认留言内容 */
  defaultMessage: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const inputText = ref('');

// 弹窗打开时重置输入内容
watch(() => props.modelValue, (val) => {
  if (val) {
    inputText.value = props.defaultMessage;
  }
});

const dialogTitle = computed(() => props.mode === 'friend' ? '发送好友申请' : '申请加入群聊');
const confirmButtonText = computed(() => props.mode === 'friend' ? '发送申请' : '发送申请');
const inputPlaceholder = computed(() =>
  props.mode === 'friend' ? '一句话介绍自己，提高通过率' : '介绍一下自己，让群主更愿意通过'
);

function handleConfirm() {
  const message = inputText.value.trim();
  if (!message) return;
  emit('confirm', message);
}

function handleCancel() {
  emit('cancel');
}
</script>

<style scoped>
.request-dialog-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px 18px;
  /* 半透明白底 + 明显绿色调边框 */
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(56, 239, 125, 0.3);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.request-dialog-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: var(--text-white);
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700;
  flex-shrink: 0;
}

.request-dialog-info {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}

.request-dialog-name {
  font-size: 14px; font-weight: 600; color: var(--text-color);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.request-dialog-sub {
  font-size: 12px; color: #999;
}

.request-dialog-label {
  display: block;
  font-size: 13px; color: #888;
  margin: 14px 0 6px;
}
</style>

<!-- ElDialog 渲染在 body 下，必须用 unscoped 样式覆盖 -->
<style>
/* 提高 specificity：.el-dialog + 自定义 class，确保覆盖 Element Plus 默认样式 */
.el-dialog.request-dialog {
  border-radius: var(--radius-card) !important;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(17, 153, 142, 0.15) 0%, rgba(56, 239, 125, 0.10) 100%) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(56, 239, 125, 0.3) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05) !important;
}

/* 淡化弹窗背后的遮罩层，让磨砂玻璃效果可见 */
.el-overlay:has(.request-dialog) {
  background: rgba(0, 0, 0, 0.08) !important;
}

.el-dialog.request-dialog .el-dialog__header {
  padding: 22px 24px 12px;
  border-bottom: none;
}

.el-dialog.request-dialog .el-dialog__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--primary-color);
}

.el-dialog.request-dialog .el-dialog__body {
  padding: 0 24px 16px;
}

.el-dialog.request-dialog .el-dialog__footer {
  padding: 12px 24px 20px;
}

/* 输入框：半透明白底 + 主题色 focus */
.request-dialog .el-textarea__inner {
  border-radius: 10px;
  border-color: rgba(17, 153, 142, 0.2);
  background: rgba(255, 255, 255, 0.45);
  resize: none;
  font-size: 14px; padding: 10px 14px; line-height: 1.5;
  box-shadow: none !important;
}

.request-dialog .el-textarea__inner:focus {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 3px rgba(17, 153, 142, 0.12) !important;
}

/* 确认按钮：复用项目 .btn-accept 色值 */
.el-dialog.request-dialog .el-button--primary {
  background: rgba(56, 239, 125, 0.22);
  color: var(--text-color);
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  border-radius: var(--radius-control); padding: 8px 24px; font-weight: 600;
}

.el-dialog.request-dialog .el-button--primary:hover {
  background: rgba(56, 239, 125, 0.35);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
  transform: translateY(-1px);
}

/* 取消按钮：复用项目 .btn-danger 色值 */
.el-dialog.request-dialog .el-button:not(.el-button--primary) {
  background: rgba(224, 83, 83, 0.18);
  color: var(--text-color);
  border: 1.5px solid rgba(224, 83, 83, 0.45);
  border-radius: var(--radius-control); padding: 8px 24px; font-weight: 600;
}

.el-dialog.request-dialog .el-button:not(.el-button--primary):hover {
  background: rgba(224, 83, 83, 0.3);
  box-shadow: 0 2px 8px rgba(224, 83, 83, 0.2);
  transform: translateY(-1px);
}
</style>
