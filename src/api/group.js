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
 * 加入群聊（发送加群申请 — 审批制）
 * 同时通过 URL 查询参数（v2.4-v2.6 兼容）和请求体（v2.7+）传递 message，
 * 确保无论后端运行哪个版本都能正确收到申请留言。
 * @param {number} groupId - 群组ID
 * @param {Object} [data] - 可选参数
 * @param {string} [data.message] - 申请留言（最大200字符）
 * @returns {Promise} 返回加入结果（成功码 201），res.data 可能含 requestId
 */
export function joinGroup(groupId, data = {}) {
  return request({
    url: `/group/join/${groupId}`,
    method: 'POST',
    params: data,  // v2.4-v2.6: URL 查询参数（@RequestParam message）
    data: data,    // v2.7+: JSON 请求体（@RequestBody JoinGroupDTO）
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

/**
 * 查询入群申请列表（后端 v2.1，v2.7 放宽权限）
 * 群主：查看该群所有待处理申请；非群主：查看自己在该群的入群申请（不限状态）
 * @param {number} groupId - 群组ID
 * @param {Object} [params] - 可选分页参数
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=50] - 每页数量（默认50，避免遗漏非第一页的自己的申请）
 * @returns {Promise} 返回分页的入群申请列表
 */
export function getJoinRequests(groupId, params = { page: 1, size: 50 }) {
  return request({
    url: `/group/${groupId}/join-requests`,
    method: 'GET',
    params,
  });
}

/**
 * 查询群聊通知历史（后端 v2.0+）
 * @param {number} groupId - 群组ID
 * @param {Object} [params] - 可选参数
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=20] - 每页数量
 * @returns {Promise} 返回分页的群通知列表（成员加入/退出、群主转让等）
 */
export function getGroupNotifications(groupId, params) {
  return request({
    url: `/group/${groupId}/notifications`,
    method: 'GET',
    params,
  });
}
