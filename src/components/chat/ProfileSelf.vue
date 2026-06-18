<!--
 * 本人资料视图
 * 编辑用户名 / 修改密码 / 登出
 -->
<template>
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
        <input type="password" class="form-input" placeholder="请输入当前密码" v-model="oldPassword" />
      </div>
      <div class="profile-form-group">
        <label class="form-label">新密码</label>
        <input type="password" class="form-input" placeholder="6-32位新密码" v-model="newPassword" maxlength="32" />
      </div>
      <div class="profile-form-group">
        <label class="form-label">确认密码</label>
        <input type="password" class="form-input" placeholder="再次输入新密码" v-model="confirmPassword" maxlength="32" />
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

<script setup>
import { ref, computed, watch } from 'vue';
import { ArrowRight, Edit, Select, CloseBold, Lock, SwitchButton } from '@element-plus/icons-vue';

defineOptions({ name: 'ProfileSelf' });

const props = defineProps({
  profileUser: { type: Object, default: null },
  profileLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['edit-username', 'change-password', 'logout']);

// --- 编辑用户名 ---
const editingUsername = ref(false);
const editUsernameValue = ref('');

function startEditUsername() {
  editUsernameValue.value = props.profileUser?.userName || '';
  editingUsername.value = true;
}
function confirmEditUsername() {
  const newName = editUsernameValue.value.trim();
  if (!newName || newName === props.profileUser?.userName) { cancelEditUsername(); return; }
  emit('edit-username', newName);
  editingUsername.value = false;
}
function cancelEditUsername() {
  editingUsername.value = false;
  editUsernameValue.value = '';
}

// --- 修改密码 ---
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
    oldPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''; passwordError.value = '';
  }
}
function submitChangePassword() {
  passwordError.value = '';
  if (!oldPassword.value.trim()) { passwordError.value = '请输入当前密码'; return; }
  if (!newPassword.value.trim()) { passwordError.value = '请输入新密码'; return; }
  if (newPassword.value.length < 6) { passwordError.value = '新密码至少6位'; return; }
  if (newPassword.value !== confirmPassword.value) { passwordError.value = '两次输入的新密码不一致'; return; }
  emit('change-password', { oldPassword: oldPassword.value.trim(), newPassword: newPassword.value.trim() });
}

// 切换用户时重置状态
watch(() => props.profileUser, () => {
  editingUsername.value = false; editUsernameValue.value = '';
  showPasswordSection.value = false;
  oldPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''; passwordError.value = '';
});
</script>
