/**
 * 通知管理 Composable
 * 负责好友申请通知的加载、处理、以及 WebSocket 实时通知
 *
 * @module composables/useNotifications
 */
import { ref, onMounted } from 'vue';
import {
  handleFriendRequest,
  getReceivedRequests,
  getSentRequests,
} from '@/api/friend';
import { handleJoinRequest, getJoinRequests } from '@/api/group';
import { wsManager } from '@/utils/websocket';

/**
 * 通知管理
 * @param {Object} options - 依赖注入
 * @param {Function} options.loadFriends - 刷新好友列表的回调（来自 useFriendList）
 * @param {import('vue').Ref<string>} options.activeView - 当前视图状态 ref
 * @param {import('vue').Ref} options.chatTarget - 当前聊天对象 ref
 * @param {import('vue').Ref<string>} options.mobileView - 移动端视图状态 ref
 * @param {Object} options.toast - Toast 通知对象
 */
export function useNotifications({ loadFriends, loadGroups, groups, activeView, chatTarget, mobileView, toast }) {
  // ==================== 通知状态 ====================
  const receivedRequests = ref([]);
  const sentRequests = ref([]);
  const loadingReceived = ref(false);
  const loadingSent = ref(false);
  const loadingMoreReceived = ref(false);
  const loadingMoreSent = ref(false);
  const receivedPage = ref(1);
  const sentPage = ref(1);
  const hasMoreReceived = ref(true);
  const hasMoreSent = ref(true);
  const pendingRequestCount = ref(0);

  // 群聊加群申请（群主视角）
  const joinGroupRequests = ref([]);

  // ==================== 通知操作 ====================
  /**
   * 打开通知面板
   * 重置分页并重新加载申请列表
   */
  function openNotifications() {
    activeView.value = 'notifications';
    chatTarget.value = null;
    mobileView.value = 'chat';
    // 每次打开都重新拉取数据，确保显示最新申请
    receivedPage.value = 1;
    sentPage.value = 1;
    loadReceivedRequests();
    loadSentRequests();
  }

  /**
   * 加载收到的好友申请
   * @param {boolean} append - 是否追加模式（加载更多）
   */
  async function loadReceivedRequests(append = false) {
    if (append) loadingMoreReceived.value = true;
    else loadingReceived.value = true;
    try {
      const res = await getReceivedRequests({ page: receivedPage.value, size: 20 });
      if (res.code === 200 && res.data) {
        const content = res.data.content || [];
        hasMoreReceived.value = receivedPage.value < res.data.totalPages;
        if (append) {
          receivedRequests.value = [...receivedRequests.value, ...content];
        } else {
          receivedRequests.value = content;
        }
      }
      // 单独拉取待处理计数（始终只统计 status=0）
      loadPendingCount();
    } catch (e) {
      console.error('加载收到的申请失败:', e);
      // 发生错误时清空列表，避免显示旧的过期数据
      if (!append) {
        receivedRequests.value = [];
      }
      toast.error('加载申请列表失败，请稍后重试');
    }
    finally { loadingReceived.value = false; loadingMoreReceived.value = false; }
  }

  /**
   * 加载发出的好友申请
   * @param {boolean} append - 是否追加模式（加载更多）
   */
  async function loadSentRequests(append = false) {
    if (append) loadingMoreSent.value = true;
    else loadingSent.value = true;
    try {
      const res = await getSentRequests({ page: sentPage.value, size: 20 });
      if (res.code === 200 && res.data) {
        const content = res.data.content || [];
        hasMoreSent.value = sentPage.value < res.data.totalPages;
        if (append) {
          sentRequests.value = [...sentRequests.value, ...content];
        } else {
          sentRequests.value = content;
        }
      }
    } catch (e) {
      console.error('加载发出的申请失败:', e);
      // 发生错误时清空列表，避免显示旧的过期数据
      if (!append) {
        sentRequests.value = [];
      }
      toast.error('加载申请列表失败，请稍后重试');
    }
    finally { loadingSent.value = false; loadingMoreSent.value = false; }
  }

  /** 加载更多收到的申请 */
  function loadMoreReceived() {
    receivedPage.value++;
    loadReceivedRequests(true);
  }

  /** 加载更多发出的申请 */
  function loadMoreSent() {
    sentPage.value++;
    loadSentRequests(true);
  }

  /**
   * 处理好友申请（同意/拒绝）
   * @param {number} requestId - 申请ID
   * @param {boolean} accept - 是否同意
   */
  async function onHandleRequest(requestId, accept) {
    try {
      const res = await handleFriendRequest({ requestId, accept });
      if (res.code === 200 || res.code === 201) {
        toast.success(accept ? '已同意好友申请' : '已拒绝好友申请');
        // 刷新列表
        receivedPage.value = 1;
        loadReceivedRequests();
        // 如果同意了申请，刷新好友列表（已弹 toast，静默刷新）
        if (accept) loadFriends({ silent: true });
      }
    } catch (e) {
      toast.error('处理申请失败，请重试');
      console.error('处理好友申请失败:', e);
    }
  }

  /** 加载待处理申请计数（静默） */
  async function loadPendingCount() {
    try {
      const res = await getReceivedRequests({ status: 0, page: 1, size: 1 });
      if (res.code === 200 && res.data) {
        pendingRequestCount.value = res.data.totalElements || 0;
      }
    } catch (e) {
      console.error('加载待处理申请计数失败:', e);
      // 静默失败，不影响主流程
    }
  }

  /**
   * 从后端 REST 加载入群申请历史（群主视角）
   * 遍历当前用户拥有的群，拉取每群的待处理入群申请，合并到 joinGroupRequests
   * 已存在于列表中的申请（通过 requestId 去重）不会重复添加
   */
  async function loadJoinRequestsHistory() {
    const ownedGroups = groups.value?.filter(g => g.isOwner) || [];
    if (ownedGroups.length === 0) {
      console.log('[通知] 没有管理的群，跳过入群申请历史加载');
      return;
    }
    console.log('[通知] 为', ownedGroups.length, '个管理的群加载入群申请历史');
    for (const g of ownedGroups) {
      try {
        const res = await getJoinRequests(g.groupId);
        if (res.code === 200 && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.content || []);
          for (const req of list) {
            // 去重：已存在于 joinGroupRequests 中则跳过
            const exists = joinGroupRequests.value.some(r => r.requestId === req.requestId);
            if (exists) continue;
            // 只展示待处理的申请
            if (req.status !== 0) continue;
            joinGroupRequests.value.push({
              _key: `join-req-${req.requestId}`,
              requestId: req.requestId,
              groupId: g.groupId,
              groupName: g.groupName,
              senderId: req.senderId,
              senderName: req.senderName,
              sendTime: req.createTime || req.sendTime || new Date().toISOString(),
              status: req.status,
            });
          }
          console.log('[通知] 群「' + g.groupName + '」加载', list.filter(r => r.status === 0).length, '条待处理入群申请');
        }
      } catch (e) {
        console.error('[通知] 加载群「' + g.groupName + '」入群申请失败:', e);
      }
    }
  }

  // ==================== WebSocket 事件处理 ====================
  /**
   * 处理 WebSocket 好友申请通知
   * @param {import('@/types/index.js').WsFriendRequestNotification} msg
   */
  function handleWsFriendRequest(msg) {
    // 去重：检查是否已经存在于列表中
    const exists = receivedRequests.value.some(r =>
      r.senderId === msg.senderId && r.status === 0
    );

    if (!exists) {
      pendingRequestCount.value++;
      toast.info(`${msg.senderName} 请求加你为好友`);
      // 始终预加载最新申请列表，确保用户打开通知面板时立即显示新申请
      receivedPage.value = 1;
      loadReceivedRequests();
    }
  }

  /**
   * 处理 WebSocket 好友申请结果通知
   * @param {import('@/types/index.js').WsFriendRequestResult} msg
   */
  function handleWsFriendRequestResult(msg) {
    const action = msg.content === 'accepted' ? '同意了' : '拒绝了';
    toast.info(`${msg.senderName} ${action}你的好友申请`);
    // 对方同意后，刷新好友列表（已弹 toast，静默刷新）
    if (msg.content === 'accepted') loadFriends({ silent: true });
    // 如果当前在通知面板，刷新发出的申请列表
    if (activeView.value === 'notifications') {
      sentPage.value = 1;
      loadSentRequests();
    }
  }

  /**
   * 处理 WebSocket 加群申请通知（群主收到 — 后端 v2.1）
   * WS 消息格式: { type: 'JOIN_GROUP_REQUEST', groupId, senderId, senderName, content, requestId, sendTime }
   * 注意：WS 消息不包含 groupName，需从 groups 列表中查找
   */
  function handleWsJoinGroupRequest(msg) {
    console.log('[通知] 收到 WS JOIN_GROUP_REQUEST:', JSON.stringify(msg));
    const { groupId, senderId, senderName, requestId, sendTime, content } = msg;

    // 去重
    const exists = joinGroupRequests.value.some(r => r.requestId === requestId);
    if (exists) {
      console.log('[通知] JOIN_GROUP_REQUEST 重复，跳过 requestId=', requestId);
      return;
    }

    // 从 groups 列表中查找群名，降级使用 content 字段
    const group = groups.value?.find(g => g.groupId === groupId);
    const groupName = group?.groupName || (content || '').replace('申请加入群聊 ', '') || `群聊${groupId}`;

    // 存到加群申请列表（最新在上方）
    joinGroupRequests.value.unshift({
      _key: `join-req-${requestId}`,
      requestId,
      groupId,
      groupName,
      senderId,
      senderName,
      sendTime: sendTime || new Date().toISOString(),
      status: 0, // 0=待处理
    });

    // 最多保留 50 条
    if (joinGroupRequests.value.length > 50) {
      joinGroupRequests.value = joinGroupRequests.value.slice(0, 50);
    }

    toast.info(`${senderName} 申请加入「${groupName}」`);
  }

  /**
   * 添加自己发出的加群申请（发送成功后调用，显示在群聊通知中）
   * @param {Object} data - { groupId, groupName, requestId }
   */
  function addSelfJoinRequest(data) {
    console.log('[通知] addSelfJoinRequest 添加自己发出的入群申请:', JSON.stringify(data));
    joinGroupRequests.value.unshift({
      _key: `self-join-${Date.now()}`,
      requestId: data.requestId || 0,
      groupId: data.groupId,
      groupName: data.groupName,
      senderId: 0,       // 自己发的，不显示头像跳转
      senderName: '我',
      sendTime: new Date().toISOString(),
      status: 0,         // 待处理
      _isSelf: true,     // 标记为自己发出的
    });
  }

  /**
   * 处理加群申请（群主同意/拒绝）
   * @param {number} groupId - 群组ID
   * @param {number} requestId - 申请ID
   * @param {boolean} accept - 是否同意
   */
  async function handleJoinRequestAction(groupId, requestId, accept) {
    try {
      const res = await handleJoinRequest(groupId, { requestId, accept });
      if (res.code === 200 || res.code === 201) {
        const idx = joinGroupRequests.value.findIndex(r => r.requestId === requestId);
        if (idx !== -1) {
          // 替换数组元素触发 Vue 响应式更新（直接修改属性不会触发 computed 重算）
          const updated = { ...joinGroupRequests.value[idx], status: accept ? 1 : 2 };
          joinGroupRequests.value.splice(idx, 1, updated);
        }
        toast.success(accept ? '已同意入群申请' : '已拒绝入群申请');
        // 刷新群聊列表（已弹 toast，静默刷新）
        loadGroups({ silent: true });
      }
    } catch (error) {
      toast.error(error.message || '操作失败，请重试');
    }
  }

  // ==================== WebSocket 生命周期 ====================
  // 使用包装函数确保每次事件触发时都调用最新的函数引用
  const _wsFriendRequest = (msg) => handleWsFriendRequest(msg);
  const _wsFriendRequestResult = (msg) => handleWsFriendRequestResult(msg);
  const _wsJoinGroupRequest = (msg) => handleWsJoinGroupRequest(msg);

  onMounted(() => {
    loadPendingCount();
    wsManager.on('FRIEND_REQUEST', _wsFriendRequest);
    wsManager.on('FRIEND_REQUEST_RESULT', _wsFriendRequestResult);
    wsManager.on('JOIN_GROUP_REQUEST', _wsJoinGroupRequest);
  });

  return {
    // 通知状态
    receivedRequests,
    sentRequests,
    loadingReceived,
    loadingSent,
    loadingMoreReceived,
    loadingMoreSent,
    hasMoreReceived,
    hasMoreSent,
    pendingRequestCount,
    joinGroupRequests,
    // 通知操作
    openNotifications,
    loadReceivedRequests,
    loadSentRequests,
    loadMoreReceived,
    loadMoreSent,
    onHandleRequest,
    handleJoinRequestAction,
    addSelfJoinRequest,
    loadPendingCount,
    loadJoinRequestsHistory,
    // 清理（供 Chat.vue 的 onBeforeUnmount 调用）
    _cleanupNotifications() {
      wsManager.off('FRIEND_REQUEST', _wsFriendRequest);
      wsManager.off('FRIEND_REQUEST_RESULT', _wsFriendRequestResult);
      wsManager.off('JOIN_GROUP_REQUEST', _wsJoinGroupRequest);
    },
  };
}
