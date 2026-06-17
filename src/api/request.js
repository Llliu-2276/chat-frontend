/**
 * Axios 请求封装
 * 包含请求拦截器、响应拦截器、错误处理
 * 
 * @module api/request
 */
import axios from 'axios';
import { getToken, removeToken, removeUserInfo } from '@/utils/storage';
import { heartbeatManager } from '@/utils/heartbeat';
import { wsManager } from '@/utils/websocket';
import router from '@/router';

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000, // 请求超时时间 10秒
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 添加 Token 到请求头
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  },
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data;

    // 后端统一返回格式: { code, message, data }
    // 成功码：200(成功) 201(创建) 202(已接受) 204(无内容) 206(部分内容)
    if (res.code === 200 || res.code === 201 || res.code === 202 || res.code === 204 || res.code === 206) {
      return res;
    } else if (res.code === 401) {
      // Token 过期或未授权，跳转到登录页
      console.error('未授权，跳转到登录页');
      handleUnauthorized();
      return Promise.reject(new Error(res.message || '未授权'));
    } else {
      // 其他业务错误
      console.error('业务错误:', res.message);
      return Promise.reject(new Error(res.message || '请求失败'));
    }
  },
  (error) => {
    // HTTP 错误处理
    if (error.response) {
      const status = error.response.status;
      const errMsg = error.response.data?.message || '';
      switch (status) {
        case 400:
          console.error('请求参数错误:', errMsg);
          break;
        case 401:
          handleUnauthorized();
          break;
        case 403:
          console.error('权限不足:', errMsg);
          break;
        case 404:
          console.error('请求资源不存在:', errMsg);
          break;
        case 405:
          console.error('请求方法不允许');
          break;
        case 409:
          console.error('数据冲突:', errMsg);
          break;
        case 415:
          console.error('不支持的媒体类型');
          break;
        case 429:
          console.error('请求过于频繁，请稍后再试');
          break;
        case 500:
          console.error('服务器内部错误:', errMsg);
          break;
        case 502:
          console.error('网关错误，后端服务可能未启动');
          break;
        case 503:
          console.error('服务暂不可用');
          break;
        case 504:
          console.error('网关超时');
          break;
        default:
          console.error(`网络错误: ${status}`, errMsg);
      }
      // 优先使用后端返回的错误消息，降级到 HTTP 状态描述
      const message = errMsg || error.message || '网络错误';
      return Promise.reject(new Error(message));
    } else if (error.code === 'ECONNABORTED') {
      console.error('请求超时');
      return Promise.reject(new Error('请求超时，请稍后重试'));
    } else {
      console.error('网络错误:', error.message);
      return Promise.reject(new Error('网络连接失败，请检查网络'));
    }
    return Promise.reject(new Error('未知错误'));
  },
);

/**
 * 处理未授权情况
 * 清除本地存储、停止心跳、断开 WebSocket 并跳转到登录页
 * 与后端文档同步：401 场景必须完整清除所有认证状态
 */
function handleUnauthorized() {
  // 清除本地存储
  removeToken();
  removeUserInfo();

  // 停止心跳和 WebSocket（与 useUserStore.clearUserState 保持一致）
  heartbeatManager.stop();
  wsManager.disconnect();

  // 跳转到登录页
  if (router.currentRoute.value.path !== '/login') {
    router.push({
      path: '/login',
      query: { redirect: router.currentRoute.value.fullPath },
    });
  }
}

export default service;
