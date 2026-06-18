<!--
 * 好友资料视图
 * 信息展示 + 发消息 + 删除好友
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
    <div class="profile-info-row">
      <span class="profile-info-label">注册日期</span>
      <span class="profile-info-value">{{ profileUser?.createDate || '-' }}</span>
    </div>
  </div>
  <button class="submit-button profile-action-btn" @click="$emit('send-message-to', profileUser)">
    <el-icon><ChatDotRound /></el-icon>
    发消息
  </button>
  <button class="btn-danger" style="width:100%;padding:10px;font-size:14px" @click="$emit('delete-friend', profileUser)">
    <el-icon><Delete /></el-icon>
    <span>删除好友</span>
  </button>
</template>

<script setup>
import { ChatDotRound, Delete } from '@element-plus/icons-vue';

defineOptions({ name: 'ProfileFriend' });

defineProps({ profileUser: { type: Object, default: null } });
defineEmits(['send-message-to', 'delete-friend']);
</script>
