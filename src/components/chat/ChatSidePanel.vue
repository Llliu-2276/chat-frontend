<!--
 * 聊天侧面板
 * 支持添加好友 / 创建群聊 / 加入群聊 三个子模式
 * 通过 mode + groupSubMode 控制显示内容
 -->
<template>
  <Transition name="slide-panel">
    <div v-if="visible" class="side-panel">
      <!-- 面板头部 -->
      <div class="panel-header">
        <button class="card-action-btn panel-close-btn" @click="$emit('close')" title="收起">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <span class="panel-title">{{ title }}</span>
      </div>

      <!-- 面板内容 -->
      <div class="panel-body">
        <Transition name="panel-content" mode="out-in">
          <div :key="contentKey" class="panel-content-wrapper">
            <!-- 添加好友模式 -->
            <template v-if="mode === 'friend'">
              <div class="panel-search">
                <input type="text" class="form-input search-input" placeholder="搜索用户名或账号..."
                       v-model="searchKeyword" @input="onSearch" />
                <el-icon class="search-icon"><Search /></el-icon>
              </div>
              <div class="panel-results">
                <div v-if="searching" class="list-loading">
                  <span class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
                </div>
                <div v-else-if="searchResults.length === 0 && searchKeyword" class="list-empty">
                  <p>未找到用户</p>
                </div>
                <div v-else-if="searchResults.length === 0 && !searchKeyword" class="list-empty">
                  <p>输入关键词搜索用户</p>
                </div>
                <div v-else v-for="user in searchResults" :key="'sr-' + user.userId"
                     class="panel-result-item">
                  <div class="panel-result-user" @click="$emit('view-profile', user)">
                    <div class="conv-avatar avatar avatar-sm"
                         :style="{ background: 'linear-gradient(135deg, #11998e, #38ef7d)' }">
                      {{ user.userName?.charAt(0) || '?' }}
                    </div>
                    <div class="conv-info">
                      <span class="conv-name">{{ user.userName }}</span>
                      <span class="conv-account">{{ user.userAccount }}</span>
                    </div>
                  </div>
                  <button v-if="!isAlreadyFriend(user) && !hasPendingRequest(user)"
                          class="panel-add-btn"
                          @click.stop="$emit('add-friend', user)"
                          :disabled="sendingRequestIds.has(user.userId)">
                    {{ sendingRequestIds.has(user.userId) ? '发送中...' : '添加' }}
                  </button>
                  <span v-else-if="hasPendingRequest(user)" class="panel-pending-tag">申请已发送</span>
                  <span v-else class="panel-friend-tag">已是好友</span>
                </div>
              </div>
            </template>

            <!-- 创建群聊模式 -->
            <template v-else-if="mode === 'group' && groupSubMode === 'create'">
              <div class="panel-section">
                <div class="panel-form-group">
                  <label class="form-label">群聊名称</label>
                  <input type="text" class="form-input" placeholder="请输入群聊名称"
                         v-model="newGroupName" maxlength="20" />
                </div>
                <button class="submit-button panel-action-btn"
                        :disabled="!newGroupName.trim()">
                  创建群聊
                </button>
              </div>
            </template>

            <!-- 加入群聊模式 -->
            <template v-else-if="mode === 'group'">
              <div class="panel-section">
                <div class="panel-search">
                  <input type="text" class="form-input search-input" placeholder="输入群聊ID..."
                         v-model="searchKeyword" />
                  <el-icon class="search-icon"><Search /></el-icon>
                </div>
                <button class="submit-button panel-action-btn"
                        :disabled="!searchKeyword.trim()">
                  搜索并加入群聊
                </button>
              </div>
            </template>

            <!-- 个人资料模式 -->
            <template v-else-if="mode === 'profile'">
              <div class="profile-card">
                <!-- 头像区 -->
                <div class="profile-avatar-section">
                  <div class="avatar avatar-lg"
                       :style="{ background: 'linear-gradient(135deg, #11998e, #38ef7d)' }">
                    {{ (profileUser?.userName || '?').charAt(0) }}
                    <span v-if="profileUser?.isOnline" class="online-indicator online"></span>
                    <span v-else-if="profileContext !== 'self'" class="online-indicator offline"></span>
                  </div>
                  <div class="profile-name">{{ profileUser?.userName || '未知用户' }}</div>
                  <div v-if="profileUser?.userAccount" class="profile-account">{{ profileUser.userAccount }}</div>
                </div>

                <!-- 本人资料 -->
                <template v-if="profileContext === 'self'">
                  <!-- 基本信息卡片 -->
                  <div class="profile-info-card">
                    <div class="profile-info-row">
                      <span class="profile-info-label">用户名</span>
                      <template v-if="editingUsername">
                        <input type="text" class="form-input profile-inline-input"
                               v-model="editUsernameValue" maxlength="16"
                               @keydown.enter="confirmEditUsername" />
                        <button class="profile-inline-btn confirm" @click="confirmEditUsername"
                                :disabled="!editUsernameValue.trim() || editUsernameValue.trim() === profileUser.userName">
                          <el-icon><Select /></el-icon>
                        </button>
                        <button class="profile-inline-btn cancel" @click="cancelEditUsername">
                          <el-icon><CloseBold /></el-icon>
                        </button>
                      </template>
                      <template v-else>
                        <span class="profile-info-value">{{ profileUser?.userName || '-' }}</span>
                        <button class="profile-inline-edit-btn" @click="startEditUsername" title="修改用户名">
                          <el-icon><Edit /></el-icon>
                        </button>
                      </template>
                    </div>
                    <div class="profile-info-row">
                      <span class="profile-info-label">账号</span>
                      <span class="profile-info-value">{{ profileUser?.userAccount || '-' }}</span>
                    </div>
                    <div class="profile-info-row">
                      <span class="profile-info-label">注册日期</span>
                      <span class="profile-info-value">{{ profileUser?.createDate || '-' }}</span>
                    </div>
                  </div>

                  <!-- 账号安全入口 -->
                  <div class="profile-security-entry" @click="togglePasswordSection">
                    <div class="security-entry-left">
                      <el-icon class="security-icon"><Lock /></el-icon>
                      <span>账号安全</span>
                    </div>
                    <el-icon class="security-arrow" :class="{ expanded: showPasswordSection }">
                      <ArrowRight />
                    </el-icon>
                  </div>

                  <!-- 修改密码区域（可展开） -->
                  <div class="profile-password-section" :class="{ expanded: showPasswordSection }">
                    <div class="profile-password-inner">
                      <div class="profile-form-group">
                        <label class="form-label">当前密码</label>
                        <input type="password" class="form-input" placeholder="请输入当前密码"
                               v-model="oldPassword" />
                      </div>
                      <div class="profile-form-group">
                        <label class="form-label">新密码</label>
                        <input type="password" class="form-input" placeholder="6-32位新密码"
                               v-model="newPassword" maxlength="32" />
                      </div>
                      <div class="profile-form-group">
                        <label class="form-label">确认密码</label>
                        <input type="password" class="form-input" placeholder="再次输入新密码"
                               v-model="confirmPassword" maxlength="32" />
                      </div>
                      <p v-if="passwordError" class="profile-form-error">{{ passwordError }}</p>
                      <button class="submit-button profile-password-btn"
                              :disabled="!canChangePassword || profileLoading"
                              @click="submitChangePassword">
                        <span v-if="profileLoading" class="loading-icon">
                          <img src="@/assets/loading.png" alt="Loading">
                        </span>
                        确认修改
                      </button>
                    </div>
                  </div>

                  <!-- 登出按钮 -->
                  <button class="profile-logout-btn" @click="$emit('logout')">
                    <el-icon><SwitchButton /></el-icon>
                    <span>登出</span>
                  </button>
                </template>

                <!-- 好友资料 -->
                <template v-if="profileContext === 'friend'">
                  <div class="profile-info-card">
                    <div class="profile-info-row">
                      <span class="profile-info-label">用户名</span>
                      <span class="profile-info-value">{{ profileUser?.userName || '-' }}</span>
                    </div>
                    <div class="profile-info-row">
                      <span class="profile-info-label">账号</span>
                      <span class="profile-info-value">{{ profileUser?.userAccount || '-' }}</span>
                    </div>
                    <div class="profile-info-row">
                      <span class="profile-info-label">注册日期</span>
                      <span class="profile-info-value">{{ profileUser?.createDate || '-' }}</span>
                    </div>
                  </div>
                  <button class="submit-button profile-action-btn"
                          @click="handleSendMessage">
                    <el-icon><ChatDotRound /></el-icon>
                    发消息
                  </button>
                </template>

                <!-- 陌生人资料 -->
                <template v-if="profileContext === 'stranger'">
                  <div class="profile-info-card">
                    <div class="profile-info-row">
                      <span class="profile-info-label">用户名</span>
                      <span class="profile-info-value">{{ profileUser?.userName || '-' }}</span>
                    </div>
                    <div class="profile-info-row">
                      <span class="profile-info-label">账号</span>
                      <span class="profile-info-value">{{ profileUser?.userAccount || '-' }}</span>
                    </div>
                  </div>
                  <button class="submit-button profile-action-btn"
                          :disabled="profileLoading"
                          @click="handleAddFriend">
                    <span v-if="profileLoading" class="loading-icon">
                      <img src="@/assets/loading.png" alt="Loading">
                    </span>
                    <el-icon v-else><UserFilled /></el-icon>
                    {{ profileLoading ? '发送中...' : '添加好友' }}
                  </button>
                </template>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ArrowLeft, ArrowRight, Search, Edit, Select, CloseBold, Lock, ChatDotRound, UserFilled, SwitchButton } from '@element-plus/icons-vue';

defineOptions({ name: 'ChatSidePanel' });

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'friend' },        // 'friend' | 'group' | 'profile'
  groupSubMode: { type: String, default: 'join' },   // 'join' | 'create'
  searchResults: { type: Array, default: () => [] },
  searching: { type: Boolean, default: false },
  friends: { type: Array, default: () => [] },
  sentRequests: { type: Array, default: () => [] },
  sendingRequestIds: { type: Set, default: () => new Set() },
  // Profile mode props
  profileUser: { type: Object, default: null },       // 当前查看的用户
  profileContext: { type: String, default: 'self' },  // 'self' | 'friend' | 'stranger'
  profileLoading: { type: Boolean, default: false },  // Profile 操作加载中
});

const emit = defineEmits([
  'close', 'search', 'add-friend',
  'create-group', 'join-group',
  'switch-mode',
  // Profile mode events
  'edit-username',          // 修改用户名，参数：newUserName
  'change-password',        // 修改密码，参数：{ oldPassword, newPassword }
  'send-message-to',        // 发消息，参数：user
  'add-friend-from-profile',// 从资料卡添加好友，参数：user
  'view-profile',           // 查看用户资料（搜索结果点击），参数：user
  'logout',                 // 登出（本人资料卡内）
]);

const searchKeyword = ref('');
const newGroupName = ref('');
let searchTimer = null;

const contentKey = computed(() => {
  if (props.mode === 'profile') return `profile-${props.profileContext}`;
  return props.mode === 'friend' ? 'friend' : `group-${props.groupSubMode}`;
});

const title = computed(() => {
  if (props.mode === 'profile') {
    if (props.profileContext === 'self') return '个人资料';
    if (props.profileContext === 'friend') return '好友资料';
    return '用户资料';
  }
  if (props.mode === 'friend') return '添加好友';
  return props.groupSubMode === 'create' ? '创建群聊' : '添加群聊';
});

// 当面板关闭时重置
watch(() => props.visible, (val) => {
  if (!val) resetState();
});

// 切换面板模式时重置，但 profile 导航保留搜索状态（支持返回后恢复）
watch(() => props.mode, (newMode, oldMode) => {
  if (newMode === 'profile' || oldMode === 'profile') return;
  resetState();
});

function resetState() {
  searchKeyword.value = '';
  newGroupName.value = '';
  if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
  // 重置 Profile 编辑状态
  editingUsername.value = false;
  editUsernameValue.value = '';
  showPasswordSection.value = false;
  oldPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  passwordError.value = '';
}

// ==================== Profile 内部状态 ====================
const editingUsername = ref(false);
const editUsernameValue = ref('');
const showPasswordSection = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordError = ref('');

const canChangePassword = computed(() =>
  oldPassword.value.trim() && newPassword.value.trim() && confirmPassword.value.trim()
);

/** 开始编辑用户名 */
function startEditUsername() {
  editUsernameValue.value = props.profileUser?.userName || '';
  editingUsername.value = true;
}

/** 确认修改用户名 */
function confirmEditUsername() {
  const newName = editUsernameValue.value.trim();
  if (!newName || newName === props.profileUser?.userName) {
    cancelEditUsername();
    return;
  }
  emit('edit-username', newName);
  editingUsername.value = false;
}

/** 取消编辑用户名 */
function cancelEditUsername() {
  editingUsername.value = false;
  editUsernameValue.value = '';
}

/** 展开/收起密码修改区域 */
function togglePasswordSection() {
  showPasswordSection.value = !showPasswordSection.value;
  if (!showPasswordSection.value) {
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    passwordError.value = '';
  }
}

/** 提交修改密码 */
function submitChangePassword() {
  passwordError.value = '';
  if (!oldPassword.value.trim()) {
    passwordError.value = '请输入当前密码';
    return;
  }
  if (!newPassword.value.trim()) {
    passwordError.value = '请输入新密码';
    return;
  }
  if (newPassword.value.length < 6) {
    passwordError.value = '新密码至少6位';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = '两次输入的新密码不一致';
    return;
  }
  emit('change-password', {
    oldPassword: oldPassword.value.trim(),
    newPassword: newPassword.value.trim(),
  });
}

/** 发消息给当前查看的用户 */
function handleSendMessage() {
  if (props.profileUser) emit('send-message-to', props.profileUser);
}

/** 从资料卡添加好友 */
function handleAddFriend() {
  if (props.profileUser) emit('add-friend-from-profile', props.profileUser);
}

// 监听 Profile 相关 prop 变化，重置编辑状态
watch(() => props.profileUser, () => {
  editingUsername.value = false;
  editUsernameValue.value = '';
  showPasswordSection.value = false;
  oldPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  passwordError.value = '';
});

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  if (!searchKeyword.value.trim()) {
    emit('search', '');
    return;
  }
  searchTimer = setTimeout(() => {
    emit('search', searchKeyword.value);
  }, 300);
}

function isAlreadyFriend(user) {
  return props.friends.some(f => f.userId === user.userId);
}

/** 检查是否对某用户有待处理的申请 */
function hasPendingRequest(user) {
  return props.sentRequests.some(
    r => r.receiverId === user.userId && r.status === 0
  );
}
</script>

<style scoped>
/* ==================== 侧面板 ==================== */
.side-panel {
  width: 300px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.panel-close-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(17, 153, 142, 0.1);
  color: #11998e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.3s ease;
}
.panel-close-btn:hover {
  background: rgba(17, 153, 142, 0.25);
  transform: translateX(-2px);
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #11998e;
  letter-spacing: 0.5px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  border-radius: 2px;
}

.panel-search { position: relative; }
.panel-search .search-input {
  padding-left: 32px !important;
  padding-top: 7px !important;
  padding-bottom: 7px !important;
  font-size: 13px !important;
}
.panel-search .search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
  font-size: 13px;
  pointer-events: none;
}

.panel-results {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-loading, .list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 16px;
  color: #bbb;
  font-size: 13px;
}

.panel-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.panel-result-item:hover { background: rgba(98, 210, 162, 0.12); }
.panel-result-item .conv-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.panel-result-item .conv-account { font-size: 11px; color: #aaa; }

.panel-add-btn {
  padding: 4px 14px;
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  border-radius: 16px;
  background: rgba(56, 239, 125, 0.22);
  color: #333;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.panel-add-btn:hover {
  background: rgba(56, 239, 125, 0.35);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
}

.panel-friend-tag {
  padding: 4px 12px;
  border-radius: 16px;
  background: rgba(17, 153, 142, 0.12);
  color: #11998e;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  user-select: none;
}
.panel-pending-tag {
  padding: 4px 12px;
  border-radius: 16px;
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  user-select: none;
}

.panel-section { display: flex; flex-direction: column; gap: 10px; }
.panel-form-group { display: flex; flex-direction: column; gap: 6px; }

.panel-action-btn {
  padding: 10px !important;
  font-size: 14px !important;
}

/* 侧面板滑动动画 */
.slide-panel-enter-active, .slide-panel-leave-active {
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
.slide-panel-enter-from, .slide-panel-leave-to {
  width: 0;
  min-width: 0;
  opacity: 0;
  transform: translateX(-20px);
  border-width: 0;
  padding: 0;
  overflow: hidden;
}

/* 面板内容切换动画 */
.panel-content-enter-active, .panel-content-leave-active { transition: all 0.25s ease; }
.panel-content-enter-from { opacity: 0; transform: translateX(12px); }
.panel-content-leave-to { opacity: 0; transform: translateX(-12px); }

/* ==================== 搜索结果用户可点击区域 ==================== */
.panel-result-user {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  padding: 4px 0;
  border-radius: 6px;
  transition: opacity 0.2s ease;
}
.panel-result-user:hover { opacity: 0.75; }

/* ==================== 个人资料卡片 ==================== */
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px 4px;
}

/* 头像区 */
.profile-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0 4px;
}
.profile-avatar-section .avatar-lg {
  position: relative;
}
.profile-name {
  font-size: 17px;
  font-weight: 700;
  color: #333;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-account {
  font-size: 13px;
  color: #999;
  letter-spacing: 1px;
}

/* 信息卡片 */
.profile-info-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  padding: 4px 0;
  overflow: hidden;
}

.profile-info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  transition: background 0.2s ease;
}
.profile-info-row:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.profile-info-label {
  font-size: 13px;
  color: #999;
  flex-shrink: 0;
  min-width: 56px;
}

.profile-info-value {
  flex: 1;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

/* 内联编辑 */
.profile-inline-input {
  flex: 1;
  padding: 4px 8px !important;
  font-size: 13px !important;
  height: 28px;
}

.profile-inline-edit-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(17, 153, 142, 0.1);
  color: #11998e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}
.profile-inline-edit-btn:hover {
  background: rgba(17, 153, 142, 0.25);
  transform: translateY(-1px);
}

.profile-inline-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.profile-inline-btn.confirm {
  background: rgba(56, 239, 125, 0.22);
  color: #333;
  border: 1.5px solid rgba(56, 239, 125, 0.45);
}
.profile-inline-btn.confirm:hover:not(:disabled) {
  background: rgba(56, 239, 125, 0.35);
  transform: scale(1.1);
}
.profile-inline-btn.confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.profile-inline-btn.cancel {
  background: rgba(0, 0, 0, 0.06);
  color: #999;
}
.profile-inline-btn.cancel:hover {
  background: rgba(0, 0, 0, 0.12);
  color: #666;
}

/* 账号安全入口 */
.profile-security-entry {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}
.profile-security-entry:hover {
  background: rgba(17, 153, 142, 0.08);
  transform: translateY(-1px);
}
.security-entry-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
.security-icon {
  font-size: 16px;
  color: #11998e;
}
.security-arrow {
  font-size: 14px;
  color: #bbb;
  transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
.security-arrow.expanded {
  transform: rotate(90deg);
}

/* 修改密码区域（展开/收起动画） */
.profile-password-section {
  width: 100%;
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  overflow: hidden;
}
.profile-password-section.expanded {
  grid-template-rows: 1fr;
}

.profile-password-inner {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  padding: 0 14px;
}
.profile-password-section.expanded .profile-password-inner {
  padding: 14px;
}

.profile-form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-form-group .form-label {
  font-size: 13px;
  color: #888;
}

.profile-form-group .form-input {
  font-size: 13px !important;
  padding: 8px 12px !important;
}

.profile-form-error {
  font-size: 12px;
  color: #e6a23c;
  margin: 0;
  text-align: center;
}

.profile-password-btn {
  font-size: 14px !important;
  padding: 10px !important;
}

/* 操作按钮 */
.profile-action-btn {
  width: 100%;
  font-size: 14px !important;
  padding: 10px !important;
}

/* 登出按钮 */
.profile-logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-top: 4px;
}
.profile-logout-btn:hover {
  color: #e05353;
  border-color: rgba(224, 83, 83, 0.3);
  background: rgba(224, 83, 83, 0.05);
}

/* ==================== 响应式 ==================== */
@media (max-width: 767px) {
  .side-panel {
    position: absolute;
    inset: 0;
    width: 100%;
    min-width: 100%;
    height: 100vh;
    z-index: 15;
    border-radius: 0;
  }
}
</style>
