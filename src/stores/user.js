/**
 * 用户状态管理
 * 管理用户登录、注册、登出、用户信息等状态
 * 
 * @module stores/user
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as loginApi, register as registerApi, logout as logoutApi } from '@/api/auth';
import { getCurrentUser } from '@/api/user';
import { setToken, removeToken, setUserInfo, removeUserInfo, getUserInfo } from '@/utils/storage';
import { heartbeatManager } from '@/utils/heartbeat';
import { wsManager } from '@/utils/websocket';
import router from '@/router';

export const useUserStore = defineStore('user', () => {
  // ==================== 状态 ====================
  /** @type {import('vue').Ref<Object|null>} 用户信息 */
  const userInfo = ref(getUserInfo() || null);
  /** @type {import('vue').Ref<string>} 用户 Token */
  const token = ref('');

  // ==================== 计算属性 ====================
  /** 是否已登录 */
  const isLoggedIn = computed(() => !!token.value);
  /** 用户 ID */
  const userId = computed(() => userInfo.value?.userId || null);
  /** 用户名 */
  const userName = computed(() => userInfo.value?.userName || '');
  /** 用户账号 */
  const userAccount = computed(() => userInfo.value?.userAccount || '');

  /**
   * 用户登录
   * @param {Object} loginData - 登录信息 { userAccount, password }
   * @returns {Promise<Object>} { success, data?, message? }
   */
  async function login(loginData) {
    try {
      const response = await loginApi(loginData);

      // 保存 Token 和用户信息
      const userData = response.data;
      token.value = userData.token;
      userInfo.value = userData;

      setToken(userData.token);
      setUserInfo(userData);

      // 启动心跳
      heartbeatManager.start();

      // 建立 WebSocket 连接
      wsManager.connect();

      console.log('登录成功');
      return { success: true, data: userData };
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 用户注册
   * @param {Object} registerData - 注册信息 { userName, password }
   * @returns {Promise<Object>} { success, data?, message? }
   */
  async function register(registerData) {
    try {
      const response = await registerApi(registerData);
      console.log('注册成功，用户ID:', response.data.userId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 用户登出
   * 调用后端接口并清除本地状态
   */
  async function logout() {
    try {
      // 调用后端登出接口
      await logoutApi();
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      // 无论成功失败，都清除本地状态
      clearUserState();

      // 跳转到登录页
      await router.push('/login');
    }
  }

  /**
   * 获取当前用户信息
   * @returns {Promise<Object>} { success, data?, message? }
   */
  async function fetchUserInfo() {
    try {
      const response = await getCurrentUser();
      userInfo.value = response.data;
      setUserInfo(response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 更新用户信息
   * @param {Object} newData - 新的用户信息
   */
  function updateUserInfo(newData) {
    userInfo.value = { ...userInfo.value, ...newData };
    setUserInfo(userInfo.value);
  }

  /**
   * 清除用户状态
   * 清除内存和 localStorage 中的数据，停止心跳
   */
  function clearUserState() {
    token.value = '';
    userInfo.value = null;
    removeToken();
    removeUserInfo();
    heartbeatManager.stop();
    wsManager.disconnect();
  }

  /**
   * 初始化用户状态（从本地存储恢复）
   * 应用启动时调用，恢复登录状态
   */
  function initUserState() {
    const savedToken = localStorage.getItem('chat_token');
    const savedUserInfo = getUserInfo();

    if (savedToken && savedUserInfo) {
      token.value = savedToken;
      userInfo.value = savedUserInfo;
      // 启动心跳
      heartbeatManager.start();
      // 建立 WebSocket 连接
      wsManager.connect();
    }
  }

  return {
    // 状态
    userInfo,
    token,
    // 计算属性
    isLoggedIn,
    userId,
    userName,
    userAccount,
    // 方法
    login,
    register,
    logout,
    fetchUserInfo,
    updateUserInfo,
    clearUserState,
    initUserState,
  };
});
