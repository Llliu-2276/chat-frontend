/**
 * 侧面板管理 Composable
 * 负责侧面板的显示状态、搜索用户、发送好友申请、群聊操作
 *
 * @module composables/useSidePanel
 */
import { ref, watch } from 'vue';
import { searchUsers } from '@/api/user';
import { sendFriendRequest } from '@/api/friend';
import { createGroup } from '@/api/group';
import { useUserStore } from '@/stores/user';
import { ElMessageBox } from 'element-plus';

/**
 * 侧面板管理
 * @param {Object} options - 依赖注入
 * @param {Object} options.toast - Toast 通知对象
 * @param {import('vue').Ref<Array>} options.sentRequests - 已发出的好友申请列表 ref（用于检查重复申请）
 * @param {Function} options.loadGroups - 刷新群聊列表的回调（来自 useFriendList）
 */
export function useSidePanel({ toast, sentRequests, loadGroups }) {
  const userStore = useUserStore();

  // ==================== 面板状态 ====================
  const showSidePanel = ref(false);
  const sidePanelMode = ref('friend');
  const groupSubMode = ref('join');
  const panelSearchResults = ref([]);
  const panelSearching = ref(false);
  const newGroupName = ref('');
  let panelSearchTimer = null;

  /** 正在发送申请的用户ID集合（防重复提交） */
  const sendingRequestIds = ref(new Set());

  // ==================== 面板操作 ====================
  /** 重置面板状态 */
  function resetPanelState() {
    panelSearchResults.value = [];
    panelSearching.value = false;
    newGroupName.value = '';
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
    // 后端约束：关键词最长20字符
    const safeKeyword = keyword.trim().slice(0, 20);
    panelSearchTimer = setTimeout(async () => {
      panelSearching.value = true;
      try {
        const res = await searchUsers({ keyword: safeKeyword, page: 1, size: 20 });
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
        const errorMsg = e.message || '';
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
      }
    } finally {
      sendingRequestIds.value.delete(user.userId);
    }
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
        loadGroups();
      }
    } catch (error) {
      toast.error(error.message || '创建群聊失败');
    }
  }

  /** 加入群聊（提示功能规划中） */
  function handleJoinGroup() {
    toast.info('加入群聊功能将在后续版本实现');
  }

  // ==================== 侦听器 ====================
  // 切换面板模式时重置搜索状态，但 profile 导航保留状态（支持返回后恢复搜索结果）
  watch(sidePanelMode, (newMode, oldMode) => {
    if (newMode === 'profile' || oldMode === 'profile') return;
    resetPanelState();
  });

  return {
    // 面板状态
    showSidePanel,
    sidePanelMode,
    groupSubMode,
    panelSearchResults,
    panelSearching,
    newGroupName,
    sendingRequestIds,
    // 面板操作
    openSidePanel,
    closeSidePanel,
    handleGroupAction,
    handlePanelSearch,
    handleAddFriend,
    handleCreateGroup,
    handleJoinGroup,
    // 清理
    _cleanupSidePanel() {
      if (panelSearchTimer) { clearTimeout(panelSearchTimer); panelSearchTimer = null; }
    },
  };
}
