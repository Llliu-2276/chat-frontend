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
        <template v-if="editingGroupName">
          <input type="text" class="form-input profile-inline-input"
                 v-model="editGroupNameValue" maxlength="16"
                 @keydown.enter="confirmEditGroupName" />
          <button class="profile-inline-btn confirm" @click="confirmEditGroupName"
                  :disabled="!editGroupNameValue.trim() || editGroupNameValue.trim() === profileUser.groupName">
            <el-icon><Select /></el-icon>
          </button>
          <button class="profile-inline-btn cancel" @click="cancelEditGroupName">
            <el-icon><CloseBold /></el-icon>
          </button>
        </template>
        <template v-else>
          <span class="profile-info-value">{{ profileUser?.groupName || '-' }}</span>
          <button v-if="profileUser?.isOwner" class="profile-inline-edit-btn" @click="startEditGroupName" title="修改群名称">
            <el-icon><Edit /></el-icon>
          </button>
        </template>
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
        <div class="profile-member-header-right">
          <span class="profile-member-count">{{ sortedMembers.length }} 人</span>
          <button class="profile-invite-btn" @click="$emit('open-invite', profileUser)" title="邀请好友入群">
            <el-icon><Plus /></el-icon>
            <span>邀请好友</span>
          </button>
        </div>
      </div>
      <!-- 选择模式提示 -->
      <div v-if="selectMode" class="profile-select-hint">
        {{ selectMode === 'transfer' ? '选择要转让群主的成员' : '选择要踢出的成员' }}
      </div>
      <div v-if="loadingMembers" class="profile-member-loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else class="profile-member-list">
        <div v-for="m in sortedMembers" :key="'pm-' + m.userId" class="profile-member-item"
             :class="{ 'is-owner': m.isOwner, 'is-selectable': selectMode && !m.isOwner }"
             @click="selectMode && !m.isOwner && (selectedMemberId = m.userId)">
          <el-radio v-if="selectMode && !m.isOwner"
                    v-model="selectedMemberId" :value="m.userId" class="profile-member-radio"
                    @click.stop />
          <div class="profile-member-avatar avatar avatar-sm"
               :style="{ background: 'linear-gradient(135deg, #11998e, #38ef7d)' }">
            {{ (m.userName || '?').charAt(0) }}
          </div>
          <div class="profile-member-info">
            <span class="profile-member-name">{{ m.userName }}</span>
            <span v-if="m.isOwner" class="profile-owner-tag">群主</span>
          </div>
        </div>
      </div>
      <!-- 选择模式操作栏 -->
      <div v-if="selectMode" class="profile-select-actions">
        <button class="profile-select-cancel-btn" @click="cancelSelectMode">取消</button>
        <button class="submit-button" style="width:auto;padding:6px 20px;font-size:12px"
                :disabled="!selectedMemberId" @click="confirmSelectAction">
          确认{{ selectMode === 'transfer' ? '转让' : '踢出' }}
        </button>
      </div>
    </div>

    <button class="submit-button profile-action-btn" @click="$emit('send-message-to', profileUser)">
      <el-icon><ChatDotRound /></el-icon>
      发消息
    </button>
    <!-- 群主管理操作 -->
    <div v-if="profileUser?.isOwner" class="profile-owner-actions">
      <button class="profile-owner-action-btn" @click="enterSelectMode('transfer')">
        <el-icon><Switch /></el-icon>
        <span>转让群主</span>
      </button>
      <button class="profile-owner-action-btn profile-owner-action-btn--danger" @click="enterSelectMode('kick')">
        <el-icon><Remove /></el-icon>
        <span>踢出成员</span>
      </button>
    </div>
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
import { ChatDotRound, Delete, Plus, Switch, Remove, Select, CloseBold, Edit, Loading } from '@element-plus/icons-vue';
import { getGroupInfo, getGroupMembers } from '@/api/group';

defineOptions({ name: 'ProfileGroup' });

const props = defineProps({
  profileUser: { type: Object, default: null },
  isGroupMember: { type: Boolean, default: false },
});
const emit = defineEmits(['send-message-to', 'dissolve-or-leave-group', 'join-group', 'transfer-owner', 'kick-member', 'open-invite', 'edit-group-name']);

// ==================== 选择模式（转让/踢出） ====================
const selectMode = ref(null); // 'transfer' | 'kick' | null
const selectedMemberId = ref(null);

function enterSelectMode(mode) {
  selectMode.value = mode;
  selectedMemberId.value = null;
}

function cancelSelectMode() {
  selectMode.value = null;
  selectedMemberId.value = null;
}

function confirmSelectAction() {
  if (!selectedMemberId.value) return;
  const member = members.value.find(m => m.userId === selectedMemberId.value);
  if (!member) return;
  if (selectMode.value === 'transfer') {
    emit('transfer-owner', member);
  } else if (selectMode.value === 'kick') {
    emit('kick-member', member);
  }
  cancelSelectMode();
}

// ==================== 群名称编辑 ====================
const editingGroupName = ref(false);
const editGroupNameValue = ref('');

function startEditGroupName() {
  editGroupNameValue.value = props.profileUser?.groupName || '';
  editingGroupName.value = true;
}

function cancelEditGroupName() {
  editingGroupName.value = false;
  editGroupNameValue.value = '';
}

function confirmEditGroupName() {
  const trimmed = editGroupNameValue.value.trim();
  if (!trimmed || trimmed === props.profileUser?.groupName) return;
  emit('edit-group-name', trimmed);
  editingGroupName.value = false;
}

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
    // 优先使用 getGroupInfo 获取实时群详情+成员列表
    const infoRes = await getGroupInfo(props.profileUser.groupId);
    if (infoRes.code === 200 && infoRes.data) {
      // 提取成员列表（兼容数组和分页包装）
      const memberList = Array.isArray(infoRes.data.members)
        ? infoRes.data.members
        : (infoRes.data.members?.content || null);
      // 只有成功提取到非空成员列表才返回，否则降级到 getGroupMembers
      if (memberList && memberList.length > 0) {
        members.value = memberList;
        loadingMembers.value = false;
        return;
      }
    }
  } catch (e) {
    console.error('加载群详情失败，降级到成员列表接口:', e);
  }
  // 降级：单独请求成员列表
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
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(245, 175, 25, 0.22), rgba(56, 239, 125, 0.15));
  border: 1px solid rgba(197, 160, 60, 0.45);
  color: #b8932e;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

/* ==================== 成员列表头部（含邀请按钮） ==================== */
.profile-member-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-invite-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #11998e;
  background: rgba(17, 153, 142, 0.1);
  border: 1px solid rgba(17, 153, 142, 0.25);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-invite-btn:hover {
  background: rgba(17, 153, 142, 0.18);
  border-color: rgba(17, 153, 142, 0.4);
}

/* ==================== 选择模式 ==================== */
.profile-select-hint {
  padding: 6px 14px;
  font-size: 12px;
  color: #f5af19;
  background: rgba(245, 175, 25, 0.08);
  border-bottom: 1px solid rgba(245, 175, 25, 0.15);
}

.profile-member-item.is-selectable {
  cursor: pointer;
}

.profile-member-item.is-selectable:hover {
  background: rgba(17, 153, 142, 0.1);
}

.profile-member-radio {
  margin-right: 4px;
  flex-shrink: 0;
}

.profile-select-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.profile-select-cancel-btn {
  padding: 6px 16px;
  font-size: 12px;
  color: #999;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-select-cancel-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #666;
}

/* ==================== 群主管理操作按钮 ==================== */
.profile-owner-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.profile-owner-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 0;
  font-size: 13px;
  font-weight: 600;
  color: #11998e;
  background: rgba(17, 153, 142, 0.1);
  border: 1.5px solid rgba(17, 153, 142, 0.3);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-owner-action-btn:hover {
  background: rgba(17, 153, 142, 0.18);
  border-color: rgba(17, 153, 142, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.15);
}

.profile-owner-action-btn--danger {
  color: #e05353;
  background: rgba(224, 83, 83, 0.08);
  border-color: rgba(224, 83, 83, 0.25);
}

.profile-owner-action-btn--danger:hover {
  background: rgba(224, 83, 83, 0.16);
  border-color: rgba(224, 83, 83, 0.45);
  box-shadow: 0 2px 8px rgba(224, 83, 83, 0.15);
}
</style>
