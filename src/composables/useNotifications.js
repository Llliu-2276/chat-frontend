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
export function useNotifications({ loadFriends, activeView, chatTarget, mobileView, toast }) {
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
        // 如果同意了申请，刷新好友列表
        if (accept) loadFriends();
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
    // 对方同意后，刷新好友列表（新好友会出现在列表中）
    if (msg.content === 'accepted') loadFriends();
    // 如果当前在通知面板，刷新发出的申请列表
    if (activeView.value === 'notifications') {
      sentPage.value = 1;
      loadSentRequests();
    }
  }

  // ==================== WebSocket 生命周期 ====================
  // 使用包装函数确保每次事件触发时都调用最新的函数引用
  const _wsFriendRequest = (msg) => handleWsFriendRequest(msg);
  const _wsFriendRequestResult = (msg) => handleWsFriendRequestResult(msg);

  onMounted(() => {
    loadPendingCount();
    wsManager.on('FRIEND_REQUEST', _wsFriendRequest);
    wsManager.on('FRIEND_REQUEST_RESULT', _wsFriendRequestResult);
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
    // 通知操作
    openNotifications,
    loadReceivedRequests,
    loadSentRequests,
    loadMoreReceived,
    loadMoreSent,
    onHandleRequest,
    loadPendingCount,
    // 清理（供 Chat.vue 的 onBeforeUnmount 调用）
    _cleanupNotifications() {
      wsManager.off('FRIEND_REQUEST', _wsFriendRequest);
      wsManager.off('FRIEND_REQUEST_RESULT', _wsFriendRequestResult);
    },
  };
}
