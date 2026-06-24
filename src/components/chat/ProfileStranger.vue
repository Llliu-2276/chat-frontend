<!--
 * 陌生人资料视图
 * 信息展示 + 添加好友
 -->
<template>
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
    <el-icon v-if="profileLoading" class="loading-icon"><Loading /></el-icon>
    <el-icon v-else><UserFilled /></el-icon>
    {{ profileLoading ? '发送中...' : '添加好友' }}
  </button>
</template>

<script setup>
import { UserFilled, Loading } from '@element-plus/icons-vue';

defineOptions({ name: 'ProfileStranger' });

defineProps({
  profileUser: { type: Object, default: null },
  profileLoading: { type: Boolean, default: false },
});
defineEmits(['add-friend-from-profile']);
</script>
