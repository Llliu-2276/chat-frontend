<!--
 * 聊天侧面板
 * 支持添加好友 / 创建群聊 / 加入群聊 三个子模式
 * 通过 mode + groupSubMode 控制显示内容
 -->
<template>
  <Transition name="slide-panel">
    <div v-if="visible" class="side-panel glass-card" :class="{ 'dimmed': dimmed }">
      <!-- 邀请模式遮罩 -->
      <div v-if="dimmed" class="dimmed-overlay"></div>
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
                       v-model="searchKeyword" @input="onSearch" maxlength="20" />
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
                  <button v-else class="panel-msg-btn"
                          @click.stop="$emit('send-message-to', user)">
                    发消息
                  </button>
                </div>
              </div>
            </template>

            <!-- 创建群聊模式 -->
            <template v-else-if="mode === 'group' && groupSubMode === 'create'">
              <div class="panel-section">
                <div class="panel-form-group">
                  <label class="form-label">群聊名称</label>
                  <input type="text" class="form-input" placeholder="请输入群聊名称"
                         v-model="groupNameInput" maxlength="16" />
                </div>
                <button class="submit-button panel-action-btn"
                        :disabled="!groupNameInput.trim()"
                        @click="handleCreate">
                  创建群聊
                </button>
              </div>
            </template>

            <!-- 加入群聊模式（搜索群聊 → 结果列表） -->
            <template v-else-if="mode === 'group' && groupSubMode === 'join'">
              <div class="panel-search">
                <input type="text" class="form-input search-input" placeholder="搜索群聊名称或账号..."
                       v-model="searchKeyword" @input="onGroupSearch" maxlength="20" />
                <el-icon class="search-icon"><Search /></el-icon>
              </div>
              <div class="panel-results">
                <div v-if="groupSearching" class="list-loading">
                  <span class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
                </div>
                <div v-else-if="groupSearchResults.length === 0 && searchKeyword" class="list-empty">
                  <p>未找到群聊</p>
                </div>
                <div v-else-if="groupSearchResults.length === 0 && !searchKeyword" class="list-empty">
                  <p>输入关键词搜索群聊</p>
                </div>
                <div v-else v-for="group in groupSearchResults" :key="'gr-' + group.groupId"
                     class="panel-result-item">
                  <div class="panel-result-user" @click="$emit('view-profile', group)">
                    <div class="conv-avatar avatar avatar-sm"
                         :style="{ background: 'linear-gradient(135deg, #11998e, #38ef7d)' }">
                      {{ group.groupName?.charAt(0) || '?' }}
                    </div>
                    <div class="conv-info">
                      <span class="conv-name">{{ group.groupName }}</span>
                      <span class="conv-account">{{ group.account }}</span>
                    </div>
                  </div>
                  <button v-if="!checkIsGroupMember(group)" class="panel-add-btn"
                          @click.stop="$emit('join-group', group)"
                          :disabled="joiningGroupIds.has(group.groupId)">
                    {{ joiningGroupIds.has(group.groupId) ? '加入中...' : '加入群聊' }}
                  </button>
                  <button v-else class="panel-msg-btn"
                          @click.stop="$emit('send-message-to-group', group)">
                    发消息
                  </button>
                </div>
              </div>
            </template>

            <!-- 个人资料模式 -->
            <template v-else-if="mode === 'profile'">
              <ChatProfileCard
                :profile-user="profileUser"
                :profile-context="profileContext"
                :profile-loading="profileLoading"
                :is-group-member="isGroupMember"
                @edit-username="(name) => $emit('edit-username', name)"
                @change-password="(data) => $emit('change-password', data)"
                @send-message-to="(user) => $emit('send-message-to', user)"
                @add-friend-from-profile="(user) => $emit('add-friend-from-profile', user)"
                @delete-friend="(user) => $emit('delete-friend', user)"
                @dissolve-or-leave-group="(user) => $emit('dissolve-or-leave-group', user)"
                @join-group="(group) => $emit('join-group', group)"
                @transfer-owner="(group, member) => $emit('transfer-owner', group, member)"
                @kick-member="(group, member) => $emit('kick-member', group, member)"
                @open-invite="(group) => $emit('open-invite', group)"
                @logout="$emit('logout')"
              />
            </template>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ArrowLeft, Search } from '@element-plus/icons-vue';
import ChatProfileCard from '@/components/chat/ChatProfileCard.vue';

defineOptions({ name: 'ChatSidePanel' });

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'friend' },        // 'friend' | 'group' | 'profile'
  groupSubMode: { type: String, default: 'join' },   // 'join' | 'create'
  searchResults: { type: Array, default: () => [] },
  searching: { type: Boolean, default: false },
  friends: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },         // 群聊列表（用于判断是否已加入）
  sentRequests: { type: Array, default: () => [] },
  sendingRequestIds: { type: Set, default: () => new Set() },
  // 群聊搜索
  groupSearchResults: { type: Array, default: () => [] },
  groupSearching: { type: Boolean, default: false },
  joiningGroupIds: { type: Set, default: () => new Set() },
  // Profile mode props
  profileUser: { type: Object, default: null },       // 当前查看的用户
  profileContext: { type: String, default: 'self' },  // 'self' | 'friend' | 'stranger' | 'group'
  profileLoading: { type: Boolean, default: false },  // Profile 操作加载中
  isGroupMember: { type: Boolean, default: false },   // 当前查看的群聊是否已加入
  dimmed: { type: Boolean, default: false },           // 邀请模式遮罩
});

const emit = defineEmits([
  'close', 'search', 'add-friend',
  'create-group', 'join-group',
  'group-search',             // 搜索群聊，参数：keyword
  'send-message-to-group',    // 从搜索结果发群聊消息，参数：group
  'switch-mode',
  // Profile mode events
  'edit-username',          // 修改用户名，参数：newUserName
  'change-password',        // 修改密码，参数：{ oldPassword, newPassword }
  'send-message-to',        // 发消息，参数：user
  'add-friend-from-profile',// 从资料卡添加好友，参数：user
  'delete-friend',          // 删除好友，参数：user
  'dissolve-or-leave-group',// 解散/退出群聊（profile-group），参数：groupObject
  'transfer-owner',         // 转让群主（profile-group），参数：(group, targetMember)
  'kick-member',            // 踢出成员（profile-group），参数：(group, targetMember)
  'open-invite',            // 打开邀请好友模式（profile-group），参数：group
  'view-profile',           // 查看用户/群聊资料（搜索结果点击），参数：user/group
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
    if (props.profileContext === 'group') return '群聊资料';
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
}

const groupNameInput = ref('');

/** 创建群聊——清空输入并 emit */
function handleCreate() {
  const name = groupNameInput.value.trim();
  if (!name) return;
  emit('create-group', name);
  groupNameInput.value = '';
}

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

/** 检查当前用户是否已是某群聊成员（注意：与 prop isGroupMember 区分） */
function checkIsGroupMember(group) {
  return props.groups.some(g => g.groupId === group.groupId);
}

/** 检查是否对某用户有待处理的申请 */
function hasPendingRequest(user) {
  return props.sentRequests.some(
    r => r.receiverId === user.userId && r.status === 0
  );
}

/** 群聊搜索（带防抖由父组件处理，此处直接 emit） */
function onGroupSearch() {
  emit('group-search', searchKeyword.value);
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
}

/* 邀请模式遮罩 */
.dimmed-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.12);
  pointer-events: all;
  border-radius: inherit;
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
  border-radius: 6px;
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

/* 发消息按钮（搜索结果中已是好友/已是群成员时显示） */
.panel-msg-btn {
  padding: 4px 14px;
  border: 1.5px solid rgba(17, 153, 142, 0.4);
  border-radius: 6px;
  background: rgba(17, 153, 142, 0.1);
  color: #11998e;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.panel-msg-btn:hover {
  background: rgba(17, 153, 142, 0.22);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.15);
}

.panel-friend-tag {
  padding: 4px 12px;
  border: 1.5px solid rgba(17, 153, 142, 0.4);
  border-radius: 6px;
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
  border: 1.5px solid rgba(230, 162, 60, 0.45);
  border-radius: 6px;
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
