/**
 * 好友列表管理 Composable
 * 负责好友列表状态、选择好友、加载列表、在线状态更新、
 * 未读消息轮询，以及好友相关的 WebSocket 事件处理
 *
 * @module composables/useFriendList
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { getFriendList, getUnreadMessages } from '@/api/friend';
import { getGroupList } from '@/api/group';
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
          return {
            ...g,
            // 后端已返回这些字段（v1.9+），保留已有值作为降级，持久化兜底
            lastMessage: g.lastMessage || existing?.lastMessage || '',
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

  /** 处理群成员加入/退出通知（存储通知 + 刷新群列表） */
  function handleWsGroupMemberChange(msg) {
    const { type, groupId, groupName, senderId, senderName } = msg;
    const sendTime = msg.sendTime || new Date().toISOString();

    // 存储到群聊通知列表（最新在上方）
    groupNotifications.value.unshift({
      _key: `grp-notif-${Date.now()}-${groupId}-${senderId}`,
      type,
      groupId,
      groupName,
      senderId,
      senderName,
      sendTime,
    });

    // 限制最多保留 100 条
    if (groupNotifications.value.length > 100) {
      groupNotifications.value = groupNotifications.value.slice(0, 100);
    }

    toast.info(`「${groupName}」${type === 'GROUP_MEMBER_JOIN' ? '有新成员加入' : '有成员退出'}`);
    loadGroups({ silent: true });
  }

  // ==================== WebSocket 生命周期 ====================
  onMounted(() => {
    wsManager.on('FRIEND_ONLINE', handleWsFriendOnline);
    wsManager.on('FRIEND_OFFLINE', handleWsFriendOffline);
    wsManager.on('PRIVATE_MESSAGE', handleWsIncomingMessage);
    wsManager.on('GROUP_MESSAGE', handleWsGroupMessage);
    wsManager.on('GROUP_MEMBER_JOIN', handleWsGroupMemberChange);
    wsManager.on('GROUP_MEMBER_LEAVE', handleWsGroupMemberChange);
  });

  onBeforeUnmount(() => {
    wsManager.off('FRIEND_ONLINE', handleWsFriendOnline);
    wsManager.off('FRIEND_OFFLINE', handleWsFriendOffline);
    wsManager.off('PRIVATE_MESSAGE', handleWsIncomingMessage);
    wsManager.off('GROUP_MESSAGE', handleWsGroupMessage);
    wsManager.off('GROUP_MEMBER_JOIN', handleWsGroupMemberChange);
    wsManager.off('GROUP_MEMBER_LEAVE', handleWsGroupMemberChange);
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
  };
}
