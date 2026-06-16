<!--
 * 个人资料页面
 * 显示用户信息，支持修改用户名和密码
 -->
<template>
  <div class="profile-container">
    <h1>个人资料</h1>
    <!-- TODO: 实现个人资料页面 -->
    <p>个人资料页面 - 待实现</p>
    <p>用户名: {{ userStore.userName }}</p>
    <p>账号: {{ userStore.userAccount }}</p>
  </div>
</template>

<script setup>
/**
 * 个人资料页面
 * 显示用户信息，支持修改用户名和密码
 */
import { useUserStore } from '@/stores/user';

// 获取用户状态
const userStore = useUserStore();

// TODO: 实现个人资料逻辑
// - 修改用户名
// - 修改密码
// - 上传头像
</script>

<style scoped>
.profile-container {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
}
</style>
