<!--
 * 登录/注册页面
 * 包含登录和注册表单，支持可拖动遮罩切换
 * 采用薄型手环圆环设计，具有3D透视效果
 -->
<template>
  <div class="login-page">
    <!-- 背景层：显示 "chat" 文字 -->
    <div class="login-background">
      <h1>chat</h1>
    </div>

    <!-- 单独剥离左侧椭圆，放到遮罩容器外 -->
    <div class="ring-left-curve-down" :style="leftCurveStyle"></div>

    <!-- 前景层：登录注册卡片 -->
    <div class="login-register-container glass-card" ref="containerRef">
      <!-- 注册表单区域 -->
      <div class="form-div register-section">
        <h2 class="title">Register</h2>
        <form class="register-form" @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="register-username" class="form-label">用户名</label>
            <input
              type="text"
              id="register-username"
              v-model="registerForm.userName"
              class="form-input"
              placeholder="请输入用户名（最多16个字符）"
              maxlength="16"
            />
          </div>

          <div class="form-group">
            <label for="register-password" class="form-label">密码</label>
            <input
              type="password"
              id="register-password"
              v-model="registerForm.password"
              class="form-input"
              placeholder="请输入密码（6-32个字符）"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="form-label">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              v-model="registerForm.confirmPassword"
              class="form-input"
              placeholder="请再次输入密码"
            />
          </div>

          <button type="submit" class="submit-button" :disabled="registerLoading">
            <span v-if="registerLoading" class="btn-loading-icon">
              <img src="../assets/loading.png" alt="Loading">
            </span>
            {{ registerLoading ? '注册中...' : '注册' }}
          </button>
        </form>
      </div>

      <!-- 登录表单区域 -->
      <div class="form-div login-section">
        <h2 class="title">Login</h2>
        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="login-account" class="form-label">账号</label>
            <input
              type="text"
              id="login-account"
              v-model="loginForm.userAccount"
              class="form-input"
              placeholder="请输入8位数字账号"
              maxlength="8"
            />
          </div>

          <div class="form-group">
            <label for="login-password" class="form-label">密码</label>
            <input
              type="password"
              id="login-password"
              v-model="loginForm.password"
              class="form-input"
              placeholder="请输入密码"
            />
          </div>

          <button type="submit" class="submit-button" :disabled="loginLoading">
            <span v-if="loginLoading" class="btn-loading-icon">
              <img src="../assets/loading.png" alt="Loading">
            </span>
            {{ loginLoading ? '登录中...' : '登录' }}
          </button>
        </form>
      </div>

      <!-- 可拖动的薄型手环遮罩层 -->
      <div
        class="mask-ring-container"
        :style="maskStyle"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <!-- 遮罩背景层 - 完全阻挡交互 -->
        <div class="mask-backdrop">
          <!-- 手环状圆环 - 薄型扁平设计 -->
          <div class="ring-band">
            <!-- 圆环正面 -->
            <div class="ring-front-face">
              <div class="text-container">
                <div class="chat-text">
                  <span>chat</span>
                </div>
                <div class="dynamic-title">
                  <span
                    class="text-item"
                    :class="{
                      active: maskPosition === 0,
                      'enter-from-right': dragDirection === 'left' && maskPosition === 0,
                      'enter-from-left': dragDirection === 'right' && maskPosition === 0
                    }"
                  >Register →</span>
                  <span
                    class="text-item"
                    :class="{
                      active: maskPosition === 1,
                      'enter-from-right': dragDirection === 'left' && maskPosition === 1,
                      'enter-from-left': dragDirection === 'right' && maskPosition === 1
                    }"
                  >← Login</span>
                </div>
              </div>
            </div>
            <!-- 圆环左侧透视部分（椭圆弧形） -->
            <div class="ring-left-curve-up"></div>
            <!-- 圆环右侧透视部分（椭圆弧形） -->
            <div class="ring-right-curve"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 登录/注册页面
 * 包含登录和注册表单，支持可拖动遮罩切换
 */
defineOptions({ name: 'Login' });

import { ref, inject } from 'vue';
import { ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useDragMask } from '@/composables/useDragMask';

const router = useRouter();
const userStore = useUserStore();
const containerRef = ref(null);

const toast = inject('toast');
const loading = inject('loading');

// ==================== 遮罩拖拽 ====================
const { maskPosition, dragDirection, maskStyle, leftCurveStyle, startDrag, slideTo } = useDragMask(containerRef);

// ==================== 登录表单 ====================
// 登录表单数据
const loginForm = ref({
  userAccount: '',
  password: '',
});

// 登录按钮加载状态
const loginLoading = ref(false);

/**
 * 处理登录
 * 验证表单并提交登录请求
 */
async function handleLogin() {
  // 表单验证
  if (!loginForm.value.userAccount) {
    toast.warning('请输入账号');
    return;
  }

  if (!loginForm.value.password) {
    toast.warning('请输入密码');
    return;
  }

  if (loginForm.value.userAccount.length !== 8) {
    toast.warning('账号必须为8位数字');
    return;
  }

  loginLoading.value = true;

  try {
    const result = await userStore.login(loginForm.value);

    if (result.success) {
      // 显示登录成功提示
      toast.success('登录成功，正在跳转...');

      // 清空登录表单，防止登出后跳转回登录页时显示历史登录信息
      loginForm.value = { userAccount: '', password: '' };

      // 延迟2秒后跳转到聊天页面，让用户看到成功提示
      setTimeout(() => {
        router.push('/chat');
      }, 2000);
    } else {
      toast.error(result.message || '登录失败，账号或密码错误，请重试');
    }
  } catch (error) {
    toast.error('网络异常，请检查连接');
  } finally {
    loginLoading.value = false;
  }
}

// ==================== 注册表单 ====================
// 注册表单数据
const registerForm = ref({
  userName: '',
  password: '',
  confirmPassword: '',
});

// 注册按钮加载状态
const registerLoading = ref(false);

/**
 * 处理注册
 * 验证表单并提交注册请求
 */
async function handleRegister() {
  // 表单验证
  if (!registerForm.value.userName) {
    toast.warning('请输入用户名');
    return;
  }

  if (!registerForm.value.password) {
    toast.warning('请输入密码');
    return;
  }

  // 验证密码长度
  if (registerForm.value.password.length < 6) {
    toast.warning('密码太短，至少需要6个字符');
    return;
  }

  if (registerForm.value.password.length > 32) {
    toast.warning('密码太长，不能超过32个字符');
    return;
  }

  if (!registerForm.value.confirmPassword) {
    toast.warning('请再次输入密码');
    return;
  }

  // 验证密码一致性
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    toast.warning('两次密码输入不一致');
    return;
  }

  registerLoading.value = true;

  try {
    const result = await userStore.register({
      userName: registerForm.value.userName,
      password: registerForm.value.password,
    });

    if (result.success) {
      // 从后端响应中提取注册信息（后端 v2.6+ 返回 userAccount，旧版仅返回 userId）
      const userAccount = result.data?.userAccount || '';
      const userName = result.data?.userName || registerForm.value.userName;
      const password = registerForm.value.password;
      console.log('[注册成功] 后端返回:', JSON.stringify(result.data));

      // 后端未升级时的降级提示
      if (!userAccount) {
        toast.warning('后端尚未返回账号信息，请联系管理员升级后端到 v2.6+');
      }

      // 弹出注册成功卡片，展示系统生成的账号
      try {
        await ElMessageBox.alert(
          `<div class="register-success-card">
            <div class="register-success-icon">🎉</div>
            <div class="register-success-title">注册成功</div>
            <div class="register-success-info">
              <div class="register-success-row">
                <span class="register-success-label">账号</span>
                <span class="register-success-value account-value">${userAccount}</span>
              </div>
              <div class="register-success-row">
                <span class="register-success-label">用户名</span>
                <span class="register-success-value">${userName}</span>
              </div>
              <div class="register-success-row">
                <span class="register-success-label">密码</span>
                <span class="register-success-value">${password}</span>
              </div>
            </div>
            <div class="register-success-warning">
              <span>⚠️ 请牢记账号和密码，账号是登录的唯一凭证</span>
            </div>
          </div>`,
          '注册成功',
          {
            confirmButtonText: '我知道了，去登录',
            dangerouslyUseHTMLString: true,
            customClass: 'register-success-dialog',
            closeOnClickModal: false,
            closeOnPressEscape: false,
            showClose: false,
          }
        );
      } catch {
        // 极端情况（弹窗渲染失败），静默降级
      }

      // 清空注册表单
      registerForm.value = { userName: '', password: '', confirmPassword: '' };
      // 自动填入账号到登录表单，方便用户直接登录
      loginForm.value.userAccount = userAccount;
      loginForm.value.password = '';

      // 滑动遮罩到登录区（maskPosition=0 遮挡注册表单，显示登录表单）
      setTimeout(() => slideTo(0), 300);
    } else {
      toast.error(result.message || '注册失败，请重试');
    }
  } catch (error) {
    toast.error('网络异常，请检查连接');
  } finally {
    registerLoading.value = false;
  }
}

</script>

<style scoped>
/* ==================== 页面布局 ==================== */
/* 整个页面容器 - 使用 Flexbox 实现水平垂直居中 */
.login-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 背景层 - 绝对定位，水平垂直居中 */
.login-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  pointer-events: none;
  background-color: #ffffff;
}

.login-background h1 {
  font-size: 768px;
  font-weight: bold;
  font-style: italic;
  color: #62d2a2;
  margin: 0;
  line-height: 1;
  user-select: none;
  letter-spacing: -20px;
}

/* ==================== 表单样式 ==================== */
/* 前景层 - 登录注册卡片容器 */
.login-register-container {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 40px;
  top: 30px;
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1450px;
  padding: 40px;
  text-align: center;
}

/* 表单区域通用样式 */
.form-div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  padding: 80px 100px;
  position: relative;
  z-index: 5;
}

/* 标题样式 */
.title {
  margin: 0 0 32px;
  font-size: 28px;
  font-weight: 600;
  color: #1fab89;
  letter-spacing: 1px;
}

/* 表单容器 */
.login-form,
.register-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 表单项组 */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

/* 表单标签 */
.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

/* 表单输入框样式由 shared.css 提供 */

/* 提交按钮样式由 shared.css 提供（.submit-button） */

/* 按钮加载图标容器 */
.btn-loading-icon {
  display: inline-flex;
  align-items: center;
}

/* 限制 loading.png 图片尺寸（登录页特定） */
.btn-loading-icon img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

/* 提交按钮样式由 shared.css 提供 */

/* ==================== 遮罩样式 ==================== */
/* 遮罩容器 - 用于拖动定位 */
.mask-ring-container {
  position: absolute;
  top: -30px;
  left: 70px; /* 左侧留出70px间距，增加呼吸感 */
  height: 100%;
  width: 40%; /* 使用百分比宽度 */
  z-index: 100;
  cursor: ew-resize;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

/* 遮罩背景层 - 完全遮挡并阻挡交互 */
.mask-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  z-index: 10;
  pointer-events: auto;
}

/* 手环状圆环容器 */
.ring-band {
  position: relative;
  width: 100%;
  height: calc(100% + 60px); /* 比卡片高，上下各超出30px */
  z-index: 10;
}
/* 圆环正面 - 薄型手环设计 */
.ring-front-face {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  opacity: 0.95;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 50px rgba(22, 160, 133, 0.75);
  /* mask裁剪左侧椭圆为透明区 */
  /* radial-gradient 生成椭圆蒙版：左侧中心的椭圆（50px半径）透明，外部不透明 */
  -webkit-mask: radial-gradient(
    ellipse 50px 50% at left center,
    transparent 0 99%,
    black 100%
  );
  mask: radial-gradient(
    ellipse 50px 50% at left center,
    transparent 0 99%,
    black 100%
  );
}

/* 独立左侧椭圆样式-下层椭圆 */
.ring-left-curve-down {
  gap: 40px;
  top: 30px; /* 与ring-band的上下超出一致 */
  position: relative;
  padding: 40px;
  left: 120px; /* 与遮罩主体左边缘对齐 */
  width: 100px; /* 弧形宽度 */
  height: var(--left-height, 100%); /* 与ring-band的高度完全一致 */
  background: #9df3c4;
  border: none;
  border-radius: 50%;
  transform-origin: right center;
  z-index: 1; /* 低于卡片的z-index: 2 */
  pointer-events: none; /* 避免阻挡表单交互 */
  overflow: hidden;
}

/* 圆环左侧透视部分-上层椭圆 - 竖向椭圆弧形 */
.ring-left-curve-up {
  position: absolute;
  top: 0;
  left: -50px; /* 向左延伸，体现环绕效果 */
  width: 100px; /* 弧形宽度 */
  height: 100%;
  background: transparent;
  border: none; /* 临时去掉边框，后续用伪元素补 */
  /* 椭圆弧形 */
  border-radius: 50%;
  transform-origin: right center;
  /* 降低z-index，让左侧弧形在相交区域显示在卡片下方 */
  z-index: 1;
  /* 被卡片遮挡的部分不显示 */
  overflow: hidden;
}

/* 圆环右侧透视部分 - 竖向椭圆弧形 */
.ring-right-curve {
  position: absolute;
  top: 0;
  right: -50px; /* 向右延伸，体现环绕效果 */
  width: 100px; /* 弧形宽度 */
  height: 100%;
  background: linear-gradient(135deg, #23c087 0%, #38ef7d 100%);
  opacity: 0.95;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 50px rgba(22, 160, 133, 0.75);
  /* 使用边框创造椭圆弧形效果 */
  border: none;
  /* 椭圆弧形 */
  border-radius: 50%;
  transform-origin: left center;
  /* 保持高z-index，显示在卡片上方 */
  z-index: 10;
  overflow: hidden;
  /* 创建右侧椭圆蒙版 */
  mask-image: linear-gradient(to right, transparent 0%, transparent 50%, #000 50%, #000 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, transparent 50%, #000 50%, #000 100%); /* 兼容 Safari/旧版 Chrome */
}

/* ==================== 文字样式 ==================== */
/* 文字容器样式 */
.text-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* 从顶部开始排列，替代原来的 center，让文字偏上 */
  gap: 120px;
  height: 100%;
  width: 100%;
  padding-top: 80px; /* 顶部内边距，整体上移文字区域 */
}

/* 遮罩上 chat 文字样式 */
.chat-text {
  margin: 0;
}

.chat-text span {
  font-size: 64px; /* 字号放大 */
  font-weight: bold; /* 加粗 */
  font-style: italic; /* 与背景chat文字风格统一 */
  color: #fff; /* 白色高对比度 */
  user-select: none; /* 禁止选中 */
  /* ========== 可选的动态发光效果 ========== */
  /* 选项1：柔和白色发光 */
  /* text-shadow:
    0 0 10px rgba(255, 255, 255, 0.8),
    0 0 20px rgba(255, 255, 255, 0.6),
    0 0 30px rgba(255, 255, 255, 0.4),
    0 0 40px rgba(98, 210, 162, 0.3); */
  /* 选项2：青绿色主题发光（与按钮渐变色一致） */
  /* text-shadow:
    0 0 10px rgba(56, 239, 125, 0.9),
    0 0 20px rgba(56, 239, 125, 0.7),
    0 0 30px rgba(56, 239, 125, 0.5),
    0 0 40px rgba(17, 153, 142, 0.4),
    0 0 50px rgba(17, 153, 142, 0.3); */
  /* 选项3：强烈霓虹发光效果 */
  /* text-shadow:
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #38ef7d,
    0 0 40px #38ef7d,
    0 0 80px #11998e; */
  /* 选项4：动态呼吸发光（柔和白光）（需要配合 @keyframes 动画） */
  animation: textGlow 2s ease-in-out infinite;
}

/* 如果需要使用动态呼吸发光效果，请启用以下代码 */
@keyframes textGlow {
  0%, 100% {
    text-shadow:
      0 0 10px rgba(255, 255, 255, 0.8),
      0 0 20px rgba(255, 255, 255, 0.6),
      0 0 30px rgba(98, 210, 162, 0.4);
  }
  50% {
    text-shadow:
      0 0 15px rgba(255, 255, 255, 1),
      0 0 30px rgba(255, 255, 255, 0.8),
      0 0 45px rgba(56, 239, 125, 0.6),
      0 0 60px rgba(56, 239, 125, 0.4);
  }
}

/* 遮罩上动态标题样式 - 带发光效果 */
/* 标题容器：相对定位，用于叠加文字 */
.dynamic-title {
  position: relative;
  height: 40px; /* 固定高度，防止抖动 */
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  /* 发光效果 - 与 chat 文字保持一致 */
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.7),
    0 0 16px rgba(255, 255, 255, 0.5),
    0 0 24px rgba(98, 210, 162, 0.3);
}

/* 文字项：绝对定位叠加，丝滑过渡 - 带发光效果 */
.text-item {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%); /* 基础居中 */
  opacity: 0;
  color: #fff;
  transition:
    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55); /* 回弹动画，和圆环同步 */
  white-space: nowrap;
  /* 发光效果 */
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.7),
    0 0 16px rgba(255, 255, 255, 0.5),
    0 0 24px rgba(98, 210, 162, 0.3);
}

/* 非激活状态默认偏移（右侧） */
.text-item:not(.active) {
  transform: translate(-50%, -50%) translateX(100px);
}

/* 激活状态：显示 + 居中 */
.text-item.active {
  opacity: 1;
  transform: translate(-50%, -50%) translateX(0);
}

/* 从左侧进入（向右拖动时，新文字从左顶替旧文字） */
.text-item.enter-from-left:not(.active) {
  transform: translate(-50%, -50%) translateX(-100px);
}

/* 从右侧进入（向左拖动时，新文字从右顶替旧文字） */
.text-item.enter-from-right:not(.active) {
  transform: translate(-50%, -50%) translateX(100px);
}
</style>

<!-- 注册成功弹窗样式（unscoped，ElMessageBox 渲染在 body 下） -->
<style>
.register-success-dialog {
  border-radius: 16px !important;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06) !important;
}

.register-success-dialog .el-message-box__header {
  padding: 22px 24px 12px;
  border-bottom: none;
}

.register-success-dialog .el-message-box__title {
  font-size: 17px;
  font-weight: 700;
  color: #333;
}

.register-success-dialog .el-message-box__content {
  padding: 0 24px 16px;
}

.register-success-dialog .el-message-box__btns {
  padding: 12px 24px 20px;
}

/* 注册成功卡片 */
.register-success-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
  padding: 8px 0;
  height: 100%;
}

.register-success-icon {
  font-size: 48px;
  line-height: 1;
}

.register-success-title {
  font-size: 18px;
  font-weight: 700;
  color: #11998e;
  letter-spacing: 0.5px;
}

.register-success-info {
  width: 100%;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 12px;
  padding: 4px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
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
  color: #333;
  font-weight: 600;
  word-break: break-all;
}

.account-value {
  font-size: 20px;
  letter-spacing: 2px;
  color: #11998e;
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

/* 按钮：对齐项目弹窗按钮视觉规范 */
.register-success-dialog .el-button--primary {
  background: rgba(56, 239, 125, 0.22);
  color: #333;
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  border-radius: 8px;
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.register-success-dialog .el-button--primary:hover {
  background: rgba(56, 239, 125, 0.35);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
  transform: translateY(-1px);
}
</style>
