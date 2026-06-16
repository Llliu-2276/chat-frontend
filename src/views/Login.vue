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
    <div class="login-register-container" ref="containerRef">
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
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

// 路由和用户状态
const router = useRouter();
const userStore = useUserStore();
const containerRef = ref(null);

// 注入全局 toast 和 loading
const toast = inject('toast');
const loading = inject('loading');

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
      // 显示成功提示
      toast.success('注册成功！请登录');
      // 清空注册表单
      registerForm.value = { userName: '', password: '', confirmPassword: '' };

      // 延迟500ms后移动遮罩，确保Toast已显示且用户能看到
      setTimeout(() => {
        /**
         * 注册成功后，将遮罩从注册区移动到登录区
         *
         * 重要：maskPosition的含义
         * - 0 = 遮罩在左侧（覆盖注册表单）→ 用户看到右侧的登录表单
         * - 1 = 遮罩在右侧（覆盖登录表单）→ 用户看到左侧的注册表单
         *
         * 注册成功后，用户需要登录，所以应该显示登录表单
         * 因此需要将遮罩移动到右侧（maskPosition = 1），覆盖登录表单
         * 这样用户就能看到并使用左侧的注册表单... 不对！
         *
         * 重新理解布局：
         * - HTML中：register-section在左（第13行），login-section在右（第59行）
         * - maskPosition = 0 时，遮罩在左侧，覆盖register-section
         * - maskPosition = 1 时，遮罩在右侧，覆盖login-section
         *
         * 注册成功后，应该显示login-section让用户登录
         * 所以遮罩应该移动到右侧（maskPosition = 1），覆盖login-section
         * 这样register-section可见但被清空，login-section被遮罩覆盖...
         *
         * 等等，这样逻辑不对！让我重新思考...
         * 实际上遮罩是用来“遮挡”不需要显示的表单的！
         * - maskPosition = 0：遮罩在左，遮挡注册表单，用户看到登录表单 ✅
         * - maskPosition = 1：遮罩在右，遮挡登录表单，用户看到注册表单 ✅
         *
         * 所以注册成功后，应该 maskPosition = 0，显示登录表单！
         */
        maskPosition.value = 0; // 移动到注册区，遮挡注册表单，显示登录表单
        dragDirection.value = 'left'; // 向左移动，从注册区移动到登录区
      }, 500);
    } else {
      toast.error(result.message || '注册失败，请重试');
    }
  } catch (error) {
    toast.error('网络异常，请检查连接');
  } finally {
    registerLoading.value = false;
  }
}

// ==================== 遮罩拖动相关状态 ====================
/**
 * maskPosition: 遮罩位置比例 (0 到 1 之间)
 * - 0 = 遮罩在左侧，覆盖注册表单，显示登录表单
 * - 1 = 遮罩在右侧，覆盖登录表单，显示注册表单
 * - 实际位移 = maskPosition * maskWidth
 */
const maskPosition = ref(0); // 初始位置：0 (注册区)
const isDragging = ref(false); // 是否正在拖动
const startX = ref(0); // 拖动开始时的鼠梱X坐标
const startPosition = ref(0); // 拖动开始时的maskPosition值
const containerWidth = ref(0); // 容器总宽度
const maskWidth = ref(0); // 遮罩层宽度（容器宽度的一半）

/**
 * dragDirection: 拖动方向，用于控制文字动画
 * - 'left' = 向左拖动，遮罩从右向左移动
 * - 'right' = 向右拖动，遮罩从左向右移动
 * - null = 无拖动（初始状态或点击切换）
 */
const dragDirection = ref(null);
// ==================== 遮罩样式计算 ====================
/**
 * maskStyle: 遮罩容器的动态样式
 * - transform: 根据maskPosition计算水平位移
 * - transition: 拖动时无过渡动画，非拖动时使用弹性动画
 */
const maskStyle = computed(() => ({
  // 水平位移 = 位置比例 × 遮罩宽度
  transform: `translateX(${maskPosition.value * maskWidth.value}px)`,
  // 拖动中禁用transition，实现实时跟随；松开后启用弹性动画
  transition: isDragging.value ? 'none' : 'transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
}));
// ==================== 拖动事件处理 ====================

/**
 * startDrag: 开始拖动
 * @param {MouseEvent|TouchEvent} e - 鼠标或触摸事件对象
 */
function startDrag(e) {
  isDragging.value = true;
  // 获取起始X坐标（兼容鼠标和触摸事件）
  startX.value = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
  startPosition.value = maskPosition.value;
  dragDirection.value = null; // 重置拖动方向，等待用户拖动

  // 添加全局事件监听
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchmove', onDrag);
  document.addEventListener('touchend', endDrag);
}
/**
 * onDrag: 拖动中处理
 * @param {MouseEvent|TouchEvent} e - 鼠标或触摸事件对象
 */
function onDrag(e) {
  if (!isDragging.value) return;

  // 获取当前X坐标
  const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
  const deltaX = currentX - startX.value;

  // 记录拖动方向：deltaX > 0 表示向右拖动，< 0 表示向左拖动
  dragDirection.value = deltaX > 0 ? 'right' : deltaX < 0 ? 'left' : dragDirection.value;

  // 计算位置变化比例（归一化到0-1范围）
  const deltaPosition = deltaX / maskWidth.value;

  // 限制拖动范围在 0-1 之间，防止超出边界
  maskPosition.value = Math.max(0, Math.min(1, startPosition.value + deltaPosition));
}
/**
 * endDrag: 结束拖动 - 吸附到最近的位置
 */
function endDrag() {
  isDragging.value = false;
  // 计算吸附阈值（中点位置）
  const threshold = (containerWidth.value / 2 - maskWidth.value / 2) / maskWidth.value;

  if (maskPosition.value > threshold) {
    // 超过中点，吸附到登录区域（右侧）
    maskPosition.value = 1;
    // 如果没有拖动方向（点击切换），默认为向右拖动
    dragDirection.value = dragDirection.value || 'right';
  } else {
    // 未超过中点，吸附到注册区域（左侧）
    maskPosition.value = 0;
    // 如果没有拖动方向，默认为向左拖动
    dragDirection.value = dragDirection.value || 'left';
  }

  // 移除事件监听器
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', endDrag);
}
/**
 * leftCurveStyle: 左侧椭圆的同步样式（与遮罩联动）
 * 确保左侧椭圆跟随遮罩一起移动，保持视觉连贯性
 */
const leftCurveStyle = computed(() => ({
  // 与遮罩使用相同的位移计算
  transform: `translateX(${maskPosition.value * maskWidth.value}px)`,
  // 与遮罩使用相同的过渡动画
  transition: isDragging.value ? 'none' : 'transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
}));

// 获取上层椭圆的高
const leftCurveStyleUpHeight = ref(0);

// ==================== 生命周期钩子 ====================
onMounted(() => {
  // 获取容器和遮罩宽度
  if (containerRef.value) {
    containerWidth.value = containerRef.value.offsetWidth;
    // 遮罩宽度是容器宽度的一半（因为 width: 50%）
    maskWidth.value = containerWidth.value / 2;
  }

  const leftCurveStyleUp = document.querySelector('.ring-left-curve-up');
  if (leftCurveStyleUp) {
    // 读取 ref 数值 + 正确拼接单位
    leftCurveStyleUpHeight.value = leftCurveStyleUp.offsetHeight;
    // 把自定义属性挂载到组件根元素（或 :root），解决 scoped 作用域问题
    document.querySelector('.login-page').style.setProperty('--left-height', `${leftCurveStyleUpHeight.value}px`);
  }

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
});

/**
 * handleResize: 处理窗口大小变化
 * 重新计算容器和遮罩宽度
 */
function handleResize() {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.offsetWidth;
    maskWidth.value = containerWidth.value / 2;
  }
  // 重新计算左上椭圆高度并更新自定义属性
  const leftCurveStyleUp = document.querySelector('.ring-left-curve-up');
  if (leftCurveStyleUp) {
    leftCurveStyleUpHeight.value = leftCurveStyleUp.offsetHeight;
    document.querySelector('.login-page').style.setProperty('--left-height', `${leftCurveStyleUpHeight.value}px`);
  }
}

// 组件销毁前，移除事件监听器
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', endDrag);
  window.removeEventListener('resize', handleResize);
});
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
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.05);
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
