/**
 * 好友列表管理 Composable
 * 负责好友列表状态、选择好友、加载列表、在线状态更新、
 * 未读消息轮询，以及好友相关的 WebSocket 事件处理
 *
 * @module composables/useFriendList
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { getFriendList, getUnreadMessages } from '@/api/friend';
import { getGroupList, getGroupNotifications, getGroupUnreadCount } from '@/api/group';
import { getLastReadAt, updateLastReadAt, computeIsRead } from '@/utils/notificationReadState';
import { loadInteractedGroups, mergeInteractedGroups } from '@/utils/interactedGroups';
import { wsManager } from '@/utils/websocket';

// ==================== 群聊未读持久化 ====================
const GROUP_UNREAD_KEY = 'chat_group_unread';

/** 从 localStorage 读取群聊未读计数 */
function loadGroupUnreadCache() {
  try {
    const raw = localStorage.getItem(GROUP_UNREAD_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** 将群聊未读计数写入 localStorage */
function saveGroupUnreadCache(groups) {
  try {
    const map = {};
    for (const g of groups) {
      if (g.unreadCount > 0) map[g.groupId] = g.unreadCount;
    }
    localStorage.setItem(GROUP_UNREAD_KEY, JSON.stringify(map));
  } catch { /* 静默失败 */ }
}

/**
 * 好友列表管理
 * @param {Object} toast - Toast 通知对象
 */
export function useFriendList(toast) {
  // ==================== 状态 ====================
  const friends = ref([]);
  const groups = ref([]);
  const loadingFriends = ref(false);
  const chatTarget = ref(null);
  const chatType = ref('friend');
  const mobileView = ref('list');
  const activeView = ref('chat'); // 'chat' | 'notifications'

  // 收展状态
  const friendsExpanded = ref(true);
  const groupsExpanded = ref(true);
  const notificationsExpanded = ref(true);

  // 群聊通知列表（群成员加入/退出事件）
  const groupNotifications = ref([]);

  // ==================== 收展操作 ====================
  function toggleFriends() { friendsExpanded.value = !friendsExpanded.value; }
  function toggleGroups() { groupsExpanded.value = !groupsExpanded.value; }
  function toggleNotifications() { notificationsExpanded.value = !notificationsExpanded.value; }

  /** 通知已读判断委托给 notificationReadState.computeIsRead */

  // ==================== 好友/群聊选择 ====================
  /**
   * 选择好友进行聊天
   * 重置消息状态并加载聊天记录
   * @param {Object} friend - 好友对象
   */
  function onSelectFriend(friend) {
    chatTarget.value = friend;
    chatType.value = 'friend';
    activeView.value = 'chat';
    mobileView.value = 'chat';
  }

  /**
   * 选择群聊进行聊天
   * @param {Object} group - 群聊对象
   */
  function onSelectGroup(group) {
    chatTarget.value = group;
    chatType.value = 'group';
    activeView.value = 'chat';
    mobileView.value = 'chat';
    // 从服务器获取精确未读数，减少 localStorage 缓存依赖
    getGroupUnreadCount(group.groupId).then(res => {
      if (res.code === 200 && res.data != null) {
        const g = groups.value.find(x => x.groupId === group.groupId);
        if (g) { g.unreadCount = res.data; saveGroupUnreadCache(groups.value); }
      }
    }).catch(() => { /* 静默失败，localStorage 缓存兜底 */ });
  }

  // ==================== 数据加载 ====================
  /**
   * 加载好友列表
   * 后端 v1.9+ 直接在列表响应中返回 lastMessage/lastMessageTime/unreadCount，无需 N+1 查询
   * 后端 v2.2+ 支持分页，响应格式为 { content: [...], ... }，需兼容
   * @param {Object} [options] - 可选配置
   * @param {boolean} [options.silent=false] - 是否静默失败（后台轮询用）
   */
  async function loadFriends({ silent = false } = {}) {
    loadingFriends.value = true;
    try {
      const res = await getFriendList();
      if (res.code === 200) {
        // 后端 v2.2+ 返回分页包装 { content: [...], ... }，v1.x 返回纯数组
        const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        friends.value = list.map(f => {
          const existing = friends.value.find(old => old.userId === f.userId);
          return {
            ...f,
            // 后端已返回这些字段（v1.9+），保留已有值作为降级
            lastMessage: f.lastMessage || existing?.lastMessage || '',
            lastMessageTime: f.lastMessageTime || existing?.lastMessageTime || '',
            unreadCount: f.unreadCount ?? existing?.unreadCount ?? 0,
          };
        });
      } else if (!silent) {
        toast.error(res.message || '加载好友列表失败，请刷新重试');
      }
    } catch (e) {
      console.error('加载好友列表失败:', e);
      if (!silent) toast.error('网络异常，加载好友列表失败');
    }
    finally { loadingFriends.value = false; }
  }

  /**
   * 轮询获取未读消息
   * 更新好友列表中的未读计数和最后一条消息
   * @param {Object} [options] - 可选配置
   * @param {boolean} [options.silent=false] - 是否静默失败（后台轮询用）
   */
  async function fetchUnreadMessages({ silent = false } = {}) {
    try {
      const res = await getUnreadMessages();
      if (res.code === 200 && res.data?.length > 0) {
        const unreadMap = {};
        res.data.forEach(msg => {
          if (!unreadMap[msg.senderId]) unreadMap[msg.senderId] = [];
          unreadMap[msg.senderId].push(msg);
        });

        Object.entries(unreadMap).forEach(([senderId, msgs]) => {
          const friend = friends.value.find(f => f.userId === Number(senderId));
          if (friend) {
            friend.unreadCount = (friend.unreadCount || 0) + msgs.length;
            const latest = msgs.reduce((a, b) => (a.sendTime > b.sendTime ? a : b));
            if (!friend.lastMessageTime || latest.sendTime > friend.lastMessageTime) {
              friend.lastMessage = latest.content;
              friend.lastMessageTime = latest.sendTime;
            }
          }
        });
      } else if (res.code !== 200 && !silent) {
        // 非200响应（非后台轮询场景）提示用户
        toast.error(res.message || '获取未读消息失败');
      }
    } catch (e) {
      console.error('获取未读消息失败:', e);
      if (!silent) toast.error('网络异常，获取未读消息失败');
    }
  }

  /**
   * 加载群聊列表
   * 后端 v1.9+ 直接在列表响应中返回 lastMessage/lastMessageTime/unreadCount，无需 N+1 查询
   * 后端 v2.2+ 支持分页，响应格式为 { content: [...], ... }，需兼容
   * @param {Object} [options] - 可选配置
   * @param {boolean} [options.silent=false] - 是否静默失败（后台/WS触发用）
   */
  async function loadGroups({ silent = false } = {}) {
    try {
      const res = await getGroupList();
      if (res.code === 200) {
        // 后端 v2.2+ 返回分页包装 { content: [...], ... }，v1.x 返回纯数组
        const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        // 读本地未读缓存，与后端数据合并
        const unreadCache = loadGroupUnreadCache();
        groups.value = list.map(g => {
          const existing = groups.value.find(old => old.groupId === g.groupId);
          const cachedUnread = unreadCache[g.groupId] || 0;
          // 格式化 lastMessage：若后端未拼接发送者名称前缀，且提供了 lastMessageSenderName，则补充
          let formattedLastMessage = g.lastMessage || '';
          if (formattedLastMessage && !formattedLastMessage.includes(': ') && g.lastMessageSenderName) {
            formattedLastMessage = g.lastMessageSenderName + ': ' + formattedLastMessage;
          }
          return {
            ...g,
            // 后端已返回这些字段（v1.9+），保留已有值作为降级，持久化兜底
            lastMessage: formattedLastMessage || existing?.lastMessage || '',
            lastMessageTime: g.lastMessageTime || existing?.lastMessageTime || '',
            unreadCount: g.unreadCount ?? existing?.unreadCount ?? cachedUnread,
          };
        });
        // 按最新消息时间降序排列
        groups.value.sort((a, b) => {
          const ta = a.lastMessageTime || a.createDate || '';
          const tb = b.lastMessageTime || b.createDate || '';
          return tb.localeCompare(ta);
        });
        // 同步到交互群列表，确保用户退出群聊后仍能查询历史通知
        mergeInteractedGroups(groups.value);
        // 同步群通知中的群名（WS 消息可能不含 groupName）
        syncNotificationGroupNames();
      } else if (!silent) {
        toast.error(res.message || '加载群聊列表失败，请刷新重试');
      }
    } catch (e) {
      console.error('加载群聊列表失败:', e);
      if (!silent) toast.error('网络异常，加载群聊列表失败');
    }
  }

  // ==================== WebSocket 事件处理 ====================
  /** 处理好友上线通知 */
  function handleWsFriendOnline(msg) {
    const friend = friends.value.find(f => f.userId === msg.senderId);
    if (friend) friend.isOnline = true;
  }

  /** 处理好友下线通知 */
  function handleWsFriendOffline(msg) {
    const friend = friends.value.find(f => f.userId === msg.senderId);
    if (friend) friend.isOnline = false;
  }

  /**
   * 处理收到的私聊消息（仅更新好友列表侧的状态）
   * - 当前聊天对象 → 清除未读计数
   * - 非当前聊天对象 → 增加未读计数
   */
  function handleWsIncomingMessage(msg) {
    const { senderId } = msg;
    const isCurrentChat = chatTarget.value?.userId === senderId && chatType.value === 'friend';
    if (isCurrentChat) {
      const f = friends.value.find(x => x.userId === senderId);
      if (f) f.unreadCount = 0;
    } else {
      const f = friends.value.find(x => x.userId === senderId);
      if (f) f.unreadCount = (f.unreadCount || 0) + 1;
    }
  }

  /**
   * 处理群聊消息（仅更新侧边栏状态）
   * - 当前群聊 → 清除未读计数
   * - 非当前群聊 → 增加未读计数 + 更新最后消息
   */
  function handleWsGroupMessage(msg) {
    const { senderId, senderName, groupId, content, sendTime } = msg;
    const group = groups.value.find(g => g.groupId === groupId);
    if (!group) return;
    const text = senderName + ': ' + content;
    if (!group.lastMessageTime || sendTime > group.lastMessageTime) {
      group.lastMessage = text;
      group.lastMessageTime = sendTime;
    }
    const isCurrentChat = chatTarget.value?.groupId === groupId && chatType.value === 'group';
    if (isCurrentChat) {
      group.unreadCount = 0;
    } else {
      group.unreadCount = (group.unreadCount || 0) + 1;
    }
    saveGroupUnreadCache(groups.value);
  }

  /**
   * 根据 groupId 从本地 groups[] 查找群名（WS 消息不保证携带 groupName 字段）
   * @param {number} groupId
   * @returns {string}
   */
  function resolveGroupName(groupId) {
    const g = groups.value.find(x => x.groupId === groupId);
    return g?.groupName || `群聊${groupId}`;
  }

  /**
   * 构建群主转让通知文案：「新群主名」成为「群名」的新群主
   * WS content 格式通常为 "李四 成为新群主"，从中提取新群主名
   * @param {string} content - WS 消息中的 content 字段
   * @param {string} groupName - 群聊名称
   * @returns {string}
   */
  function buildTransferContent(content, groupName) {
    if (content) {
      // 尝试从 content 中提取新群主名字（格式如 "李四 成为新群主"）
      const match = content.match(/^(.+?)\s*成为新群主/);
      if (match) {
        return `「${match[1]}」成为「${groupName}」的新群主`;
      }
      // 提取失败，直接用原始 content 拼接
      return `「${content}」-「${groupName}」`;
    }
    return `「${groupName}」群主已变更`;
  }

  /**
   * 从后端 REST 加载群通知历史
   * 遍历当前用户所在群 + 交互过的群（localStorage 持久化），拉取每群第一页通知历史
   * 已存在的通知（通过 _key 去重）不会重复添加
   */
  async function loadGroupNotificationsHistory() {
    // 先同步当前群列表到 localStorage，确保持久化数据是最新的
    mergeInteractedGroups(groups.value);
    // 合并 groups 列表 + 交互过的群，去重后逐群查询
    const interacted = loadInteractedGroups();
    const groupMap = new Map();
    for (const g of groups.value) {
      groupMap.set(g.groupId, g.groupName);
    }
    for (const ig of interacted) {
      if (!groupMap.has(ig.groupId)) {
        groupMap.set(ig.groupId, ig.groupName);
      }
    }
    const targetGroups = Array.from(groupMap, ([groupId, groupName]) => ({ groupId, groupName }));
    if (targetGroups.length === 0) {
      console.log('[通知] 没有可查询的群，跳过通知历史加载');
      return;
    }
    console.log('[通知] 为', targetGroups.length, '个群加载通知历史（含交互群），groups:', groups.value.length, 'interacted:', interacted.length);
    const existingKeys = new Set(groupNotifications.value.map(n => n._key));
    for (const g of targetGroups) {
      try {
        const res = await getGroupNotifications(g.groupId, { page: 1, size: 20 });
        if (res.code === 200 && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.content || []);
          let added = 0;
          for (const item of list) {
            const key = item.id ? `hist-notif-${item.id}` : `hist-notif-${g.groupId}-${item.sendTime}-${item.senderId}`;
            if (existingKeys.has(key)) continue;
            // 规范化类型名：REST 返回 MEMBER_JOIN/MEMBER_LEAVE/OWNER_TRANSFERRED/DISBANDED，
            // WS 使用 GROUP_MEMBER_JOIN/GROUP_MEMBER_LEAVE/GROUP_OWNER_TRANSFERRED/GROUP_DISBANDED
            let rawType = item.type || item.notificationType || 'GROUP_MEMBER_JOIN';
            if (rawType === 'MEMBER_JOIN') rawType = 'GROUP_MEMBER_JOIN';
            else if (rawType === 'MEMBER_LEAVE') rawType = 'GROUP_MEMBER_LEAVE';
            else if (rawType === 'OWNER_TRANSFERRED') rawType = 'GROUP_OWNER_TRANSFERRED';
            else if (rawType === 'DISBANDED') rawType = 'GROUP_DISBANDED';

            // 二次去重：WS 可能已插入同群同类型通知（后端对同一次操作推送多条 WS），
            // 避免 REST 加载时再次重复（与 WS handler 中的去重策略一致）
            if (rawType === 'GROUP_MEMBER_JOIN' || rawType === 'GROUP_MEMBER_LEAVE' || rawType === 'GROUP_OWNER_TRANSFERRED') {
              if (groupNotifications.value.some(n => n.type === rawType && n.groupId === g.groupId)) {
                continue;
              }
            }
            existingKeys.add(key);

            // 后端 REST 通知的 senderId/senderName 对于 JOIN/LEAVE 事件可能存的是操作者（群主）而非实际成员
            // - JOIN：群聊视角展示（发送者=群聊，内容=谁加入了），模板中优先取 content 降级取 senderName
            // - LEAVE：senderId 可能是踢人者（群主），实际退出者是 targetUserId
            //   优先用 targetUserId/targetUserName，确保 isSelfLeave 判断正确且气泡显示被踢者名字
            const content = item.content || item.message || '';
            let rawSenderId = item.senderId || item.userId || 0;
            let rawSenderName = item.senderName || item.userName || '';

            if (rawType === 'GROUP_MEMBER_LEAVE' && item.targetUserId && item.targetUserName) {
              rawSenderId = item.targetUserId;
              rawSenderName = item.targetUserName;
            }

            groupNotifications.value.push({
              _key: key,
              _type: 'member-change',
              type: rawType,
              groupId: g.groupId,
              groupName: g.groupName,
              senderId: rawSenderId,
              senderName: rawSenderName,
              content: content,
              sendTime: item.sendTime || item.createTime || new Date().toISOString(),
              isRead: computeIsRead(item.sendTime || item.createTime || new Date().toISOString(), activeView.value === 'notifications-group'),
            });
            added++;
          }
          if (added > 0) console.log('[通知] 群「' + g.groupName + '」加载', added, '条历史通知');
        } else if (res.code !== 200) {
          console.warn('[通知] 群「' + g.groupName + '」通知历史查询返回 code:', res.code, res.message);
        }
      } catch (e) {
        console.error('[通知] 加载群「' + g.groupName + '」通知历史失败:', e?.message || e);
      }
    }
    // 按时间降序重排
    groupNotifications.value.sort((a, b) => (b.sendTime || '').localeCompare(a.sendTime || ''));
  }

  /**
   * 用当前 groups 列表同步 groupNotifications 中的群名
   * 解决 WS 消息不含 groupName 导致显示「群聊x」的问题
   */
  function syncNotificationGroupNames() {
    const groupMap = new Map();
    for (const g of groups.value) {
      groupMap.set(g.groupId, g.groupName);
    }
    let updated = false;
    for (const n of groupNotifications.value) {
      const freshName = groupMap.get(n.groupId);
      if (freshName && n.groupName !== freshName) {
        n.groupName = freshName;
        updated = true;
      }
    }
    if (updated) {
      // 触发 Vue 响应式：替换数组引用
      groupNotifications.value = [...groupNotifications.value];
    }
  }

  /** 处理群成员加入/退出通知（存储通知 + 刷新群列表） */
  function handleWsGroupMemberChange(msg) {
    console.log('[通知] 收到 WS', msg.type, ':', JSON.stringify(msg));
    const { type, groupId, senderId, senderName } = msg;
    const sendTime = msg.sendTime || new Date().toISOString();
    const groupName = msg.groupName || resolveGroupName(groupId);

    // 去重：后端可能对同一次操作推送多条 WS（senderId 可能不同——例如
    // JOIN 事件一条 senderId=加入者、另一条 senderId=邀请者）
    // 按 type + groupId 去重（同群同类型事件在短时间内视为同一次操作），与转让通知去重策略一致
    const dupIdx = groupNotifications.value.findIndex(
      n => n.type === type && n.groupId === groupId
    );
    if (dupIdx !== -1) {
      groupNotifications.value.splice(dupIdx, 1);
    }

    // 存储到群聊通知列表（最新在上方）
    groupNotifications.value.unshift({
      _key: `grp-notif-${Date.now()}-${groupId}-${senderId}`,
      type,
      groupId,
      groupName,
      senderId,
      senderName,
      sendTime,
      isRead: computeIsRead(sendTime, activeView.value === 'notifications-group'),
    });

    // 限制最多保留 100 条
    if (groupNotifications.value.length > 100) {
      groupNotifications.value = groupNotifications.value.slice(0, 100);
    }

    toast.info(`「${groupName}」${type === 'GROUP_MEMBER_JOIN' ? '有新成员加入' : '有成员退出'}`);
    loadGroups({ silent: true });
  }

  /** 处理群聊解散通知 */
  function handleWsGroupDisbanded(msg) {
    console.log('[通知] 收到 WS GROUP_DISBANDED:', JSON.stringify(msg));
    const { groupId, senderId, senderName, content, sendTime } = msg;
    const groupName = resolveGroupName(groupId);

    groupNotifications.value.unshift({
      _key: `grp-disbanded-${Date.now()}-${groupId}`,
      type: 'GROUP_DISBANDED',
      groupId,
      groupName,
      senderId,
      senderName,
      content: content || `「${groupName}」已被群主解散`,
      sendTime: sendTime || new Date().toISOString(),
      isRead: computeIsRead(sendTime || new Date().toISOString(), activeView.value === 'notifications-group'),
    });

    if (groupNotifications.value.length > 100) {
      groupNotifications.value = groupNotifications.value.slice(0, 100);
    }

    toast.info(content || `「${groupName}」已被群主解散`);
    // 如果当前正在该群聊中，清空聊天区
    if (chatTarget.value?.groupId === groupId && chatType.value === 'group') {
      chatTarget.value = null;
    }
    loadGroups({ silent: true });
  }

  /** 处理群主转让通知 */
  function handleWsGroupOwnerTransferred(msg) {
    console.log('[通知] 收到 WS GROUP_OWNER_TRANSFERRED:', JSON.stringify(msg));
    const { groupId, senderId, senderName, targetUserId, content, sendTime } = msg;
    const groupName = resolveGroupName(groupId);
    const ts = sendTime || new Date().toISOString();

    // 去重：同一次转让后端可能推送多条 WS，移除旧通知后插入最新
    const dupIdx = groupNotifications.value.findIndex(
      n => n.type === 'GROUP_OWNER_TRANSFERRED' && n.groupId === groupId
    );
    if (dupIdx !== -1) {
      groupNotifications.value.splice(dupIdx, 1);
    }

    groupNotifications.value.unshift({
      _key: `grp-transfer-${groupId}`,
      type: 'GROUP_OWNER_TRANSFERRED',
      groupId,
      groupName,
      senderId,
      senderName,
      targetUserId,
      content: buildTransferContent(content, groupName),
      sendTime: ts,
      isRead: computeIsRead(ts, activeView.value === 'notifications-group'),
    });

    if (groupNotifications.value.length > 100) {
      groupNotifications.value = groupNotifications.value.slice(0, 100);
    }

    toast.info(content || `「${groupName}」群主已变更`);
    loadGroups({ silent: true });
  }

  /**
   * 处理消息撤回通知（仅更新侧边栏 lastMessage）
   * @param {Object} msg - MESSAGE_RECALL WS 消息
   */
  function handleWsMessageRecall(msg) {
    const { senderId, senderName, recordId, receiverId, groupId, sendTime } = msg;
    const displayText = senderName + '撤回了一条消息';

    if (groupId) {
      // 群聊撤回 → 更新群列表 lastMessage
      const group = groups.value.find(g => g.groupId === groupId);
      if (group && (!group.lastMessageTime || sendTime >= group.lastMessageTime)) {
        group.lastMessage = displayText;
        group.lastMessageTime = sendTime;
      }
    } else if (receiverId) {
      // 私聊撤回 → 更新好友列表 lastMessage
      const friendId = senderId === chatTarget.value?.userId ? senderId : receiverId;
      const friend = friends.value.find(f => f.userId === friendId);
      if (friend && (!friend.lastMessageTime || sendTime >= friend.lastMessageTime)) {
        friend.lastMessage = displayText;
        friend.lastMessageTime = sendTime;
      }
    }
  }

  // ==================== WebSocket 生命周期 ====================
  onMounted(() => {
    wsManager.on('FRIEND_ONLINE', handleWsFriendOnline);
    wsManager.on('FRIEND_OFFLINE', handleWsFriendOffline);
    wsManager.on('PRIVATE_MESSAGE', handleWsIncomingMessage);
    wsManager.on('GROUP_MESSAGE', handleWsGroupMessage);
    wsManager.on('GROUP_MEMBER_JOIN', handleWsGroupMemberChange);
    wsManager.on('GROUP_MEMBER_LEAVE', handleWsGroupMemberChange);
    wsManager.on('GROUP_DISBANDED', handleWsGroupDisbanded);
    wsManager.on('GROUP_OWNER_TRANSFERRED', handleWsGroupOwnerTransferred);
    wsManager.on('MESSAGE_RECALL', handleWsMessageRecall);
  });

  onBeforeUnmount(() => {
    wsManager.off('FRIEND_ONLINE', handleWsFriendOnline);
    wsManager.off('FRIEND_OFFLINE', handleWsFriendOffline);
    wsManager.off('PRIVATE_MESSAGE', handleWsIncomingMessage);
    wsManager.off('GROUP_MESSAGE', handleWsGroupMessage);
    wsManager.off('GROUP_MEMBER_JOIN', handleWsGroupMemberChange);
    wsManager.off('GROUP_MEMBER_LEAVE', handleWsGroupMemberChange);
    wsManager.off('GROUP_DISBANDED', handleWsGroupDisbanded);
    wsManager.off('GROUP_OWNER_TRANSFERRED', handleWsGroupOwnerTransferred);
    wsManager.off('MESSAGE_RECALL', handleWsMessageRecall);
  });

  // ==================== 侦听器 ====================
  // 切换到聊天对象时，清除该对象的未读计数
  watch(chatTarget, () => {
    if (chatTarget.value && chatType.value === 'friend') {
      const f = friends.value.find(x => x.userId === chatTarget.value.userId);
      if (f) f.unreadCount = 0;
    }
    if (chatTarget.value && chatType.value === 'group') {
      const g = groups.value.find(x => x.groupId === chatTarget.value.groupId);
      if (g) { g.unreadCount = 0; saveGroupUnreadCache(groups.value); }
    }
  });

  /** 标记所有群聊通知为已读（更新 lastReadAt + 遍历数组） */
  function markAllGroupNotificationsAsRead() {
    const now = new Date().toISOString();
    updateLastReadAt(now);
    groupNotifications.value.forEach(n => { n.isRead = true; });
  }

  return {
    // 状态
    friends,
    groups,
    loadingFriends,
    chatTarget,
    chatType,
    mobileView,
    activeView,
    friendsExpanded,
    groupsExpanded,
    notificationsExpanded,
    groupNotifications,
    // 操作
    toggleFriends,
    toggleGroups,
    toggleNotifications,
    onSelectFriend,
    onSelectGroup,
    loadFriends,
    loadGroups,
    fetchUnreadMessages,
    loadGroupNotificationsHistory,
    markAllGroupNotificationsAsRead,
  };
}
