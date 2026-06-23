/**
 * 交互群聊 ID 持久化管理
 * 记录用户申请过、加入过的群 ID，用于在用户不在群内时仍能查询历史通知和入群申请
 *
 * @module interactedGroups
 */

const INTERACTED_KEY = 'chat_interacted_groups';

/**
 * 加载持久化的交互群列表
 * @returns {Array<{ groupId: number, groupName: string }>}
 */
export function loadInteractedGroups() {
  try {
    const raw = localStorage.getItem(INTERACTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * 保存/合并一个群到交互列表
 * @param {number} groupId
 * @param {string} groupName
 */
export function addInteractedGroup(groupId, groupName) {
  const list = loadInteractedGroups();
  const existing = list.find(g => g.groupId === groupId);
  if (existing) {
    existing.groupName = groupName; // 更新群名（可能改名）
  } else {
    list.push({ groupId, groupName });
  }
  // 最多保留 50 个
  if (list.length > 50) list.splice(0, list.length - 50);
  try {
    localStorage.setItem(INTERACTED_KEY, JSON.stringify(list));
  } catch { /* 静默失败 */ }
}

/**
 * 批量合并群列表到交互列表（从 loadGroups 调用）
 * @param {Array<{ groupId: number, groupName: string }>} groups
 */
export function mergeInteractedGroups(groups) {
  if (!groups || groups.length === 0) return;
  const list = loadInteractedGroups();
  let changed = false;
  for (const g of groups) {
    const existing = list.find(x => x.groupId === g.groupId);
    if (existing) {
      if (existing.groupName !== g.groupName) { existing.groupName = g.groupName; changed = true; }
    } else {
      list.push({ groupId: g.groupId, groupName: g.groupName });
      changed = true;
    }
  }
  if (list.length > 50) list.splice(0, list.length - 50);
  if (changed) {
    try {
      localStorage.setItem(INTERACTED_KEY, JSON.stringify(list));
    } catch { /* 静默失败 */ }
  }
}
