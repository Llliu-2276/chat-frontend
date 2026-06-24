<!--
 * 注册成功弹窗
 * 使用 ElDialog 展示系统生成的账号信息，替代原 ElMessageBox.alert HTML拼接方案
 * 不显示密码，只显示账号和用户名
 -->
<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="注册成功"
    class="register-success-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="register-success-card">
      <div class="register-success-icon">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <circle cx="12" cy="12" r="12" fill="#67c23a"/>
          <path d="M7 12l3 3 7-7" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="register-success-title">注册成功</div>
      <div class="register-success-info">
        <div class="register-success-row">
          <span class="register-success-label">账号</span>
          <span class="register-success-value account-value">{{ userAccount }}</span>
        </div>
        <div class="register-success-row">
          <span class="register-success-label">用户名</span>
          <span class="register-success-value">{{ userName }}</span>
        </div>
      </div>
      <div class="register-success-warning">
        <span>
          <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align:middle;margin-right:4px">
            <path d="M12 2L1 22h22L12 2z" fill="#e6a23c"/>
            <path d="M11 9h2v6h-2zM11 17h2v2h-2z" fill="#fff"/>
          </svg>
          请牢记账号，账号是登录的唯一凭证
        </span>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="$emit('update:modelValue', false)">我知道了，去登录</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 注册成功弹窗
 * 纯展示型弹窗，显示系统生成的账号和用户名
 */
defineOptions({ name: 'RegisterSuccessDialog' });

defineProps({
  modelValue: { type: Boolean, default: false },
  userAccount: { type: String, default: '' },
  userName: { type: String, default: '' },
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.register-success-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
  padding: 8px 0;
}

.register-success-icon {
  font-size: 48px;
  line-height: 1;
}

.register-success-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
  letter-spacing: 0.5px;
}

.register-success-info {
  width: 100%;
  max-width: 360px;
  /* 半透明白底 + 明显绿色调边框 */
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(56, 239, 125, 0.3);
  border-radius: 12px;
  padding: 4px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.register-success-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 10px 18px;
}

.register-success-row:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.register-success-label {
  font-size: 13px;
  color: #999;
  flex-shrink: 0;
  min-width: 40px;
  text-align: right;
}

.register-success-value {
  font-size: 15px;
  color: var(--text-color);
  font-weight: 600;
  word-break: break-all;
}

.account-value {
  font-size: 20px;
  letter-spacing: 2px;
  color: var(--primary-color);
}

.register-success-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: #e6a23c;
  text-align: center;
  padding: 4px 8px;
}
</style>

<!-- ElDialog 渲染在 body 下，必须用 unscoped 样式覆盖 -->
<style>
/* 提高 specificity：.el-dialog + 自定义 class，确保覆盖 Element Plus 默认样式 */
.el-dialog.register-success-dialog {
  border-radius: var(--radius-card) !important;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(17, 153, 142, 0.15) 0%, rgba(56, 239, 125, 0.10) 100%) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(56, 239, 125, 0.3) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05) !important;
}

/* 淡化弹窗背后的遮罩层，让磨砂玻璃效果可见 */
.register-success-dialog + .el-overlay-dialog,
.el-overlay:has(.register-success-dialog) {
  background: rgba(0, 0, 0, 0.08) !important;
}

.el-dialog.register-success-dialog .el-dialog__header {
  padding: 22px 24px 12px;
  border-bottom: none;
}

.el-dialog.register-success-dialog .el-dialog__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--primary-color);
}

.el-dialog.register-success-dialog .el-dialog__body {
  padding: 0 24px 16px;
}

.el-dialog.register-success-dialog .el-dialog__footer {
  padding: 12px 24px 20px;
}

.el-dialog.register-success-dialog .el-button--primary {
  background: rgba(56, 239, 125, 0.22);
  color: var(--text-color);
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  border-radius: var(--radius-control);
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.el-dialog.register-success-dialog .el-button--primary:hover {
  background: rgba(56, 239, 125, 0.35);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
  transform: translateY(-1px);
}
</style>
