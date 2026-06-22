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
        :group-notification-count="groupNotifications.length"
        :active-view="activeView"
        :mobile-show="mobileView === 'list'"
        :loading-friends="loadingFriends"
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
          :initial-tab="notificationTab"
          :mobile-show="mobileView === 'chat'"
          @handle-request="onHandleRequest"
          @handle-join-request="handleJoinRequestAction"
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
          @send="onSendMessage"
          @scroll-top="handleScroll"
          @back-to-list="mobileView = 'list'"
          @view-profile="viewProfile"
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
        @view-profile="viewProfile"
        @logout="handleLogout"
      />
    </div>
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
import { ref, inject, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { wsManager } from '@/utils/websocket';
import { ElMessageBox, ElMessage } from 'element-plus';

import ChatLeftPanel from '@/components/chat/ChatLeftPanel.vue';
import ChatMessageArea from '@/components/chat/ChatMessageArea.vue';
import ChatSidePanel from '@/components/chat/ChatSidePanel.vue';
import ChatNotificationPanel from '@/components/chat/ChatNotificationPanel.vue';

import { useFriendList } from '@/composables/useFriendList';
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
} = useFriendList(toast);

// 消息区域组件模板 ref
const messageAreaRef = ref(null);

const {
  messages, loadingMessages, loadingMore, isSending, hasMoreMessages,
  resetChat, loadChatHistory, onSendMessage, handleScroll,
} = useChatMessages(chatTarget, chatType, friends, messageAreaRef, userStore, toast);

const {
  receivedRequests, sentRequests,
  loadingReceived, loadingSent,
  loadingMoreReceived, loadingMoreSent,
  hasMoreReceived, hasMoreSent,
  pendingRequestCount,
  joinGroupRequests,
  openNotifications,
  loadMoreReceived, loadMoreSent,
  onHandleRequest, handleJoinRequestAction,
  _cleanupNotifications,
  addSelfJoinRequest,
  loadJoinRequestsHistory,
} = useNotifications({ loadFriends, loadGroups, groups, activeView, chatTarget, mobileView, toast });

const {
  showSidePanel, sidePanelMode, groupSubMode,
  panelSearchResults, panelSearching,
  groupSearchResults, groupSearching,
  sendingRequestIds, joiningGroupIds,
  handleGroupAction, openSidePanel, closeSidePanel,
  handlePanelSearch, handlePanelGroupSearch, handleAddFriend,
  handleCreateGroup, handleJoinGroup, handleSendMessageToGroup: _sendMessageToGroup,
  _cleanupSidePanel,
} = useSidePanel({ toast, sentRequests, loadGroups, onJoinRequestSent: handleJoinRequestSent });

const {
  profileUser, profileContext, profileLoading,
  isFriend, isGroupMember,
  handlePanelClose,
  openSelfProfile, onViewProfile, onViewGroupProfile,
  handleEditUsername, handleChangePassword, handleDeleteFriend,
  handleDissolveOrLeaveGroup,
  handleSendMessageTo: _sendMessageTo, handleAddFriendFromProfile: _addFriendFromProfile,
} = useProfile({ toast, friends, groups, chatTarget, chatType, resetChat, closeSidePanel, loadFriends, loadGroups, sidePanelMode, groupSubMode, showSidePanel });

// ==================== 通知面板 Tab 控制 ====================
const notificationTab = ref('friend');

function openFriendNotifications() {
  notificationTab.value = 'friend';
  openNotifications();
}

function openGroupNotifications() {
  notificationTab.value = 'group';
  // 直接设置 activeView，不走 openNotifications()（群聊通知不需要加载好友申请数据）
  activeView.value = 'notifications-group';
  chatTarget.value = null;
  mobileView.value = 'chat';
  // 补充加载 REST 历史数据（入群申请 + 群通知），弥补实时 WS 推送的不足
  loadJoinRequestsHistory();
  loadGroupNotificationsHistory();
}

/**
 * 用户发出入群申请后的回调
 * 记录申请到通知列表 + 自动打开群聊通知面板让用户看到自己的申请
 * @param {Object} data - { groupId, groupName }
 */
function handleJoinRequestSent(data) {
  console.log('[Chat] 入群申请已发送，记录到通知列表:', data);
  addSelfJoinRequest(data);
  // 自动切到群聊通知面板，让用户看到自己刚发出的申请
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

<!-- ElMessageBox 弹框公共样式（unscoped，渲染在 body 下） -->
<style>
/* ==================== 公用：磨砂玻璃卡片容器 ==================== */
.add-friend-dialog,
.confirm-dialog {
  border-radius: 16px !important;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06) !important;
}

/* 公用：标题栏 */
.add-friend-dialog .el-message-box__header,
.confirm-dialog .el-message-box__header {
  padding: 22px 24px 12px;
  border-bottom: none;
}

/* 公用：标题文字 */
.add-friend-dialog .el-message-box__title,
.confirm-dialog .el-message-box__title {
  font-size: 17px;
  font-weight: 700;
  color: #333;
}

/* 公用：按钮栏 */
.add-friend-dialog .el-message-box__btns,
.confirm-dialog .el-message-box__btns {
  padding: 12px 24px 20px;
}

/* ==================== 申请弹窗专属 ==================== */
.add-friend-dialog .el-message-box__content {
  padding: 0 24px 16px;
}
.add-friend-dialog .el-message-box__message {
  margin-bottom: 12px;
}

/* 信息卡片：头像左 + 名称/详情右，水平居中 */
.request-dialog-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}
.request-dialog-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700;
  flex-shrink: 0;
}
.request-dialog-info {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}
.request-dialog-name {
  font-size: 14px; font-weight: 600; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.request-dialog-sub {
  font-size: 12px; color: #999;
}
.request-dialog-label {
  display: block;
  font-size: 13px; color: #888;
  margin: 14px 0 6px;
}

/* 输入框 */
.add-friend-dialog .el-textarea__inner {
  border-radius: 10px;
  border-color: rgba(17, 153, 142, 0.2);
  background: rgba(255, 255, 255, 0.45);
  resize: none;
  font-size: 14px; padding: 10px 14px; line-height: 1.5;
  box-shadow: none !important;
}
.add-friend-dialog .el-textarea__inner:focus {
  border-color: #23f12e !important;
  box-shadow: 0 0 0 3px rgba(17, 153, 142, 0.15) !important;
}

/* 按钮：发送申请=绿  取消=红 */
.add-friend-dialog .el-button--primary {
  background: rgba(56, 239, 125, 0.22);
  color: #333;
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  border-radius: 8px; padding: 8px 24px; font-weight: 600;
}
.add-friend-dialog .el-button--primary:hover {
  background: rgba(56, 239, 125, 0.35);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
  transform: translateY(-1px);
}
.add-friend-dialog .el-button:not(.el-button--primary) {
  background: rgba(224, 83, 83, 0.18);
  color: #333;
  border: 1.5px solid rgba(224, 83, 83, 0.45);
  border-radius: 8px; padding: 8px 24px; font-weight: 600;
}
.add-friend-dialog .el-button:not(.el-button--primary):hover {
  background: rgba(224, 83, 83, 0.3);
  box-shadow: 0 2px 8px rgba(224, 83, 83, 0.2);
  transform: translateY(-1px);
}

/* ==================== 确认弹窗专属（登出/删除好友等） ==================== */
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
