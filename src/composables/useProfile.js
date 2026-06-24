/**
 * 个人资料管理 Composable
 * 负责用户资料查看、编辑（用户名/密码）、好友删除、面板导航历史
 *
 * @module composables/useProfile
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { updateUserName, changePassword } from '@/api/user';
import { deleteFriend } from '@/api/friend';
import { dissolveOrLeaveGroup, transferGroupOwner, kickGroupMember, updateGroupInfo } from '@/api/group';
import { ElMessageBox } from 'element-plus';

/**
 * 个人资料管理
 * @param {Object} options - 依赖注入
 * @param {Object} options.toast - Toast 通知对象
 * @param {import('vue').Ref<Array>} options.friends - 好友列表 ref
 * @param {import('vue').Ref} options.chatTarget - 当前聊天对象 ref
 * @param {import('vue').Ref<string>} options.chatType - 聊天类型 ref
 * @param {Function} options.resetChat - 重置聊天状态
 * @param {Function} options.closeSidePanel - 关闭侧面板
 * @param {Function} options.loadFriends - 刷新好友列表
 * @param {import('vue').Ref<string>} options.sidePanelMode - 面板模式 ref
 * @param {import('vue').Ref<string>} options.groupSubMode - 群组子模式 ref
 * @param {import('vue').Ref<boolean>} options.showSidePanel - 面板可见性 ref
 */
export function useProfile({ toast, friends, groups, chatTarget, chatType, resetChat, closeSidePanel, loadFriends, loadGroups, sidePanelMode, groupSubMode, showSidePanel }) {
  const userStore = useUserStore();
  const router = useRouter();

  // ==================== Profile 状态 ====================
  const profileUser = ref(null);         // 当前查看的用户对象
  const profileContext = ref('self');    // 'self' | 'friend' | 'stranger' | 'group'
  const profileLoading = ref(false);     // Profile 操作加载中
  /** 面板导航历史栈，用于 profile 返回上一视图 */
  const panelHistory = ref([]);

  // ==================== 工具函数 ====================
  /** 判断用户是否为好友 */
  function isFriend(userId) {
    return friends.value.some(f => f.userId === userId);
  }

  /** 判断当前查看的群聊用户是否已加入（computed 确保响应式） */
  const isGroupMember = computed(() => {
    if (!profileUser.value?.groupId) return false;
    return groups.value.some(g => g.groupId === profileUser.value.groupId);
  });

  // ==================== 面板导航 ====================
  /**
   * 关闭面板或返回上一视图
   * 如果当前是 profile 模式且从其他视图导航而来，返回到上一视图而非直接关闭
   */
  function handlePanelClose() {
    if (sidePanelMode.value === 'profile' && panelHistory.value.length > 0) {
      const prev = panelHistory.value.pop();
      sidePanelMode.value = prev.mode;
      groupSubMode.value = prev.groupSubMode;
      profileUser.value = null;
      profileContext.value = 'self';
    } else {
      closeSidePanel();
      panelHistory.value = [];
      profileUser.value = null;
    }
  }

  // ==================== 查看资料 ====================
  /** 打开本人的个人资料 */
  function openSelfProfile() {
    profileUser.value = userStore.userInfo;
    profileContext.value = 'self';
    profileLoading.value = false;
    showSidePanel.value = true;
    sidePanelMode.value = 'profile';
  }

  /**
   * 查看用户资料（从搜索结果或聊天头部）
   * @param {Object} user - 要查看的用户对象
   */
  function onViewProfile(user) {
    if (!user?.userId) return;
    // 如果是当前用户自己，走 self 视角
    if (user.userId === userStore.userId) {
      openSelfProfile();
      return;
    }
    // 从其他面板视图导航到 profile 时，记录当前视图以便返回
    if (showSidePanel.value && sidePanelMode.value !== 'profile') {
      panelHistory.value.push({
        mode: sidePanelMode.value,
        groupSubMode: groupSubMode.value,
      });
    }
    profileUser.value = user;
    profileContext.value = isFriend(user.userId) ? 'friend' : 'stranger';
    profileLoading.value = false;
    showSidePanel.value = true;
    sidePanelMode.value = 'profile';
  }

  // ==================== 编辑操作 ====================
  /**
   * 修改用户名
   * @param {string} newName - 新的用户名
   */
  async function handleEditUsername(newName) {
    profileLoading.value = true;
    try {
      const res = await updateUserName({ userName: newName });
      if (res.code === 200) {
        userStore.updateUserInfo({ userName: newName });
        profileUser.value = { ...profileUser.value, userName: newName };
        toast.success('用户名修改成功');
      }
    } catch (error) {
      toast.error(error.message || '修改失败');
    } finally {
      profileLoading.value = false;
    }
  }

  /**
   * 修改密码
   * @param {Object} data - { oldPassword, newPassword }
   */
  async function handleChangePassword({ oldPassword, newPassword }) {
    profileLoading.value = true;
    try {
      await changePassword({ oldPassword, newPassword });
      toast.success('密码修改成功，请重新登录');
      // 完整登出链条：清状态 + 跳转登录页
      userStore.clearUserState();
      router.push('/login');
    } catch (error) {
      toast.error(error.message || '密码修改失败');
      profileLoading.value = false;
    }
  }

  /**
   * 删除好友
   * 弹出确认框后调用后端接口，成功后关闭面板并刷新好友列表
   * @param {Object} user - 要删除的好友用户对象
   */
  async function handleDeleteFriend(user) {
    if (!user?.userId) return;
    try {
      await ElMessageBox.confirm(
        `确定要删除好友「${user.userName}」吗？聊天记录将被清除且无法恢复。`,
        '删除好友',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'confirm-dialog',
        }
      );
    } catch { return; }
    try {
      const res = await deleteFriend(user.userId);
      if (res.code === 200) {
        toast.success(`已删除好友「${user.userName}」`);
        closeSidePanel();
        // 如果当前正在和该好友聊天，重置聊天区
        if (chatTarget.value?.userId === user.userId && chatType.value === 'friend') {
          chatTarget.value = null;
          resetChat();
        }
        await loadFriends({ silent: true });
      }
    } catch (error) {
      toast.error(error.message || '删除好友失败，请重试');
    }
  }

  /**
   * 查看群聊资料
   * @param {Object} group - 群聊对象
   */
  function onViewGroupProfile(group) {
    if (!group?.groupId) return;
    if (showSidePanel.value && sidePanelMode.value !== 'profile') {
      panelHistory.value.push({
        mode: sidePanelMode.value,
        groupSubMode: groupSubMode.value,
      });
    }
    profileUser.value = group;
    profileContext.value = 'group';
    profileLoading.value = false;
    showSidePanel.value = true;
    sidePanelMode.value = 'profile';
  }

  /**
   * 解散或退出群聊
   * @param {Object} group - 群聊对象
   */
  async function handleDissolveOrLeaveGroup(group) {
    if (!group?.groupId) return;
    const isOwner = group.isOwner;
    const actionText = isOwner ? '解散群聊' : '退出群聊';
    const warnText = isOwner
      ? `确定要解散「${group.groupName}」吗？所有成员将被移除，聊天记录将被清除且无法恢复。`
      : `确定要退出「${group.groupName}」吗？`;
    try {
      await ElMessageBox.confirm(warnText, actionText, {
        confirmButtonText: isOwner ? '确定解散' : '确定退出',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'confirm-dialog',
      });
    } catch { return; }
    try {
      const res = await dissolveOrLeaveGroup(group.groupId);
      if (res.code === 200) {
        toast.success(isOwner ? '群聊已解散' : '已退出群聊');
        closeSidePanel();
        if (chatTarget.value?.groupId === group.groupId && chatType.value === 'group') {
          chatTarget.value = null;
          resetChat();
        }
        loadGroups({ silent: true }); // 刷新群列表（已弹 toast，静默刷新）
      }
    } catch (error) {
      toast.error(error.message || '操作失败，请重试');
    }
  }

  /**
   * 转让群主
   * @param {Object} group - 群聊对象
   * @param {Object} targetMember - 目标成员对象（含 userId, userName）
   */
  async function handleTransferOwner(group, targetMember) {
    if (!group?.groupId || !targetMember?.userId) return;
    try {
      await ElMessageBox.confirm(
        `确定将群主转让给「${targetMember.userName}」吗？转让后你将失去群主权限。`,
        '转让群主',
        { confirmButtonText: '确定转让', cancelButtonText: '取消', type: 'warning', customClass: 'confirm-dialog' }
      );
    } catch { return; }
    try {
      const res = await transferGroupOwner(group.groupId, targetMember.userId);
      if (res.code === 200) {
        toast.success(`群主已转让给「${targetMember.userName}」`);
        closeSidePanel();
        loadGroups({ silent: true });
      }
    } catch (error) {
      toast.error(error.message || '转让失败，请重试');
    }
  }

  /**
   * 踢出群成员
   * @param {Object} group - 群聊对象
   * @param {Object} targetMember - 目标成员对象（含 userId, userName）
   */
  async function handleKickMember(group, targetMember) {
    if (!group?.groupId || !targetMember?.userId) return;
    try {
      await ElMessageBox.confirm(
        `确定将「${targetMember.userName}」踢出群聊吗？`,
        '踢出成员',
        { confirmButtonText: '确定踢出', cancelButtonText: '取消', type: 'warning', customClass: 'confirm-dialog' }
      );
    } catch { return; }
    try {
      const res = await kickGroupMember(group.groupId, targetMember.userId);
      if (res.code === 200) {
        toast.success(`已将「${targetMember.userName}」踢出群聊`);
        closeSidePanel();
        loadGroups({ silent: true });
      }
    } catch (error) {
      toast.error(error.message || '踢出失败，请重试');
    }
  }

  /**
   * 编辑群聊名称（仅群主）
   * @param {Object} group - 群聊对象
   * @param {string} newName - 新群名称
   */
  async function handleEditGroupName(group, newName) {
    if (!group?.groupId || !newName?.trim()) return;
    const trimmedName = newName.trim();
    if (trimmedName === group.groupName) return;
    profileLoading.value = true;
    try {
      const res = await updateGroupInfo(group.groupId, { groupName: trimmedName });
      if (res.code === 200) {
        // 更新 profileUser 中的群名
        profileUser.value = { ...profileUser.value, groupName: trimmedName };
        // 同步更新群列表中的群名（groups ref 来自 useFriendList）
        const idx = groups.value.findIndex(g => g.groupId === group.groupId);
        if (idx !== -1) {
          groups.value[idx] = { ...groups.value[idx], groupName: trimmedName };
        }
        toast.success('群名称修改成功');
      }
    } catch (error) {
      toast.error(error.message || '修改群名称失败，请重试');
    } finally {
      profileLoading.value = false;
    }
  }

  // ==================== 资料卡快捷操作 ====================
  /**
   * 从资料卡发消息给用户
   * @param {Object} user - 目标用户
   */
  function handleSendMessageTo(user) {
    if (!user?.userId) return;
    closeSidePanel();
    // 返回给 Chat.vue 通过 onSelectFriend 编排
    return user;
  }

  /**
   * 从资料卡添加好友（陌生人视角）
   * @param {Object} user - 目标用户
   */
  function handleAddFriendFromProfile(user) {
    // 返回给 Chat.vue，由 handleAddFriend 处理
    return user;
  }

  return {
    // 状态
    profileUser,
    profileContext,
    profileLoading,
    // 工具
    isFriend,
    isGroupMember,
    // 面板导航
    handlePanelClose,
    // 查看资料
    openSelfProfile,
    onViewProfile,
    // 编辑操作
    handleEditUsername,
    handleChangePassword,
    handleDeleteFriend,
    onViewGroupProfile,
    handleDissolveOrLeaveGroup,
    handleTransferOwner,
    handleKickMember,
    handleEditGroupName,
    // 快捷操作
    handleSendMessageTo,
    handleAddFriendFromProfile,
  };
}
