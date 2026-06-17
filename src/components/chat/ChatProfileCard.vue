<!--
 * 个人资料卡片
 * 支持三种视角：本人（编辑用户名/改密码/登出）、好友（信息+发消息+删除）、陌生人（信息+添加好友）
 -->
<template>
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
              @click="$emit('send-message-to', profileUser)">
        <el-icon><ChatDotRound /></el-icon>
        发消息
      </button>
      <button class="profile-delete-friend-btn" @click="$emit('delete-friend', profileUser)">
        <el-icon><Delete /></el-icon>
        <span>删除好友</span>
      </button>
    </template>

    <!-- 群聊资料 -->
    <template v-if="profileContext === 'group'">
      <div class="profile-info-card">
        <div class="profile-info-row">
          <span class="profile-info-label">群名称</span>
          <span class="profile-info-value">{{ profileUser?.groupName || '-' }}</span>
        </div>
        <div class="profile-info-row">
          <span class="profile-info-label">群账号</span>
          <span class="profile-info-value">{{ profileUser?.account || '-' }}</span>
        </div>
        <div class="profile-info-row">
          <span class="profile-info-label">群主</span>
          <span class="profile-info-value">{{ profileUser?.ownerName || '-' }}</span>
        </div>
        <div class="profile-info-row">
          <span class="profile-info-label">成员数</span>
          <span class="profile-info-value">{{ profileUser?.memberCount || 0 }} 人</span>
        </div>
        <div class="profile-info-row">
          <span class="profile-info-label">创建日期</span>
          <span class="profile-info-value">{{ profileUser?.createDate || '-' }}</span>
        </div>
      </div>
      <button class="submit-button profile-action-btn"
              @click="$emit('send-message-to', profileUser)">
        <el-icon><ChatDotRound /></el-icon>
        发消息
      </button>
      <button v-if="profileUser?.isOwner" class="profile-delete-friend-btn"
              @click="$emit('dissolve-or-leave-group', profileUser)">
        <el-icon><Delete /></el-icon>
        <span>解散群聊</span>
      </button>
      <button v-else class="profile-delete-friend-btn"
              @click="$emit('dissolve-or-leave-group', profileUser)">
        <el-icon><Delete /></el-icon>
        <span>退出群聊</span>
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
              @click="$emit('add-friend-from-profile', profileUser)">
        <span v-if="profileLoading" class="loading-icon">
          <img src="@/assets/loading.png" alt="Loading">
        </span>
        <el-icon v-else><UserFilled /></el-icon>
        {{ profileLoading ? '发送中...' : '添加好友' }}
      </button>
    </template>
  </div>
</template>

<script setup>
/**
 * 个人资料卡片
 * 支持本人/好友/陌生人三种视角，内部管理编辑状态
 */
import { ref, computed, watch } from 'vue';
import { ArrowRight, Edit, Select, CloseBold, Lock, ChatDotRound, Delete, UserFilled, SwitchButton } from '@element-plus/icons-vue';

defineOptions({ name: 'ChatProfileCard' });

const props = defineProps({
  profileUser: { type: Object, default: null },
  profileContext: { type: String, default: 'self' },  // 'self' | 'friend' | 'stranger'
  profileLoading: { type: Boolean, default: false },
});

const emit = defineEmits([
  'edit-username',
  'change-password',
  'send-message-to',
  'add-friend-from-profile',
  'delete-friend',
  'dissolve-or-leave-group',
  'logout',
]);

// ==================== 编辑用户名状态 ====================
const editingUsername = ref(false);
const editUsernameValue = ref('');

function startEditUsername() {
  editUsernameValue.value = props.profileUser?.userName || '';
  editingUsername.value = true;
}

function confirmEditUsername() {
  const newName = editUsernameValue.value.trim();
  if (!newName || newName === props.profileUser?.userName) {
    cancelEditUsername();
    return;
  }
  emit('edit-username', newName);
  editingUsername.value = false;
}

function cancelEditUsername() {
  editingUsername.value = false;
  editUsernameValue.value = '';
}

// ==================== 修改密码状态 ====================
const showPasswordSection = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordError = ref('');

const canChangePassword = computed(() =>
  oldPassword.value.trim() && newPassword.value.trim() && confirmPassword.value.trim()
);

function togglePasswordSection() {
  showPasswordSection.value = !showPasswordSection.value;
  if (!showPasswordSection.value) {
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    passwordError.value = '';
  }
}

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

// ==================== 切换用户时重置编辑状态 ====================
watch(() => props.profileUser, () => {
  editingUsername.value = false;
  editUsernameValue.value = '';
  showPasswordSection.value = false;
  oldPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  passwordError.value = '';
});
</script>

<style scoped>
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

/* 删除好友按钮（与发消息按钮风格一致，红色系） */
.profile-delete-friend-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  background: rgba(224, 83, 83, 0.18);
  border: 1.5px solid rgba(224, 83, 83, 0.45);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.profile-delete-friend-btn:hover {
  background: rgba(224, 83, 83, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(224, 83, 83, 0.2);
}
</style>
