<!--
 * 个人资料卡片（路由壳）
 * 根据 profileContext 分发到对应子视图：
 *   self → ProfileSelf / friend → ProfileFriend / stranger → ProfileStranger / group → ProfileGroup
 -->
<template>
  <div class="profile-card">
    <!-- 头像区（所有视图共享） -->
    <div class="profile-avatar-section">
      <div class="avatar avatar-lg"
           :style="{ background: 'linear-gradient(135deg, #11998e, #38ef7d)' }">
        {{ (profileContext === 'group' ? profileUser?.groupName : profileUser?.userName || '?').charAt(0) }}
        <span v-if="profileContext !== 'group' && profileUser?.isOnline" class="online-indicator online"></span>
        <span v-else-if="profileContext !== 'group' && profileContext !== 'self'" class="online-indicator offline"></span>
      </div>
      <div class="profile-name">{{ profileContext === 'group' ? (profileUser?.groupName || '未知群聊') : (profileUser?.userName || '未知用户') }}</div>
      <div v-if="profileContext === 'group'" class="profile-account">{{ profileUser?.account }}</div>
      <div v-else-if="profileUser?.userAccount" class="profile-account">{{ profileUser.userAccount }}</div>
    </div>

    <!-- 按 context 分发 -->
    <ProfileSelf
      v-if="profileContext === 'self'"
      :profile-user="profileUser"
      :profile-loading="profileLoading"
      @edit-username="(name) => $emit('edit-username', name)"
      @change-password="(data) => $emit('change-password', data)"
      @logout="$emit('logout')"
    />
    <ProfileFriend
      v-else-if="profileContext === 'friend'"
      :profile-user="profileUser"
      @send-message-to="(user) => $emit('send-message-to', user)"
      @delete-friend="(user) => $emit('delete-friend', user)"
    />
    <ProfileStranger
      v-else-if="profileContext === 'stranger'"
      :profile-user="profileUser"
      :profile-loading="profileLoading"
      @add-friend-from-profile="(user) => $emit('add-friend-from-profile', user)"
    />
    <ProfileGroup
      v-else-if="profileContext === 'group'"
      :profile-user="profileUser"
      :is-group-member="isGroupMember"
      @send-message-to="(user) => $emit('send-message-to', user)"
      @dissolve-or-leave-group="(group) => $emit('dissolve-or-leave-group', group)"
      @join-group="(group) => $emit('join-group', group)"
      @transfer-owner="(member) => $emit('transfer-owner', profileUser, member)"
      @kick-member="(member) => $emit('kick-member', profileUser, member)"
      @open-invite="(group) => $emit('open-invite', group)"
    />
  </div>
</template>

<script setup>
import ProfileSelf from '@/components/chat/ProfileSelf.vue';
import ProfileFriend from '@/components/chat/ProfileFriend.vue';
import ProfileStranger from '@/components/chat/ProfileStranger.vue';
import ProfileGroup from '@/components/chat/ProfileGroup.vue';

defineOptions({ name: 'ChatProfileCard' });

defineProps({
  profileUser: { type: Object, default: null },
  profileContext: { type: String, default: 'self' },
  profileLoading: { type: Boolean, default: false },
  isGroupMember: { type: Boolean, default: false },
});

defineEmits([
  'edit-username', 'change-password',
  'send-message-to', 'add-friend-from-profile', 'delete-friend',
  'dissolve-or-leave-group', 'join-group',
  'transfer-owner', 'kick-member', 'open-invite',
  'logout',
]);
</script>

<!-- 子视图共用样式（unscoped → ProfileSelf/Friend/Stranger/Group 可访问） -->
<style>
/* ==================== 个人资料卡片（壳样式） ==================== */
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
.profile-avatar-section .avatar-lg { position: relative; }
.profile-name {
  font-size: 17px; font-weight: 700; color: #333;
  max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.profile-account { font-size: 13px; color: #999; letter-spacing: 1px; }

/* 信息卡片（子视图共用） */
.profile-info-card {
  width: 100%; background: rgba(255,255,255,0.35); border-radius: 12px; padding: 4px 0; overflow: hidden;
}
.profile-info-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px; transition: background 0.2s ease;
}
.profile-info-row:not(:last-child) { border-bottom: 1px solid rgba(0,0,0,0.04); }
.profile-info-label { font-size: 13px; color: #999; flex-shrink: 0; min-width: 56px; }
.profile-info-value { flex: 1; font-size: 14px; color: #333; font-weight: 500; }

/* 内联编辑 */
.profile-inline-input { flex: 1; padding: 4px 8px !important; font-size: 13px !important; height: 28px; }
.profile-inline-edit-btn {
  width: 26px; height: 26px; border-radius: 50%; border: none;
  background: rgba(17,153,142,0.1); color: #11998e; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
  transition: all 0.3s ease; flex-shrink: 0;
}
.profile-inline-edit-btn:hover { background: rgba(17,153,142,0.25); transform: translateY(-1px); }
.profile-inline-btn {
  width: 26px; height: 26px; border-radius: 50%; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
  transition: all 0.2s ease; flex-shrink: 0;
}
.profile-inline-btn.confirm {
  background: rgba(56,239,125,0.22); color: #333; border: 1.5px solid rgba(56,239,125,0.45);
}
.profile-inline-btn.confirm:hover:not(:disabled) { background: rgba(56,239,125,0.35); transform: scale(1.1); }
.profile-inline-btn.confirm:disabled { opacity: 0.4; cursor: not-allowed; }
.profile-inline-btn.cancel { background: rgba(0,0,0,0.06); color: #999; }
.profile-inline-btn.cancel:hover { background: rgba(0,0,0,0.12); color: #666; }

/* 账号安全入口 */
.profile-security-entry {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; background: rgba(255,255,255,0.35); border-radius: 12px;
  cursor: pointer; transition: all 0.25s ease;
}
.profile-security-entry:hover { background: rgba(17,153,142,0.08); transform: translateY(-1px); }
.security-entry-left { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #333; font-weight: 500; }
.security-icon { font-size: 16px; color: #11998e; }
.security-arrow {
  font-size: 14px; color: #bbb; transition: transform 0.4s cubic-bezier(0.68,-0.55,0.27,1.55);
}
.security-arrow.expanded { transform: rotate(90deg); }

/* 修改密码展开/收起 */
.profile-password-section {
  width: 100%; display: grid; grid-template-rows: 0fr;
  transition: grid-template-rows 0.5s cubic-bezier(0.68,-0.55,0.27,1.55); overflow: hidden;
}
.profile-password-section.expanded { grid-template-rows: 1fr; }
.profile-password-inner {
  overflow: hidden; display: flex; flex-direction: column; gap: 10px;
  background: rgba(255,255,255,0.35); border-radius: 12px; padding: 0 14px;
}
.profile-password-section.expanded .profile-password-inner { padding: 14px; }
.profile-form-group { display: flex; flex-direction: column; gap: 4px; }
.profile-form-group .form-label { font-size: 13px; color: #888; }
.profile-form-group .form-input { font-size: 13px !important; padding: 8px 12px !important; }
.profile-form-error { font-size: 12px; color: #e6a23c; margin: 0; text-align: center; }
.profile-password-btn { font-size: 14px !important; padding: 10px !important; }

/* 操作按钮 */
.profile-action-btn { width: 100%; font-size: 14px !important; padding: 10px !important; }

/* 登出按钮 */
.profile-logout-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 8px; background: transparent; border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px; color: #999; font-size: 13px; cursor: pointer; transition: all 0.25s ease; margin-top: 4px;
}
.profile-logout-btn:hover {
  color: #e05353; border-color: rgba(224,83,83,0.3); background: rgba(224,83,83,0.05);
}
</style>
