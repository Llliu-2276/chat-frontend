/**
 * 心跳相关 API
 * 用于保持用户在线状态
 * 
 * @module api/heartbeat
 */
import request from './request';

/**
 * 发送心跳
 * @returns {Promise}
 */
export function sendHeartbeat() {
  return request({
    url: '/user/heartbeat',
    method: 'POST',
  });
}
