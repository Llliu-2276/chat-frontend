/**
 * 群聊通知已读状态管理
 * 使用 localStorage 持久化 lastReadAt 时间戳，避免逐条存储通知的已读状态
 *
 * @module notificationReadState
 */

const NOTIF_READ_KEY = 'chat_notification_read_state';

/** @type {Date|null} 内存缓存，避免重复解析 localStorage */
let _cachedLastReadAt = null;

/**
 * 从 localStorage 加载已读状态
 * @returns {{ lastReadAt: string|null }}
 */
export function loadNotificationReadState() {
  try {
    const raw = localStorage.getItem(NOTIF_READ_KEY);
    if (!raw) return { lastReadAt: null };
    const parsed = JSON.parse(raw);
    return { lastReadAt: parsed.lastReadAt || null };
  } catch { return { lastReadAt: null }; }
}

/**
 * 保存已读状态到 localStorage
 * @param {{ lastReadAt: string|null }} state
 */
export function saveNotificationReadState(state) {
  try {
    localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(state));
  } catch { /* 静默失败 */ }
}

/**
 * 获取最后一次打开通知面板的时间
 * @returns {Date|null}
 */
export function getLastReadAt() {
  if (_cachedLastReadAt === null) {
    const state = loadNotificationReadState();
    _cachedLastReadAt = state.lastReadAt ? new Date(state.lastReadAt) : null;
  }
  return _cachedLastReadAt;
}

/**
 * 更新最后一次打开通知面板的时间（同时更新内存缓存和 localStorage）
 * @param {string} isoStr - ISO 8601 时间字符串
 */
export function updateLastReadAt(isoStr) {
  _cachedLastReadAt = new Date(isoStr);
  saveNotificationReadState({ lastReadAt: isoStr });
}

/**
 * 根据 sendTime 和 lastReadAt 计算通知是否已读
 * - 面板当前打开 → 已读（用户正在看）
 * - lastReadAt 为 null → 已读（首次访问，历史数据均为已读）
 * - sendTime <= lastReadAt → 已读（在上次打开面板之前产生）
 * - sendTime > lastReadAt → 未读（在上次打开面板之后新产生）
 * @param {string} sendTime - ISO 时间字符串
 * @param {boolean} [isPanelOpen=false] - 通知面板当前是否打开
 * @returns {boolean}
 */
export function computeIsRead(sendTime, isPanelOpen = false) {
  if (isPanelOpen) return true;
  const lastRead = getLastReadAt();
  if (!lastRead) return true;
  return new Date(sendTime) <= lastRead;
}
