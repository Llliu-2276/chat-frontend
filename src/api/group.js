/**
 * 群组相关 API
 * 包含群聊创建、列表、详情、解散/退出、消息收发、聊天记录、成员列表等接口
 *
 * @module api/group
 */
import request from './request';

/**
 * 创建群聊
 * @param {Object} data - { groupName }
 * @returns {Promise} 返回群组信息
 */
export function createGroup(data) {
  return request({
    url: '/group/create',
    method: 'POST',
    data,
  });
}

/**
 * 获取群聊列表
 * @returns {Promise} 返回群组列表
 */
export function getGroupList() {
  return request({
    url: '/group/list',
    method: 'GET',
  });
}

/**
 * 获取群聊详情（含成员列表）
 * @param {number} groupId - 群组ID
 * @returns {Promise} 返回群组详情+成员列表
 */
export function getGroupInfo(groupId) {
  return request({
    url: `/group/info/${groupId}`,
    method: 'GET',
  });
}

/**
 * 解散或退出群聊
 * 群主操作解散，非群主操作退出
 * @param {number} groupId - 群组ID
 * @returns {Promise} 返回操作结果
 */
export function dissolveOrLeaveGroup(groupId) {
  return request({
    url: `/group/${groupId}`,
    method: 'DELETE',
  });
}

/**
 * 发送群聊消息
 * @param {Object} data - { groupId, content }
 * @returns {Promise} 返回发送结果（成功码 201）
 */
export function sendGroupMessage(data) {
  return request({
    url: '/group/message',
    method: 'POST',
    data,
  });
}

/**
 * 获取群聊天记录（分页）
 * @param {number} groupId - 群组ID
 * @param {Object} params - { page, size }
 * @returns {Promise} 返回分页的群聊记录
 */
export function getGroupHistory(groupId, params) {
  return request({
    url: `/group/history/${groupId}`,
    method: 'GET',
    params,
  });
}

/**
 * 获取群成员列表
 * @param {number} groupId - 群组ID
 * @returns {Promise} 返回成员列表
 */
export function getGroupMembers(groupId) {
  return request({
    url: `/group/members/${groupId}`,
    method: 'GET',
  });
}

/**
 * 搜索群聊（按群名或群账号模糊匹配）
 * @param {Object} params - { keyword, page?, size? }
 * @returns {Promise} 返回分页的群聊搜索结果
 */
export function searchGroups(params) {
  return request({
    url: '/group/search',
    method: 'GET',
    params,
  });
}

/**
 * 加入群聊（发送加群申请）
 * @param {number} groupId - 群组ID
 * @param {Object} [data] - 可选请求体
 * @param {string} [data.message] - 申请留言
 * @returns {Promise} 返回加入结果（成功码 201）
 */
export function joinGroup(groupId, data = {}) {
  return request({
    url: `/group/join/${groupId}`,
    method: 'POST',
    data,
  });
}

/**
 * 处理加群申请（群主审批 — 后端 v2.1）
 * @param {number} groupId - 群组ID
 * @param {Object} data - { requestId, accept }
 * @returns {Promise} 返回处理结果
 */
export function handleJoinRequest(groupId, data) {
  return request({
    url: `/group/${groupId}/join-request/${data.requestId}/handle`,
    method: 'POST',
    data: { requestId: data.requestId, accept: data.accept },
  });
}
