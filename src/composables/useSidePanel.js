/**
 * 侧面板管理 Composable
 * 负责侧面板的显示状态、搜索用户、发送好友申请、群聊操作
 *
 * @module composables/useSidePanel
 */
import { ref, watch, onBeforeUnmount } from 'vue';
import { searchUsers } from '@/api/user';
import { sendFriendRequest } from '@/api/friend';
import { createGroup, searchGroups, joinGroup } from '@/api/group';
import { useUserStore } from '@/stores/user';
import { createDebounce } from '@/utils/debounce';

/**
 * 侧面板管理
 * @param {Object} options - 依赖注入
 * @param {Object} options.toast - Toast 通知对象
 * @param {import('vue').Ref<Array>} options.sentRequests - 已发出的好友申请列表 ref（用于检查重复申请）
 * @param {Function} options.loadGroups - 刷新群聊列表的回调（来自 useFriendList）
 */
export function useSidePanel({ toast, sentRequests, loadGroups, onJoinRequestSent }) {
  const userStore = useUserStore();

  // ==================== 面板状态 ====================
  const showSidePanel = ref(false);
  const sidePanelMode = ref('friend');
  const groupSubMode = ref('join');
  const panelSearchResults = ref([]);
  const panelSearching = ref(false);
  const newGroupName = ref('');

  // 群聊搜索状态
  const groupSearchResults = ref([]);
  const groupSearching = ref(false);

  /** 正在发送申请的用户ID集合（防重复提交） */
  const sendingRequestIds = ref(new Set());

  /** 正在加入的群聊ID集合（防重复提交） */
  const joiningGroupIds = ref(new Set());

  // ==================== 请求弹窗状态 ====================
  /** 请求弹窗是否可见 */
  const showRequestDialog = ref(false);
  /** 请求弹窗模式 'friend' | 'group' */
  const requestDialogMode = ref('friend');
  /** 请求弹窗目标对象（user 或 group） */
  const requestDialogTarget = ref(null);
  /** 请求弹窗默认留言 */
  const requestDialogDefaultMessage = ref('');

  // ==================== 面板操作 ====================
  /** 重置面板状态 */
  function resetPanelState() {
    panelSearchResults.value = [];
    panelSearching.value = false;
    groupSearchResults.value = [];
    groupSearching.value = false;
    newGroupName.value = '';
    _panelDebounce?.cancel();
    _groupDebounce?.cancel();
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
    _panelDebounce.invoke(keyword);
  }

  // 创建用户搜索防抖实例
  const _panelDebounce = createDebounce(async (keyword) => {
    if (!keyword?.trim()) { panelSearchResults.value = []; return; }
    const safeKeyword = keyword.trim().slice(0, 20);
    panelSearching.value = true;
    try {
      const res = await searchUsers({ keyword: safeKeyword, page: 1, size: 20 });
      if (res.code === 200 && res.data) {
        panelSearchResults.value = (res.data.content || []).filter(u => u.userId !== userStore.userId);
      }
    } catch (e) {
      console.error('搜索用户失败:', e);
      panelSearchResults.value = [];
      toast.error('搜索失败，请检查网络后重试');
    }
    finally { panelSearching.value = false; }
  }, 300);

  /**
   * 发送好友申请
   * 打开请求弹窗让用户输入申请留言
   * @param {Object} user - 目标用户对象
   */
  function handleAddFriend(user) {
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

    // 打开请求弹窗
    requestDialogMode.value = 'friend';
    requestDialogTarget.value = user;
    requestDialogDefaultMessage.value = `你好，我是${userStore.userName}，希望加你为好友`;
    showRequestDialog.value = true;
  }

  /**
   * 创建群聊
   * 从 ChatSidePanel 的创建群聊表单调用
   * @param {string} groupName - 群聊名称
   */
  async function handleCreateGroup(groupName) {
    const name = (groupName || newGroupName.value || '').trim();
    if (!name) {
      toast.info('请输入群聊名称');
      return;
    }
    try {
      const res = await createGroup({ groupName: name });
      if (res.code === 201) {
        toast.success(`群聊「${name}」创建成功`);
        newGroupName.value = '';
        closeSidePanel();
        loadGroups({ silent: true });
      }
    } catch (error) {
      toast.error(error.message || '创建群聊失败');
    }
  }

  /**
   * 侧面板搜索群聊（带防抖）
   * @param {string} keyword - 搜索关键词
   */
  function handlePanelGroupSearch(keyword) {
    _groupDebounce.invoke(keyword);
  }

  // 创建群聊搜索防抖实例
  const _groupDebounce = createDebounce(async (keyword) => {
    if (!keyword?.trim()) { groupSearchResults.value = []; return; }
    const safeKeyword = keyword.trim().slice(0, 20);
    groupSearching.value = true;
    try {
      const res = await searchGroups({ keyword: safeKeyword, page: 1, size: 20 });
      if (res.code === 200 && res.data) {
        groupSearchResults.value = res.data.content || [];
      }
    } catch (e) {
      console.error('搜索群聊失败:', e);
      groupSearchResults.value = [];
      toast.error('搜索失败，请检查网络后重试');
    }
    finally { groupSearching.value = false; }
  }, 300);

  /**
   * 加入群聊
   * 打开请求弹窗让用户输入申请留言
   * @param {Object} group - 群聊对象
   */
  function handleJoinGroup(group) {
    if (!group?.groupId) return;
    if (joiningGroupIds.value.has(group.groupId)) {
      toast.info('正在发送申请，请稍候');
      return;
    }

    // 打开请求弹窗
    requestDialogMode.value = 'group';
    requestDialogTarget.value = group;
    requestDialogDefaultMessage.value = `你好，我是${userStore.userName}，希望加入群聊「${group.groupName}」`;
    showRequestDialog.value = true;
  }

  /**
   * 从群聊搜索结果发消息 / 切换到群聊
   * @param {Object} group - 群聊对象
   */
  function handleSendMessageToGroup(group) {
    if (!group?.groupId) return;
    closeSidePanel();
    // 返回给 Chat.vue 通过 viewProfile / onSelectGroup 编排
    return group;
  }

  // ==================== 请求弹窗回调 ====================
  /**
   * 请求弹窗确认回调
   * 执行 API 调用发送申请（好友申请或加群申请）
   * @param {string} message - 用户输入的留言内容
   */
  async function onRequestDialogConfirm(message) {
    const target = requestDialogTarget.value;
    if (!message?.trim() || !target) return;

    const isFriend = requestDialogMode.value === 'friend';
    const msg = message.trim();

    if (isFriend) {
      const user = target;
      sendingRequestIds.value.add(user.userId);
      try {
        const res = await sendFriendRequest({ receiverId: user.userId, message: msg });
        if (res.code === 201 || res.code === 200) {
          toast.success(`已向 ${user.userName} 发送好友申请`);
          panelSearchResults.value = [];
          closeSidePanel();
          showRequestDialog.value = false;
        }
      } catch (e) {
        const errorMsg = e?.message || String(e || '');
        if (errorMsg.includes('409') || errorMsg.includes('Conflict')) {
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
          toast.error(errorMsg || '发送申请失败，请重试');
        }
      } finally {
        sendingRequestIds.value.delete(user.userId);
      }
    } else {
      const group = target;
      joiningGroupIds.value.add(group.groupId);
      try {
        const res = await joinGroup(group.groupId, { message: msg });
        if (res.code === 201) {
          toast.success(`已发送加群申请，等待群主「${group.ownerName || '审核'}」`);
          const requestId = res.data?.requestId || res.data?.id || 0;
          if (onJoinRequestSent) {
            onJoinRequestSent({ groupId: group.groupId, groupName: group.groupName, message: msg, requestId });
          }
          groupSearchResults.value = [];
          closeSidePanel();
          showRequestDialog.value = false;
        }
      } catch (e) {
        const errMsg = e?.message || String(e || '');
        if (errMsg.includes('409') || errMsg.includes('已在') || errMsg.includes('成员')) {
          toast.info('你已是该群聊成员');
        } else if (errMsg.includes('申请') || errMsg.includes('pending') || errMsg.includes('待处理')) {
          toast.info('已有待处理的加群申请，请等待群主审核');
        } else {
          toast.error(errMsg || '发送申请失败，请重试');
        }
      } finally {
        joiningGroupIds.value.delete(group.groupId);
      }
    }
  }

  /** 请求弹窗取消回调 */
  function onRequestDialogCancel() {
    showRequestDialog.value = false;
  }

  // ==================== 侦听器 ====================
  // 切换面板模式时重置搜索状态，但 profile 导航保留状态（支持返回后恢复搜索结果）
  watch(sidePanelMode, (newMode, oldMode) => {
    if (newMode === 'profile' || oldMode === 'profile') return;
    resetPanelState();
  });

  // ==================== 生命周期清理 ====================
  // 自清理 debounce 定时器（Chat.vue 的 _cleanupSidePanel 作为额外安全网）
  onBeforeUnmount(() => {
    _panelDebounce?.cancel();
    _groupDebounce?.cancel();
  });

  return {
    // 面板状态
    showSidePanel,
    sidePanelMode,
    groupSubMode,
    panelSearchResults,
    panelSearching,
    groupSearchResults,
    groupSearching,
    newGroupName,
    sendingRequestIds,
    joiningGroupIds,
    // 请求弹窗状态
    showRequestDialog,
    requestDialogMode,
    requestDialogTarget,
    requestDialogDefaultMessage,
    // 面板操作
    openSidePanel,
    closeSidePanel,
    handleGroupAction,
    handlePanelSearch,
    handlePanelGroupSearch,
    handleAddFriend,
    handleCreateGroup,
    handleJoinGroup,
    handleSendMessageToGroup,
    // 请求弹窗回调
    onRequestDialogConfirm,
    onRequestDialogCancel,
    // 清理（Chat.vue 双重保险）
    _cleanupSidePanel() {
      _panelDebounce?.cancel();
      _groupDebounce?.cancel();
    },
  };
}
