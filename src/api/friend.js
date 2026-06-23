/**
 * 好友相关 API
 * 包含好友列表、消息收发、聊天记录等接口
 * 
 * @module api/friend
 */
import request from './request';

/**
 * 获取好友列表
 * @returns {Promise} 返回好友列表（含在线状态）
 */
export function getFriendList() {
  return request({
    url: '/friends/list',
    method: 'GET',
  });
}

/**
 * 获取未读消息
 * 调用后后端自动标记为已读
 * @returns {Promise} 返回未读消息列表
 */
export function getUnreadMessages() {
  return request({
    url: '/friends/messages/unread',
    method: 'GET',
  });
}

/**
 * 获取聊天记录（分页）
 * @param {number} friendId - 好友用户ID
 * @param {Object} params - { page, size }
 * @returns {Promise} 返回分页的聊天记录
 */
export function getChatHistory(friendId, params) {
  return request({
    url: `/friends/chat-history/${friendId}`,
    method: 'GET',
    params,
  });
}

/**
 * 发送消息
 * @param {Object} data - { receiverId, content }
 * @returns {Promise} 返回发送结果
 */
export function sendMessage(data) {
  return request({
    url: '/friends/send-message',
    method: 'POST',
    data,
  });
}

/**
 * 删除好友
 * @param {number} friendId - 好友用户ID
 * @returns {Promise} 返回删除结果
 */
export function deleteFriend(friendId) {
  return request({
    url: `/friends/remove/${friendId}`,
    method: 'DELETE',
  });
}

/**
 * 发起好友申请
 * @param {Object} data - { receiverId, message? }
 * @returns {Promise} 返回申请结果（成功码 201）
 */
export function sendFriendRequest(data) {
  return request({
    url: '/friends/request',
    method: 'POST',
    data,
  });
}

/**
 * 处理好友申请（同意/拒绝）
 * @param {Object} data - { requestId, accept }
 * @returns {Promise} 返回处理结果
 */
export function handleFriendRequest(data) {
  return request({
    url: '/friends/request/handle',
    method: 'POST',
    data,
  });
}

/**
 * 查询收到的好友申请
 * @param {Object} params - { status?, page?, size? }
 *   status: 0-待处理, 1-已同意, 2-已拒绝（默认0）
 * @returns {Promise} 返回分页的申请列表
 */
export function getReceivedRequests(params) {
  return request({
    url: '/friends/request/received',
    method: 'GET',
    params,
  });
}

/**
 * 查询发出的好友申请
 * @param {Object} params - { page?, size? }
 * @returns {Promise} 返回分页的申请列表
 */
export function getSentRequests(params) {
  return request({
    url: '/friends/request/sent',
    method: 'GET',
    params,
  });
}

/**
 * 撤回私聊消息（2分钟内，仅发送者）
 * @param {number} recordId - 消息记录ID
 * @returns {Promise} 返回撤回结果
 */
export function recallMessage(recordId) {
  return request({
    url: `/friends/message/${recordId}/recall`,
    method: 'POST',
  });
}

