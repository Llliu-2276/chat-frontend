/**
 * 好友列表管理 Composable
 * 负责好友列表状态、选择好友、加载列表、在线状态更新、
 * 未读消息轮询，以及好友相关的 WebSocket 事件处理
 *
 * @module composables/useFriendList
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { getFriendList, getUnreadMessages, getChatHistory } from '@/api/friend';
import { getGroupList, getGroupHistory } from '@/api/group';
import { wsManager } from '@/utils/websocket';

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
   * 首次加载时会获取每个好友的最后一条消息
   */
  async function loadFriends() {
    loadingFriends.value = true;
    try {
      const res = await getFriendList();
      if (res.code === 200) {
        const isFirstLoad = friends.value.length === 0;
        friends.value = (res.data || []).map(f => {
          const existing = friends.value.find(old => old.userId === f.userId);
          return {
            ...f,
            lastMessage: existing?.lastMessage || '',
            lastMessageTime: existing?.lastMessageTime || '',
            unreadCount: existing?.unreadCount || 0,
          };
        });

        if (isFirstLoad) {
          await Promise.allSettled(
            friends.value.map(async (f) => {
              try {
                const hRes = await getChatHistory(f.userId, { page: 1, size: 1 });
                if (hRes.code === 200 && hRes.data?.content?.length > 0) {
                  const msg = hRes.data.content[0];
                  f.lastMessage = msg.content;
                  f.lastMessageTime = msg.sendTime;
                }
              } catch (e) { /* 单个好友加载失败不影响整体 */ }
            })
          );
        }
      }
    } catch (e) { console.error('加载好友列表失败:', e); }
    finally { loadingFriends.value = false; }
  }

  /**
   * 轮询获取未读消息
   * 更新好友列表中的未读计数和最后一条消息
   */
  async function fetchUnreadMessages() {
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
      }
    } catch (e) { console.error('获取未读消息失败:', e); }
  }

  /**
   * 加载群聊列表
   * 首次加载时会获取每个群聊的最后一条消息
   */
  async function loadGroups() {
    try {
      const res = await getGroupList();
      if (res.code === 200) {
        const isFirstLoad = groups.value.length === 0;
        groups.value = (res.data || []).map(g => {
          const existing = groups.value.find(old => old.groupId === g.groupId);
          return {
            ...g,
            lastMessage: existing?.lastMessage || '',
            lastMessageTime: existing?.lastMessageTime || '',
            unreadCount: existing?.unreadCount || 0,
          };
        });

        if (isFirstLoad) {
          await Promise.allSettled(
            groups.value.map(async (g) => {
              try {
                const hRes = await getGroupHistory(g.groupId, { page: 1, size: 1 });
                if (hRes.code === 200 && hRes.data?.content?.length > 0) {
                  const msg = hRes.data.content[0];
                  g.lastMessage = msg.senderName + ': ' + msg.content;
                  g.lastMessageTime = msg.sendTime;
                }
              } catch (e) { /* 单个群聊加载失败不影响整体 */ }
            })
          );
        }
      }
    } catch (e) { console.error('加载群聊列表失败:', e); }
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
  }

  /** 处理群成员加入/退出通知（刷新群列表） */
  function handleWsGroupMemberChange(msg) {
    toast.info(`「${msg.groupName}」${msg.type === 'GROUP_MEMBER_JOIN' ? '有新成员加入' : '有成员退出'}`);
    loadGroups();
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
  // 切换到好友聊天时，清除该好友的未读计数
  watch(chatTarget, () => {
    if (chatTarget.value && chatType.value === 'friend') {
      const f = friends.value.find(x => x.userId === chatTarget.value.userId);
      if (f) f.unreadCount = 0;
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
