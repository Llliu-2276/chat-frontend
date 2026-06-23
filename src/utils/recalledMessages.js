/**
 * 已撤回消息持久化管理
 *
 * 后端软删除已撤回消息，REST 历史接口不返回被撤回的消息。
 * 前端自行持久化撤回记录的完整元数据，用于 loadChatHistory 时合成占位气泡。
 *
 * 数据结构（v2）：
 *   Array<{ recordId, senderId, senderName, sendTime, chatType: 'friend'|'group', targetId }>
 *
 * 兼容 v1 旧格式（纯数字 recordId 数组），自动转换为 v2。
 *
 * @module recalledMessages
 */

const RECALLED_KEY = 'chat_recalled_messages';

/**
 * 加载所有已撤回记录
 * @returns {Array<{ recordId: number, senderId: number, senderName: string, sendTime: string, chatType: string, targetId: number }>}
 */
export function loadRecalledEntries() {
  try {
    const raw = localStorage.getItem(RECALLED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 兼容 v1 旧格式：纯数字数组 → 转为 v2 格式（元数据缺省）
    if (parsed.length > 0 && typeof parsed[0] === 'number') {
      return parsed.map(id => ({
        recordId: id,
        senderId: 0,
        senderName: '',
        sendTime: '',
        chatType: '',
        targetId: 0,
      }));
    }
    return parsed;
  } catch { return []; }
}

/**
 * 持久化已撤回记录列表
 * @param {Array} entries
 */
function _saveEntries(entries) {
  try {
    // 最多保留 500 条
    const trimmed = entries.length > 500 ? entries.slice(entries.length - 500) : entries;
    localStorage.setItem(RECALLED_KEY, JSON.stringify(trimmed));
  } catch { /* 静默失败 */ }
}

/**
 * 添加一条撤回记录（完整元数据）
 * @param {{ recordId: number, senderId: number, senderName: string, sendTime: string, chatType: string, targetId: number }} entry
 */
export function addRecalledMessage(entry) {
  if (!entry || !entry.recordId) return;
  const entries = loadRecalledEntries();
  if (entries.some(e => e.recordId === entry.recordId)) return;
  entries.push(entry);
  _saveEntries(entries);
}

/**
 * 批量添加撤回记录
 * @param {Array} newEntries
 */
export function addRecalledMessages(newEntries) {
  if (!newEntries || newEntries.length === 0) return;
  const entries = loadRecalledEntries();
  const existing = new Set(entries.map(e => e.recordId));
  let changed = false;
  for (const e of newEntries) {
    if (!existing.has(e.recordId)) {
      entries.push(e);
      existing.add(e.recordId);
      changed = true;
    }
  }
  if (changed) _saveEntries(entries);
}

/**
 * 添加一条撤回记录（简化版，兼容旧调用方）
 * 优先使用 addRecalledMessage 以存储完整元数据
 * @param {number} recordId
 */
export function addRecalledId(recordId) {
  if (!recordId) return;
  const entries = loadRecalledEntries();
  if (entries.some(e => e.recordId === recordId)) return;
  entries.push({
    recordId,
    senderId: 0,
    senderName: '',
    sendTime: '',
    chatType: '',
    targetId: 0,
  });
  _saveEntries(entries);
}

/**
 * 查询某个聊天下所有已撤回消息的元数据
 * @param {string} chatType - 'friend' | 'group'
 * @param {number} targetId - friendId 或 groupId
 * @returns {Array<{ recordId: number, senderId: number, senderName: string, sendTime: string }>}
 */
export function getRecalledEntriesForChat(chatType, targetId) {
  if (!chatType || !targetId) return [];
  return loadRecalledEntries().filter(e =>
    e.chatType === chatType && e.targetId === targetId
  );
}

/**
 * 检查某个 recordId 是否在撤回记录中
 * @param {number} recordId
 * @returns {boolean}
 */
export function isRecalled(recordId) {
  if (!recordId) return false;
  return loadRecalledEntries().some(e => e.recordId === recordId);
}
