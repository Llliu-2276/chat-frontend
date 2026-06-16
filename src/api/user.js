/**
 * 用户相关 API
 * 包含用户资料管理、搜索、在线状态等接口
 * 
 * @module api/user
 */
import request from './request';

/**
 * 获取当前用户信息
 * @returns {Promise} 返回用户信息
 */
export function getCurrentUser() {
  return request({
    url: '/user/profile/me',
    method: 'GET',
  });
}

/**
 * 根据 ID 获取用户信息
 * @param {number} userId - 用户 ID
 * @returns {Promise} 返回用户信息
 */
export function getUserById(userId) {
  return request({
    url: `/user/profile/info/${userId}`,
    method: 'GET',
  });
}

/**
 * 修改用户名
 * @param {Object} data - { userName }
 * @returns {Promise} 返回更新后的用户信息
 */
export function updateUserName(data) {
  return request({
    url: '/user/profile/info',
    method: 'PUT',
    data,
  });
}

/**
 * 修改密码
 * @param {Object} data - { oldPassword, newPassword }
 * @returns {Promise}
 */
export function changePassword(data) {
  return request({
    url: '/user/profile/password/change',
    method: 'POST',
    data,
  });
}

/**
 * 搜索用户
 * @param {Object} params - { keyword, page, size }
 * @returns {Promise} 返回分页的用户列表
 */
export function searchUsers(params) {
  return request({
    url: '/user/search',
    method: 'GET',
    params,
  });
}

/**
 * 获取在线用户数量
 * @returns {Promise} 返回在线人数
 */
export function getOnlineCount() {
  return request({
    url: '/user/search/count',
    method: 'GET',
  });
}
