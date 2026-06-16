/**
 * 通知管理 Composable
 * 负责好友申请通知、通知面板、侧面板（添加好友/群聊操作）、
 * 以及好友申请相关的 WebSocket 事件处理
 *
 * @module composables/useNotifications
 */
import { ref, watch, onMounted } from 'vue';
import {
  handleFriendRequest,
  getReceivedRequests,
  getSentRequests,
  sendFriendRequest,
} from '@/api/friend';
import { searchUsers } from '@/api/user';
import { wsManager } from '@/utils/websocket';
import { useUserStore } from '@/stores/user';
import { ElMessageBox } from 'element-plus';

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
  const userStore = useUserStore();

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
  /** 正在发送申请的用户ID集合（防重复提交） */
  const sendingRequestIds = ref(new Set());

  // ==================== 侧面板状态 ====================
  const showSidePanel = ref(false);
  const sidePanelMode = ref('friend');
  const groupSubMode = ref('join');
  const panelSearchResults = ref([]);
  const panelSearching = ref(false);
  let panelSearchTimer = null;

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

  // ==================== 侧面板操作 ====================
  /** 重置侧面板搜索状态 */
  function resetPanelState() {
    panelSearchResults.value = [];
    panelSearching.value = false;
    if (panelSearchTimer) { clearTimeout(panelSearchTimer); panelSearchTimer = null; }
  }

  /**
   * 处理群聊操作（创建/加入）
   * @param {string} action - 'create' | 'join'
   */
  function handleGroupAction(action) {
    if (showSidePanel.value && sidePanelMode.value === 'group' && groupSubMode.value === action) {
      closeSidePanel();
      return;
    }
    sidePanelMode.value = 'group';
    groupSubMode.value = action;
    showSidePanel.value = true;
    resetPanelState();
  }

  /**
   * 打开侧面板
   * @param {string} mode - 面板模式 'friend' | 'group'
   */
  function openSidePanel(mode) {
    if (showSidePanel.value && sidePanelMode.value === mode) {
      closeSidePanel();
      return;
    }
    sidePanelMode.value = mode;
    showSidePanel.value = true;
    resetPanelState();
  }

  /** 关闭侧面板 */
  function closeSidePanel() {
    showSidePanel.value = false;
    resetPanelState();
  }

  /**
   * 侧面板搜索用户（带防抖）
   * @param {string} keyword - 搜索关键词
   */
  function handlePanelSearch(keyword) {
    if (panelSearchTimer) clearTimeout(panelSearchTimer);
    if (!keyword?.trim()) {
      panelSearchResults.value = [];
      return;
    }
    panelSearchTimer = setTimeout(async () => {
      panelSearching.value = true;
      try {
        const res = await searchUsers({ keyword, page: 1, size: 20 });
        if (res.code === 200 && res.data) {
          panelSearchResults.value = (res.data.content || []).filter(u => u.userId !== userStore.userId);
        }
      } catch (e) {
        console.error('搜索用户失败:', e);
      } finally {
        panelSearching.value = false;
      }
    }, 300);
  }

  /**
   * 发送好友申请
   * 弹出对话框让用户输入申请留言
   * @param {Object} user - 目标用户对象
   */
  async function handleAddFriend(user) {
    if (!user?.userId) return;

    // 防止重复发送
    if (sendingRequestIds.value.has(user.userId)) {
      toast.info('正在发送申请，请稍候');
      return;
    }

    // 检查是否已发送过申请
    const hasPending = sentRequests.value.some(
      r => r.receiverId === user.userId && r.status === 0
    );
    if (hasPending) {
      toast.info('已向该用户发送过申请，请等待处理结果');
      return;
    }

    const defaultMsg = `你好，我是${userStore.userName}，希望加你为好友`;
    try {
      const { value } = await ElMessageBox.prompt(
        `<div class="add-friend-dialog-user">
          <div class="add-friend-avatar">${(user.userName || '?').charAt(0)}</div>
          <div class="add-friend-info">
            <div class="add-friend-name">${user.userName}</div>
            <div class="add-friend-account">账号：${user.userAccount}</div>
          </div>
        </div>`,
        '发送好友申请',
        {
          confirmButtonText: '发送申请',
          cancelButtonText: '取消',
          inputValue: defaultMsg,
          inputPlaceholder: '请输入申请留言',
          inputPattern: /^\s*\S.*$/,
          inputErrorMessage: '留言内容不能为空且不超过100字',
          dangerouslyUseHTMLString: true,
          customClass: 'add-friend-dialog',
          closeOnClickModal: false,
        }
      );
      const message = (value || '').trim() || defaultMsg;
      sendingRequestIds.value.add(user.userId);
      const res = await sendFriendRequest({ receiverId: user.userId, message });
      if (res.code === 201 || res.code === 200) {
        toast.success(`已向 ${user.userName} 发送好友申请`);
        panelSearchResults.value = [];
        closeSidePanel();
      }
    } catch (e) {
      // Element Plus ElMessageBox 取消时抛出 Error 对象，message 属性为 'cancel'
      if (e.message !== 'cancel') {
        // 处理后端返回的具体错误信息
        const errorMsg = e.message || '';
        if (errorMsg.includes('409') || errorMsg.includes('Conflict')) {
          // 409 冲突：已是好友或已有待处理申请
          if (errorMsg.includes('已经是好友')) {
            toast.info('你们已经是好友，无需再次申请');
          } else if (errorMsg.includes('待处理')) {
            toast.info('已有待处理的申请，请等待对方处理');
          } else {
            toast.info('该申请无法发送，请检查好友关系');
          }
        } else if (errorMsg.includes('400')) {
          toast.info('请求参数有误，请检查后重试');
        } else if (errorMsg.includes('401') || errorMsg.includes('未授权')) {
          toast.error('登录已过期，请重新登录');
        } else if (errorMsg.includes('403')) {
          toast.error('无权执行此操作');
        } else if (errorMsg.includes('404')) {
          toast.info('用户不存在');
        } else if (errorMsg.includes('500') || errorMsg.includes('服务器')) {
          toast.error('服务器繁忙，请稍后重试');
        } else if (errorMsg.includes('网络') || errorMsg.includes('timeout') || errorMsg.includes('Network')) {
          toast.error('网络连接失败，请检查网络后重试');
        } else {
          // 其他后端返回的具体错误信息
          toast.error(errorMsg || '发送申请失败，请重试');
        }
      }
    } finally {
      sendingRequestIds.value.delete(user.userId);
    }
  }

  /** 创建群聊（待后端实现） */
  function handleCreateGroup() {
    // TODO: 对接创建群聊 API
    toast.info('创建群聊功能待后端实现');
  }

  /** 加入群聊（待后端实现） */
  function handleJoinGroup() {
    // TODO: 对接加入群聊 API
    toast.info('加入群聊功能待后端实现');
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

  // ==================== 侦听器 ====================
  // 切换面板模式时重置搜索状态，但 profile 导航保留状态（支持返回后恢复搜索结果）
  watch(sidePanelMode, (newMode, oldMode) => {
    if (newMode === 'profile' || oldMode === 'profile') return;
    resetPanelState();
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
    sendingRequestIds,
    // 侧面板状态
    showSidePanel,
    sidePanelMode,
    groupSubMode,
    panelSearchResults,
    panelSearching,
    // 通知操作
    openNotifications,
    loadReceivedRequests,
    loadSentRequests,
    loadMoreReceived,
    loadMoreSent,
    onHandleRequest,
    loadPendingCount,
    // 侧面板操作
    handleGroupAction,
    openSidePanel,
    closeSidePanel,
    handlePanelSearch,
    handleAddFriend,
    handleCreateGroup,
    handleJoinGroup,
    // 清理（供 Chat.vue 的 onBeforeUnmount 调用）
    _cleanupNotifications() {
      if (panelSearchTimer) { clearTimeout(panelSearchTimer); panelSearchTimer = null; }
      wsManager.off('FRIEND_REQUEST', _wsFriendRequest);
      wsManager.off('FRIEND_REQUEST_RESULT', _wsFriendRequestResult);
    },
  };
}
