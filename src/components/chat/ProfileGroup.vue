<!--
 * 群聊资料视图
 * isGroupMember=true  → 完整信息 + 成员列表 + 发消息 + 解散/退出
 * isGroupMember=false → 基本信息 + 加入群聊
 -->
<template>
  <!-- 已加入 -->
  <template v-if="isGroupMember">
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

    <!-- 成员列表 -->
    <div class="profile-member-section">
      <div class="profile-member-header">
        <span class="profile-member-title">群成员</span>
        <span class="profile-member-count">{{ sortedMembers.length }} 人</span>
      </div>
      <div v-if="loadingMembers" class="profile-member-loading">
        <span class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
        <span>加载中...</span>
      </div>
      <div v-else class="profile-member-list">
        <div v-for="m in sortedMembers" :key="'pm-' + m.userId" class="profile-member-item"
             :class="{ 'is-owner': m.isOwner }">
          <div class="profile-member-avatar avatar avatar-sm"
               :style="{ background: m.isOwner ? 'linear-gradient(135deg, #f5af19, #f12711)' : 'linear-gradient(135deg, #11998e, #38ef7d)' }">
            {{ (m.userName || '?').charAt(0) }}
          </div>
          <div class="profile-member-info">
            <span class="profile-member-name">{{ m.userName }}</span>
            <span v-if="m.isOwner" class="profile-owner-tag">群主</span>
          </div>
        </div>
      </div>
    </div>

    <button class="submit-button profile-action-btn" @click="$emit('send-message-to', profileUser)">
      <el-icon><ChatDotRound /></el-icon>
      发消息
    </button>
    <button v-if="profileUser?.isOwner" class="btn-danger" style="width:100%;padding:10px;font-size:14px"
            @click="$emit('dissolve-or-leave-group', profileUser)">
      <el-icon><Delete /></el-icon>
      <span>解散群聊</span>
    </button>
    <button v-else class="btn-danger" style="width:100%;padding:10px;font-size:14px"
            @click="$emit('dissolve-or-leave-group', profileUser)">
      <el-icon><Delete /></el-icon>
      <span>退出群聊</span>
    </button>
  </template>

  <!-- 未加入 -->
  <template v-else>
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
        <span class="profile-info-label">成员数</span>
        <span class="profile-info-value">{{ profileUser?.memberCount || 0 }} 人</span>
      </div>
    </div>
    <button class="submit-button profile-action-btn" @click="$emit('join-group', profileUser)">
      <el-icon><Plus /></el-icon>
      加入群聊
    </button>
  </template>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ChatDotRound, Delete, Plus } from '@element-plus/icons-vue';
import { getGroupMembers } from '@/api/group';

defineOptions({ name: 'ProfileGroup' });

const props = defineProps({
  profileUser: { type: Object, default: null },
  isGroupMember: { type: Boolean, default: false },
});
defineEmits(['send-message-to', 'dissolve-or-leave-group', 'join-group']);

// ==================== 成员列表 ====================
const members = ref([]);
const loadingMembers = ref(false);

/** 排序：群主排最前，其余按加入时间升序 */
const sortedMembers = computed(() => {
  const list = [...members.value];
  list.sort((a, b) => {
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
    return (a.joinDate || '').localeCompare(b.joinDate || '');
  });
  return list;
});

async function fetchMembers() {
  if (!props.isGroupMember || !props.profileUser?.groupId) return;
  loadingMembers.value = true;
  try {
    const res = await getGroupMembers(props.profileUser.groupId);
    if (res.code === 200 && res.data) {
      members.value = Array.isArray(res.data) ? res.data : (res.data.content || []);
    }
  } catch (e) {
    console.error('加载群成员失败:', e);
  } finally {
    loadingMembers.value = false;
  }
}

// 打开群资料卡时自动加载成员列表
watch(() => props.profileUser?.groupId, (newId) => {
  if (newId && props.isGroupMember) fetchMembers();
}, { immediate: true });
</script>

<style scoped>
/* ==================== 成员列表 ==================== */
.profile-member-section {
  width: 100%;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  overflow: hidden;
}

.profile-member-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.profile-member-title {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.profile-member-count {
  font-size: 12px;
  color: #999;
}

.profile-member-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #bbb;
  font-size: 13px;
}

.profile-member-list {
  max-height: 200px;
  overflow-y: auto;
}

.profile-member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  transition: background 0.2s ease;
}

.profile-member-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.profile-member-item:hover {
  background: rgba(98, 210, 162, 0.08);
}

.profile-member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-member-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-owner-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f5af19, #f12711);
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}
</style>
