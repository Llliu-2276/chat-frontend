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
        @open-notifications="openNotifications"
        @open-profile="openSelfProfile"
      />

      <!-- 聊天消息区 / 通知面板（条件渲染） -->
      <template v-if="activeView === 'notifications'">
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
          :mobile-show="mobileView === 'chat'"
          @handle-request="onHandleRequest"
          @load-more="loadMoreRequests"
          @back-to-list="mobileView = 'list'"
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
          @view-profile="onViewProfile"
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
        :sent-requests="sentRequests"
        :sending-request-ids="sendingRequestIds"
        :profile-user="profileUser"
        :profile-context="profileContext"
        :profile-loading="profileLoading"
        @close="handlePanelClose"
        @search="handlePanelSearch"
        @add-friend="handleAddFriend"
        @create-group="handleCreateGroup"
        @join-group="handleJoinGroup"
        @edit-username="handleEditUsername"
        @change-password="handleChangePassword"
        @send-message-to="handleSendMessageTo"
        @add-friend-from-profile="handleAddFriendFromProfile"
        @view-profile="onViewProfile"
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
import { updateUserName, changePassword } from '@/api/user';
import { ElMessageBox } from 'element-plus';

import ChatLeftPanel from '@/components/chat/ChatLeftPanel.vue';
import ChatMessageArea from '@/components/chat/ChatMessageArea.vue';
import ChatSidePanel from '@/components/chat/ChatSidePanel.vue';
import ChatNotificationPanel from '@/components/chat/ChatNotificationPanel.vue';

import { useFriendList } from '@/composables/useFriendList';
import { useChatMessages } from '@/composables/useChatMessages';
import { useNotifications } from '@/composables/useNotifications';

const userStore = useUserStore();
const router = useRouter();
const toast = inject('toast');

// ==================== 初始化 Composables ====================
const {
  friends, groups, loadingFriends,
  chatTarget, chatType, mobileView, activeView,
  friendsExpanded, groupsExpanded, notificationsExpanded,
  toggleFriends, toggleGroups, toggleNotifications,
  onSelectFriend: _selectFriend, onSelectGroup: _selectGroup,
  loadFriends, fetchUnreadMessages,
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
  pendingRequestCount, sendingRequestIds,
  showSidePanel, sidePanelMode, groupSubMode,
  panelSearchResults, panelSearching,
  openNotifications,
  loadMoreReceived, loadMoreSent,
  onHandleRequest,
  handleGroupAction, openSidePanel, closeSidePanel,
  handlePanelSearch, handleAddFriend,
  handleCreateGroup, handleJoinGroup,
  _cleanupNotifications,
} = useNotifications({ loadFriends, activeView, chatTarget, mobileView, toast });

// ==================== Profile 状态 ====================
const profileUser = ref(null);         // 当前查看的用户对象
const profileContext = ref('self');    // 'self' | 'friend' | 'stranger'
const profileLoading = ref(false);     // Profile 操作加载中
/** 面板导航历史栈，用于 profile 返回上一视图 */
const panelHistory = ref([]);

/** 判断用户是否为好友 */
function isFriend(userId) {
  return friends.value.some(f => f.userId === userId);
}

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

// ==================== 登出 ====================
const isLoggingOut = ref(false);

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要登出吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch { return; }
  isLoggingOut.value = true;
  try { await userStore.logout(); }
  catch { toast.error('登出失败，请重试'); }
  finally { isLoggingOut.value = false; }
}

// ==================== Profile 操作 ====================

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
 * 从资料卡发消息给用户
 * @param {Object} user - 目标用户
 */
function handleSendMessageTo(user) {
  if (!user?.userId) return;
  closeSidePanel();
  // 如果该用户不在好友列表中（理论上不会发生在 friend 视角），仍然尝试选中
  onSelectFriend(user);
}

/**
 * 从资料卡添加好友（陌生人视角）
 * @param {Object} user - 目标用户
 */
function handleAddFriendFromProfile(user) {
  handleAddFriend(user);
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
}

// ==================== 通知面板：加载更多（同时加载收到与发出） ====================
function loadMoreRequests() {
  if (hasMoreReceived.value) loadMoreReceived();
  if (hasMoreSent.value) loadMoreSent();
}

// ==================== 生命周期 ====================
let unreadTimer = null, friendListTimer = null;

onMounted(async () => {
  // WebSocket 连接（各 composable 已自行注册事件监听）
  if (!wsManager.isConnected && !wsManager.isConnecting) wsManager.connect();

  await loadFriends();
  await fetchUnreadMessages();
  unreadTimer = setInterval(fetchUnreadMessages, 30000);
  friendListTimer = setInterval(loadFriends, 60000);
});

onBeforeUnmount(() => {
  if (unreadTimer) clearInterval(unreadTimer);
  if (friendListTimer) clearInterval(friendListTimer);
  _cleanupNotifications();
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

<!-- 好友申请弹框样式（unscoped，ElMessageBox 渲染在 body 下） -->
<style>
.add-friend-dialog {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08) !important;
}
.add-friend-dialog .el-message-box__header {
  padding: 20px 24px 12px;
  border-bottom: none;
}
.add-friend-dialog .el-message-box__title {
  font-size: 17px;
  font-weight: 700;
  color: #11998e;
}
.add-friend-dialog .el-message-box__content {
  padding: 0 24px 16px;
}
.add-friend-dialog .el-message-box__message {
  margin-bottom: 12px;
}
.add-friend-dialog-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(98, 210, 162, 0.08);
  border-radius: 12px;
}
.add-friend-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}
.add-friend-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.add-friend-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.add-friend-account {
  font-size: 13px;
  color: #999;
}
.add-friend-dialog .el-textarea__inner {
  border-radius: 10px;
  border-color: rgba(17, 153, 142, 0.25);
  resize: none;
  font-size: 14px;
  padding: 10px 14px;
  line-height: 1.5;
}
.add-friend-dialog .el-textarea__inner:focus {
  border-color: #11998e;
  box-shadow: 0 0 0 2px rgba(17, 153, 142, 0.12);
}
.add-friend-dialog .el-message-box__btns {
  padding: 12px 24px 20px;
}
.add-friend-dialog .el-button--primary {
  background: rgba(56, 239, 125, 0.22);
  color: #333;
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  border-radius: 20px;
  padding: 8px 24px;
  font-weight: 600;
}
.add-friend-dialog .el-button--primary:hover {
  background: rgba(56, 239, 125, 0.35);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
  transform: translateY(-1px);
}
.add-friend-dialog .el-button--default {
  border-radius: 20px;
  padding: 8px 24px;
  font-weight: 600;
  color: #666;
}
</style>
