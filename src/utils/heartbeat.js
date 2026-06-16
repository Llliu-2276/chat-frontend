/**
 * 心跳管理器
 * 定时发送心跳保持用户在线状态
 * 使用单例模式管理全局心跳
 * 
 * @module utils/heartbeat
 */
import { sendHeartbeat } from '@/api/heartbeat';

/**
 * 心跳管理器类
 * @class
 */
class HeartbeatManager {
  constructor() {
    this.timer = null;
    this.interval = 2 * 60 * 1000; // 2分钟
  }

  /**
   * 启动心跳
   * 先停止已有心跳，立即发送一次，然后定时发送
   */
  start() {
    // 先停止已有的心跳
    this.stop();

    // 立即发送一次
    this.send();

    // 定时发送
    this.timer = setInterval(() => {
      this.send();
    }, this.interval);

    console.log('心跳已启动');
  }

  /**
   * 停止心跳
   * 清除定时器并重置状态
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('心跳已停止');
    }
  }

  /**
   * 发送心跳
   * 静默失败，不影响用户体验
   */
  async send() {
    try {
      await sendHeartbeat();
    } catch (error) {
      console.error('心跳发送失败:', error);
    }
  }
}

// 创建单例导出
export const heartbeatManager = new HeartbeatManager();
