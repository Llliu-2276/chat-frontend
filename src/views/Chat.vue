<!--
 * 聊天主页面（容器组件）
 * 编排三个子组件：ChatLeftPanel + ChatMessageArea + ChatSidePanel
 * 所有状态管理、API 调用、WebSocket 事件处理集中在此
 -->
<template>
  <div class="chat-page">
    <!-- 背景层 -->
    <div class="chat-background"><h1>chat</h1></div>

    <!-- 内容区包装 -->
    <div class="chat-wrapper">
      <!-- 左侧面板 -->
      <ChatLeftPanel
        :friends="friends"
        :groups="groups"
        :selected-friend-id="chatTarget?.userId ?? null"
        :selected-group-id="chatTarget?.groupId ?? null"
        :chat-type="chatType"
        :user-name="userStore.userName"
        :is-logged-in="userStore.isLoggedIn"
        :is-logging-out="isLoggingOut"
        :friends-expanded="friendsExpanded"
        :groups-expanded="groupsExpanded"
        :notifications-expanded="notificationsExpanded"
        :pending-request-count="pendingRequestCount"
        :group-notification-count="groupNotificationUnreadCount"
        :active-view="activeView"
        :mobile-show="mobileView === 'list'"
        :loading-friends="loadingFriends"
        :invite-mode="inviteMode"
        :invite-group-name="inviteTargetName"
        :invite-group-member-ids="inviteGroupMemberIds"
        @select-friend="onSelectFriend"
        @select-group="onSelectGroup"
        @toggle-friends="toggleFriends"
        @toggle-groups="toggleGroups"
        @toggle-notifications="toggleNotifications"
        @group-action="handleGroupAction"
        @logout="handleLogout"
        @open-side-panel="openSidePanel"
        @open-notifications="openFriendNotifications"
        @open-group-notifications="openGroupNotifications"
        @open-profile="openSelfProfile"
        @confirm-invite="handleConfirmInvite"
        @cancel-invite="cancelInviteMode"
      />

      <!-- 聊天消息区 / 通知面板（条件渲染） -->
      <template v-if="activeView === 'notifications' || activeView === 'notifications-group'">
        <ChatNotificationPanel
          :received-requests="receivedRequests"
          :sent-requests="sentRequests"
          :loading-received="loadingReceived"
          :loading-sent="loadingSent"
          :loading-more-received="loadingMoreReceived"
          :loading-more-sent="loadingMoreSent"
          :has-more-received="hasMoreReceived"
          :has-more-sent="hasMoreSent"
          :pending-count="pendingRequestCount"
          :group-notifications="groupNotifications"
          :join-group-requests="joinGroupRequests"
          :group-invites="groupInvites"
          :initial-tab="notificationTab"
          :mobile-show="mobileView === 'chat'"
          :current-user-id="userStore.userId"
          @handle-request="onHandleRequest"
          @handle-join-request="handleJoinRequestAction"
          @handle-group-invite="onHandleGroupInvite"
          @load-more="loadMoreRequests"
          @back-to-list="mobileView = 'list'"
          @view-profile="onViewProfile"
        />
      </template>
      <template v-else>
        <ChatMessageArea
          :chat-target="chatTarget"
          :chat-type="chatType"
          :messages="messages"
          :user-name="userStore.userName"
          :user-id="userStore.userId"
          :is-sending="isSending"
          :loading-messages="loadingMessages"
          :loading-more="loadingMore"
          :has-more-messages="hasMoreMessages"
          :mobile-show="mobileView === 'chat'"
          :dimmed="inviteMode"
          @send="onSendMessage"
          @scroll-top="handleScroll"
          @back-to-list="mobileView = 'list'"
          @view-profile="viewProfile"
          @recall-message="onRecallMessage"
          ref="messageAreaRef"
        />
      </template>

      <!-- 侧面板 -->
      <ChatSidePanel
        :visible="showSidePanel"
        :mode="sidePanelMode"
        :group-sub-mode="groupSubMode"
        :search-results="panelSearchResults"
        :searching="panelSearching"
        :friends="friends"
        :groups="groups"
        :sent-requests="sentRequests"
        :sending-request-ids="sendingRequestIds"
        :group-search-results="groupSearchResults"
        :group-searching="groupSearching"
        :joining-group-ids="joiningGroupIds"
        :profile-user="profileUser"
        :profile-context="profileContext"
        :profile-loading="profileLoading"
        :is-group-member="isGroupMember"
        :dimmed="inviteMode"
        @close="handlePanelClose"
        @search="handlePanelSearch"
        @add-friend="handleAddFriend"
        @create-group="handleCreateGroup"
        @join-group="handleJoinGroup"
        @group-search="handlePanelGroupSearch"
        @send-message-to-group="handleSendMessageToGroup"
        @edit-username="handleEditUsername"
        @change-password="handleChangePassword"
        @send-message-to="handleSendMessageTo"
        @add-friend-from-profile="handleAddFriendFromProfile"
        @delete-friend="handleDeleteFriend"
        @dissolve-or-leave-group="handleDissolveOrLeaveGroup"
        @transfer-owner="(group, member) => handleTransferOwner(group, member)"
        @kick-member="(group, member) => handleKickMember(group, member)"
        @open-invite="openInviteFromProfile"
        @edit-group-name="(group, newName) => handleEditGroupName(group, newName)"
        @view-profile="viewProfile"
        @logout="handleLogout"
      />
    </div>

    <!-- 请求弹窗（好友申请 / 加群申请） -->
    <RequestDialog
      v-model="showRequestDialog"
      :mode="requestDialogMode"
      :target-name="(requestDialogTarget?.userName || requestDialogTarget?.groupName) || ''"
      :target-account="(requestDialogTarget?.userAccount || requestDialogTarget?.account) || ''"
      :target-extra="requestDialogTarget?.memberCount != null ? requestDialogTarget.memberCount + ' 人' : ''"
      :default-message="requestDialogDefaultMessage"
      @confirm="onRequestDialogConfirm"
      @cancel="onRequestDialogCancel"
    />
  </div>
</template>

<script setup>
/**
 * 聊天主页面（容器组件）
 * 编排子组件 + 协调 Composables，自身仅保留：
 *   - 登出逻辑
 *   - 好友/群聊选择（跨 composable 编排）
 *   - 定时器生命周期
 *   - WebSocket 连接初始化
 */
defineOptions({ name: 'Chat' });

import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { wsManager } from '@/utils/websocket';
import { ElMessageBox, ElMessage } from 'element-plus';

import ChatLeftPanel from '@/components/chat/ChatLeftPanel.vue';
import ChatMessageArea from '@/components/chat/ChatMessageArea.vue';
import ChatSidePanel from '@/components/chat/ChatSidePanel.vue';
import ChatNotificationPanel from '@/components/chat/ChatNotificationPanel.vue';
import RequestDialog from '@/components/chat/RequestDialog.vue';

import { useFriendList } from '@/composables/useFriendList';
import { inviteToGroup, getGroupMembers } from '@/api/group';
import { useChatMessages } from '@/composables/useChatMessages';
import { useNotifications } from '@/composables/useNotifications';
import { useSidePanel } from '@/composables/useSidePanel';
import { useProfile } from '@/composables/useProfile';

const userStore = useUserStore();
const router = useRouter();
const toast = inject('toast');

// ==================== 初始化 Composables ====================
const {
  friends, groups, loadingFriends,
  chatTarget, chatType, mobileView, activeView,
  friendsExpanded, groupsExpanded, notificationsExpanded,
  groupNotifications,
  toggleFriends, toggleGroups, toggleNotifications,
  onSelectFriend: _selectFriend, onSelectGroup: _selectGroup,
  loadFriends, loadGroups, fetchUnreadMessages,
  loadGroupNotificationsHistory,
  markAllGroupNotificationsAsRead,
} = useFriendList(toast);

// 消息区域组件模板 ref
const messageAreaRef = ref(null);

const {
  messages, loadingMessages, loadingMore, isSending, hasMoreMessages,
  resetChat, loadChatHistory, onSendMessage, handleScroll, recallMessage,
} = useChatMessages(chatTarget, chatType, friends, messageAreaRef, userStore, toast);

const {
  receivedRequests, sentRequests,
  loadingReceived, loadingSent,
  loadingMoreReceived, loadingMoreSent,
  hasMoreReceived, hasMoreSent,
  pendingRequestCount,
  joinGroupRequests,
  groupInvites,
  openNotifications,
  loadMoreReceived, loadMoreSent,
  onHandleRequest, handleJoinRequestAction,
  _cleanupNotifications,
  addSelfJoinRequest,
  loadJoinRequestsHistory,
  markAllJoinRequestsAsRead,
  loadGroupInvitesHistory,
  markAllGroupInvitesAsRead,
  onHandleGroupInvite,
} = useNotifications({ loadFriends, loadGroups, groups, activeView, chatTarget, mobileView, userId: userStore.userId, toast });

const {
  showSidePanel, sidePanelMode, groupSubMode,
  panelSearchResults, panelSearching,
  groupSearchResults, groupSearching,
  sendingRequestIds, joiningGroupIds,
  handleGroupAction, openSidePanel, closeSidePanel,
  handlePanelSearch, handlePanelGroupSearch, handleAddFriend,
  handleCreateGroup, handleJoinGroup, handleSendMessageToGroup: _sendMessageToGroup,
  showRequestDialog, requestDialogMode, requestDialogTarget, requestDialogDefaultMessage,
  onRequestDialogConfirm, onRequestDialogCancel,
  _cleanupSidePanel,
} = useSidePanel({ toast, sentRequests, loadGroups, onJoinRequestSent: handleJoinRequestSent });

const {
  profileUser, profileContext, profileLoading,
  isGroupMember,
  handlePanelClose,
  openSelfProfile, onViewProfile, onViewGroupProfile,
  handleEditUsername, handleChangePassword, handleDeleteFriend,
  handleDissolveOrLeaveGroup,
  handleTransferOwner, handleKickMember, handleEditGroupName,
  handleSendMessageTo: _sendMessageTo, handleAddFriendFromProfile: _addFriendFromProfile,
} = useProfile({ toast, friends, groups, chatTarget, chatType, resetChat, closeSidePanel, loadFriends, loadGroups, sidePanelMode, groupSubMode, showSidePanel });

// ==================== 群通知未读计数 ====================
const groupNotificationUnreadCount = computed(() => {
  const notifUnread = groupNotifications.value.filter(n => n.isRead === false).length;
  const joinUnread = joinGroupRequests.value.filter(r => r.isRead === false && r.status === 0).length;
  const inviteUnread = groupInvites.value.filter(i => i.isRead === false).length;
  return notifUnread + joinUnread + inviteUnread;
});

// ==================== 通知面板 Tab 控制 ====================
const notificationTab = ref('friend');

function openFriendNotifications() {
  notificationTab.value = 'friend';
  openNotifications();
}

function openGroupNotifications() {
  notificationTab.value = 'group';
  // 先标记所有现有通知为已读（更新 lastReadAt），再加载 REST 历史
  // 这样 REST 加载的历史数据 sendTime <= lastReadAt，自动得到 isRead: true
  markAllGroupNotificationsAsRead();
  markAllJoinRequestsAsRead();
  markAllGroupInvitesAsRead();
  // 直接设置 activeView，不走 openNotifications()（群聊通知不需要加载好友申请数据）
  activeView.value = 'notifications-group';
  chatTarget.value = null;
  mobileView.value = 'chat';
  // 补充加载 REST 历史数据（入群申请 + 群通知 + 入群邀请），弥补实时 WS 推送的不足
  loadJoinRequestsHistory();
  loadGroupNotificationsHistory();
  loadGroupInvitesHistory();
}

/**
 * 用户发出入群申请后的回调
 * 记录申请到通知列表 + 自动打开群聊通知面板让用户看到自己的申请
 * @param {Object} data - { groupId, groupName }
 */
function handleJoinRequestSent(data) {
  console.log('[Chat] 入群申请已发送，记录到通知列表:', data);
  addSelfJoinRequest(data);
  // 标记现有通知为已读，然后切换到群聊通知面板
  markAllGroupNotificationsAsRead();
  markAllJoinRequestsAsRead();
  notificationTab.value = 'group';
  activeView.value = 'notifications-group';
  chatTarget.value = null;
  mobileView.value = 'chat';
}

// ==================== 登出 ====================
const isLoggingOut = ref(false);

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要登出吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      customClass: 'confirm-dialog',
    });
  } catch { return; }
  isLoggingOut.value = true;
  try { await userStore.logout(); }
  catch { toast.error('登出失败，请重试'); }
  finally { isLoggingOut.value = false; }
}

/**
 * 统一资料查看入口——根据对象类型分发到用户资料或群聊资料
 * @param {Object} target - 用户或群聊对象
 */
function viewProfile(target) {
  if (target?.groupId) {
    onViewGroupProfile(target);
  } else {
    onViewProfile(target);
  }
}

// ==================== 资料卡快捷操作（编排层） ====================
/**
 * 从资料卡发消息给用户
 * @param {Object} user - 目标用户
 */
function handleSendMessageTo(user) {
  const result = _sendMessageTo(user);
  if (result) onSelectFriend(result);
}

/**
 * 从资料卡添加好友（陌生人视角）
 * @param {Object} user - 目标用户
 */
function handleAddFriendFromProfile(user) {
  const result = _addFriendFromProfile(user);
  if (result) handleAddFriend(result);
}

/**
 * 从群聊搜索结果切换到群聊
 * @param {Object} group - 群聊对象
 */
function handleSendMessageToGroup(group) {
  const result = _sendMessageToGroup(group);
  if (result) onSelectGroup(result);
}

// ==================== 好友/群聊选择（跨 composable 编排） ====================
async function onSelectFriend(friend) {
  _selectFriend(friend);
  resetChat();
  await loadChatHistory(false);
}

async function onSelectGroup(group) {
  _selectGroup(group);
  resetChat();
  await loadChatHistory(false);
}

/**
 * 撤回消息（ChatMessageArea emit → useChatMessages）
 * @param {Object} msg - 要撤回的消息对象
 */
function onRecallMessage(msg) {
  recallMessage(msg);
}

// ==================== 邀请好友入群 ====================
const inviteMode = ref(false);
const inviteGroupId = ref(null);
const inviteTargetName = ref('');
const inviteGroupMemberIds = ref([]);  // 目标群已有成员的 userId 列表，用于过滤邀请列表

/** 从群资料卡打开邀请模式 */
async function openInviteFromProfile(group) {
  if (!group?.groupId) return;
  inviteGroupId.value = group.groupId;
  inviteTargetName.value = group.groupName || '群聊';
  inviteMode.value = true;
  // 异步获取群成员列表，用于过滤已在群中的好友
  try {
    const res = await getGroupMembers(group.groupId);
    if (res.code === 200 && Array.isArray(res.data)) {
      inviteGroupMemberIds.value = res.data.map(m => m.userId);
    }
  } catch { /* 静默失败——若获取失败则不过滤，前端让后端兜底校验 */ }
}

/** 确认邀请选中的好友 */
async function handleConfirmInvite({ userIds, message }) {
  if (!inviteGroupId.value || !userIds?.length) return;
  const results = { success: [], alreadyMember: [], alreadyInvited: [], error: [] };

  for (const userId of userIds) {
    const userName = friends.value.find(f => f.userId === userId)?.userName || `用户${userId}`;
    try {
      const res = await inviteToGroup(inviteGroupId.value, userId, message ? { message } : {});
      if (res.code === 201 || res.code === 200) {
        results.success.push(userName);
      } else {
        results.error.push(`${userName}（${res.message || '未知错误'}）`);
      }
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('已在群') || msg.includes('已加入') || msg.includes('已是群成员')) {
        results.alreadyMember.push(userName);
      } else if (msg.includes('已邀请') || msg.includes('重复') || msg.includes('已发送')) {
        results.alreadyInvited.push(userName);
      } else {
        results.error.push(userName + (msg ? `：${msg}` : ''));
      }
    }
  }

  if (results.success.length) toast.success(`已向 ${results.success.join('、')} 发送邀请`);
  if (results.alreadyMember.length) toast.warning(`${results.alreadyMember.join('、')} 已在群聊中，无需邀请`);
  if (results.alreadyInvited.length) toast.warning(`已向 ${results.alreadyInvited.join('、')} 发送过邀请，请等待对方确认`);
  if (results.error.length) toast.error(results.error.join('；'));
  cancelInviteMode();
}

/** 取消邀请模式 */
function cancelInviteMode() {
  inviteMode.value = false;
  inviteGroupId.value = null;
  inviteTargetName.value = '';
  inviteGroupMemberIds.value = [];
}

// ==================== 通知面板：加载更多（同时加载收到与发出） ====================
function loadMoreRequests() {
  if (hasMoreReceived.value) loadMoreReceived();
  if (hasMoreSent.value) loadMoreSent();
}

// ==================== WebSocket 认证错误处理 ====================
function handleWsAuthError(msg) {
  if (msg.error?.includes('认证') || msg.error?.includes('Token') || msg.error?.includes('未授权') || msg.error?.includes('登录')) {
    console.error('[Chat] WebSocket 认证失败，强制登出');
    ElMessage.error('登录已过期，请重新登录');
    userStore.clearUserState();
    router.push('/login');
  }
}

// ==================== 生命周期 ====================
let unreadTimer = null, friendListTimer = null, groupListTimer = null;

onMounted(async () => {
  // 注册 WS 认证错误处理
  wsManager.on('ERROR', handleWsAuthError);

  // WebSocket 连接（各 composable 已自行注册事件监听）
  if (!wsManager.isConnected && !wsManager.isConnecting) wsManager.connect();

  await loadFriends();
  await loadGroups();
  await fetchUnreadMessages();
  // 后台轮询：静默失败，不弹 toast 打扰用户
  unreadTimer = setInterval(() => fetchUnreadMessages({ silent: true }), 30000);
  friendListTimer = setInterval(() => loadFriends({ silent: true }), 60000);
  groupListTimer = setInterval(() => loadGroups({ silent: true }), 60000);
});

onBeforeUnmount(() => {
  wsManager.off('ERROR', handleWsAuthError);
  if (unreadTimer) clearInterval(unreadTimer);
  if (friendListTimer) clearInterval(friendListTimer);
  if (groupListTimer) clearInterval(groupListTimer);
  _cleanupNotifications();
  _cleanupSidePanel();
});
</script>

<style scoped>
/* ==================== 页面布局 ==================== */
.chat-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chat-background {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  pointer-events: none;
  background-color: #fff;
}

.chat-background h1 {
  font-size: 768px;
  font-weight: bold;
  font-style: italic;
  color: #62d2a2;
  margin: 0;
  line-height: 1;
  user-select: none;
  letter-spacing: -20px;
}

.chat-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 16px;
  width: 100%;
  max-width: 1450px;
  height: calc(100vh - 60px);
  padding: 0 16px;
}

/* ==================== 响应式 ==================== */
@media (max-width: 1199px) {
  .chat-wrapper { padding: 0; }
}
@media (max-width: 767px) {
  .chat-page { padding: 0; align-items: stretch; }
  .chat-background h1 { font-size: 300px; }
  .chat-wrapper {
    padding: 0;
    gap: 0;
    max-width: 100%;
    height: 100vh;
  }
}
</style>

<!-- ElMessageBox confirm 弹框样式（unscoped，渲染在 body 下） -->
<style>
/* ==================== 确认弹窗（登出/删除好友等） ==================== */
.confirm-dialog {
  border-radius: 16px !important;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06) !important;
}

.confirm-dialog .el-message-box__header {
  padding: 22px 24px 12px;
  border-bottom: none;
}

.confirm-dialog .el-message-box__title {
  font-size: 17px;
  font-weight: 700;
  color: #333;
}

.confirm-dialog .el-message-box__btns {
  padding: 12px 24px 20px;
}
.confirm-dialog .el-message-box__content {
  padding: 0 24px 20px;
}
.confirm-dialog .el-message-box__message p {
  font-size: 14px; color: #555; line-height: 1.6;
}
/* 按钮：确认危险操作=红  取消=绿 */
.confirm-dialog .el-button--primary {
  background: rgba(224, 83, 83, 0.18);
  color: #333;
  border: 1.5px solid rgba(224, 83, 83, 0.45);
  border-radius: 8px; padding: 8px 24px; font-weight: 600;
}
.confirm-dialog .el-button--primary:hover {
  background: rgba(224, 83, 83, 0.3);
  box-shadow: 0 2px 8px rgba(224, 83, 83, 0.2);
  transform: translateY(-2px);
}
.confirm-dialog .el-button:not(.el-button--primary) {
  background: rgba(56, 239, 125, 0.22);
  color: #333;
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  border-radius: 8px; padding: 8px 24px; font-weight: 600;
}
.confirm-dialog .el-button:not(.el-button--primary):hover {
  background: rgba(56, 239, 125, 0.35);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
  transform: translateY(-1px);
}
</style>
