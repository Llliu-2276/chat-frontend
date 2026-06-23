/**
 * 本地存储工具
 * 统一管理 Token 和用户信息的 localStorage 操作
 * 
 * @module utils/storage
 */

// 存储键名常量
const TOKEN_KEY = 'chat_token';
const USER_INFO_KEY = 'chat_user_info';

/**
 * 保存 Token
 * @param {string} token - JWT Token 字符串
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 获取 Token
 * @returns {string|null} Token 字符串，不存在时返回 null
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 移除 Token
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 保存用户信息
 * @param {Object} userInfo - 用户信息对象
 */
export function setUserInfo(userInfo) {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
}

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息对象，不存在时返回 null
 */
export function getUserInfo() {
  const userInfo = localStorage.getItem(USER_INFO_KEY);
  return userInfo ? JSON.parse(userInfo) : null;
}

/**
 * 移除用户信息
 */
export function removeUserInfo() {
  localStorage.removeItem(USER_INFO_KEY);
}

