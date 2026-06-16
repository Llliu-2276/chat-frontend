/**
 * WebSocket 管理器（单例）
 * 负责连接生命周期、自动重连、事件分发
 *
 * @module utils/websocket
 */
import { useUserStore } from '@/stores/user';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectCount = 0;
    this.maxReconnect = 10;
    this.reconnectDelay = 3000;
    /** @type {Map<string, Function[]>} */
    this.listeners = new Map();
    this.manuallyClosed = false;
  }

  /**
   * 建立 WebSocket 连接
   * 本地开发: ws://localhost:8080/ws/chat?token={JWT}
   * 生产/内网穿透: 根据当前页面域名自动推导 wss://yourdomain/ws/chat?token={JWT}
   */
  connect() {
    const userStore = useUserStore();
    const token = userStore.token;
    if (!token) {
      console.warn('[WebSocket] 无 Token，跳过连接');
      return;
    }

    this.manuallyClosed = false;

    // 从环境变量获取 WS 地址
    const wsEnvUrl = import.meta.env.VITE_WS_URL || '/ws/chat';
    let wsUrl;

    if (wsEnvUrl.startsWith('ws://') || wsEnvUrl.startsWith('wss://')) {
      // 绝对地址（本地开发环境）
      wsUrl = `${wsEnvUrl}?token=${token}`;
    } else {
      // 相对地址（生产/内网穿透）：根据当前页面协议自动推导
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}${wsEnvUrl}?token=${token}`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WebSocket] 已连接');
      this.reconnectCount = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.emit(msg.type, msg);
      } catch (e) {
        console.error('[WebSocket] 消息解析失败:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] 连接已关闭');
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('[WebSocket] 连接错误:', err);
    };
  }

  /**
   * 主动断开连接（登出时调用）
   */
  disconnect() {
    this.manuallyClosed = true;
    this.clearReconnectTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.reconnectCount = 0;
  }

  /**
   * 发送消息
   * @param {Object} data - 消息对象 { type, ... }
   */
  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    console.warn('[WebSocket] 连接未就绪，消息未发送');
    return false;
  }

  /**
   * 订阅消息类型
   * @param {string} type - 消息类型
   * @param {Function} callback - 回调函数
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  /**
   * 取消订阅
   * @param {string} type
   * @param {Function} callback
   */
  off(type, callback) {
    if (this.listeners.has(type)) {
      const cbs = this.listeners.get(type).filter(cb => cb !== callback);
      this.listeners.set(type, cbs);
    }
  }

  /**
   * 事件分发
   * @param {string} type
   * @param {Object} data
   */
  emit(type, data) {
    const cbs = this.listeners.get(type) || [];
    cbs.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error(`[WebSocket] 回调执行错误 [${type}]:`, e);
      }
    });
  }

  /**
   * 连接是否活跃（已建立）
   */
  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 连接是否正在建立中
   */
  get isConnecting() {
    return this.ws?.readyState === WebSocket.CONNECTING;
  }

  /**
   * 调度重连
   */
  scheduleReconnect() {
    if (this.reconnectCount >= this.maxReconnect) {
      console.warn('[WebSocket] 已达最大重连次数，停止重连');
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectCount++;
      console.log(`[WebSocket] 尝试重连 (${this.reconnectCount}/${this.maxReconnect})`);
      this.connect();
    }, this.reconnectDelay);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// 单例导出
export const wsManager = new WebSocketManager();
