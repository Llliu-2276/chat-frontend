/**
 * 认证相关 API
 * 包含登录、注册、登出接口
 * 
 * @module api/auth
 */
import request from './request';

/**
 * 用户登录
 * @param {Object} data - 登录信息 { userAccount, password }
 * @returns {Promise} 返回用户信息和 Token
 */
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'POST',
    data,
  });
}

/**
 * 用户注册
 * @param {Object} data - 注册信息 { userName, password }
 * @returns {Promise} 返回用户 ID
 */
export function register(data) {
  return request({
    url: '/auth/register',
    method: 'POST',
    data,
  });
}

/**
 * 用户登出
 * @returns {Promise}
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'POST',
  });
}
