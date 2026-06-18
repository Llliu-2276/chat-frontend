<!--
 * 聊天左侧面板
 * 包含用户信息栏 + 好友列表 + 群聊列表
 * 好友/群聊分区可独立收展，好友支持搜索过滤
 -->
<template>
  <div class="left-panel" :class="{ 'mobile-show': mobileShow }">
    <!-- 顶部用户栏 -->
    <div class="user-bar glass-card">
      <div class="user-bar-profile" @click="$emit('open-profile')" title="查看个人资料">
        <div class="avatar" :class="isLoggedIn ? 'online' : 'offline'"
             :style="{ background: 'linear-gradient(135deg, #11998e, #38ef7d)' }">
          {{ userName?.charAt(0) || '?' }}
        </div>
        <span class="user-bar-name">{{ userName }}</span>
      </div>
      <button class="icon-btn" @click="$emit('logout')" :disabled="isLoggingOut" title="登出">
        <span v-if="isLoggingOut" class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
        <el-icon v-else><SwitchButton /></el-icon>
      </button>
    </div>

    <!-- 列表卡片 -->
    <div class="list-card glass-card">
      <!-- 好友分区 -->
      <div class="list-section" :class="{ collapsed: !friendsExpanded }">
        <div class="card-header" @click="$emit('toggle-friends')">
          <span class="card-title">好友</span>
          <div class="header-actions">
            <button class="card-action-btn" @click.stop="$emit('open-side-panel', 'friend')" title="添加好友">
              <el-icon><Plus /></el-icon>
            </button>
            <el-icon class="collapse-icon" :class="{ expanded: friendsExpanded }"><ArrowDown /></el-icon>
          </div>
        </div>
        <div class="section-body">
          <div class="section-body-inner">
            <div class="card-search">
              <input type="text" class="form-input search-input" placeholder="搜索好友..."
                     v-model="friendSearch" />
              <el-icon class="search-icon"><Search /></el-icon>
            </div>
            <div class="conversation-list">
              <div v-if="loadingFriends" class="list-loading">
                <span class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
              </div>
              <div v-else-if="filteredFriends.length === 0" class="list-empty">
                <p>{{ friendSearch ? '未找到好友' : '暂无好友' }}</p>
              </div>
              <div v-else v-for="f in filteredFriends" :key="'fr-' + f.userId"
                   class="conversation-item"
                   :class="{ active: selectedFriendId === f.userId && chatType === 'friend' }"
                   @click="$emit('select-friend', f)">
                <div class="conv-avatar avatar avatar-sm"
                     :class="f.isOnline ? 'online' : 'offline'"
                     :style="{ background: 'linear-gradient(135deg, #11998e, #38ef7d)' }">
                  {{ f.userName?.charAt(0) || '?' }}
                  <span class="online-indicator" :class="f.isOnline ? 'online' : 'offline'"></span>
                </div>
                <div class="conv-info">
                  <div class="conv-top-row">
                    <span class="conv-name">{{ f.userName }}</span>
                    <span class="conv-time">{{ formatTime(f.lastMessageTime) }}</span>
                  </div>
                  <div class="conv-bottom-row">
                    <span class="conv-last-msg">{{ f.lastMessage || '暂无消息' }}</span>
                    <span v-if="f.unreadCount" class="unread-badge">{{ f.unreadCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分割线 -->
      <div class="section-divider"></div>

      <!-- 群聊分区 -->
      <div class="list-section" :class="{ collapsed: !groupsExpanded }">
        <div class="card-header" @click="$emit('toggle-groups')">
          <span class="card-title">群聊</span>
          <div class="header-actions">
            <div class="action-dropdown">
              <button class="card-action-btn" ref="groupPlusBtnRef"
                      @click.stop="toggleGroupMenu" title="群聊操作">
                <el-icon><Plus /></el-icon>
              </button>
              <!-- 群聊下拉菜单 -->
              <Teleport to="body">
                <Transition name="dropdown">
                  <div v-if="showGroupMenu" class="dropdown-menu" :style="groupMenuPos">
                    <div class="dropdown-item" @click.stop="handleGroupAction('create')">
                      <el-icon><Edit /></el-icon>
                      <span>创建群聊</span>
                    </div>
                    <div class="dropdown-item" @click.stop="handleGroupAction('join')">
                      <el-icon><Plus /></el-icon>
                      <span>添加群聊</span>
                    </div>
                  </div>
                </Transition>
              </Teleport>
            </div>
            <el-icon class="collapse-icon" :class="{ expanded: groupsExpanded }"><ArrowDown /></el-icon>
          </div>
        </div>
        <div class="section-body">
          <div class="section-body-inner">
            <div class="conversation-list">
              <div v-if="groups.length === 0" class="list-empty">
                <p>暂无群聊</p>
              </div>
              <div v-else v-for="g in groups" :key="'gr-' + g.groupId"
                   class="conversation-item"
                   :class="{ active: selectedGroupId === g.groupId && chatType === 'group' }"
                   @click="$emit('select-group', g)">
                <div class="conv-avatar avatar avatar-sm"
                     :style="{ background: 'linear-gradient(135deg, #62d2a2, #9df3c4)', color: '#333' }">
                  {{ g.groupName?.charAt(0) || '#' }}
                </div>
                <div class="conv-info">
                  <div class="conv-top-row">
                    <span class="conv-name">{{ g.groupName }}</span>
                  </div>
                  <div class="conv-bottom-row">
                    <span class="conv-last-msg">{{ g.lastMessage || '暂无消息' }}</span>
                    <span v-if="g.unreadCount" class="unread-badge">{{ g.unreadCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 分割线 -->
      <div class="section-divider"></div>

      <!-- 通知分区 -->
      <div class="list-section" :class="{ collapsed: !notificationsExpanded }">
        <div class="card-header" @click="$emit('toggle-notifications')">
          <span class="card-title">通知</span>
          <div class="header-actions">
            <el-icon class="collapse-icon" :class="{ expanded: notificationsExpanded }"><ArrowDown /></el-icon>
          </div>
        </div>
        <div class="section-body">
          <div class="section-body-inner">
            <div class="conversation-list">
              <!-- 好友通知 -->
              <div class="conversation-item"
                   :class="{ active: activeView === 'notifications' }"
                   @click="$emit('open-notifications')">
                <div class="conv-avatar avatar avatar-sm notification-avatar"
                     :style="{ background: 'linear-gradient(135deg, #62d2a2, #38ef7d)' }">
                  <el-icon :size="18"><UserFilled /></el-icon>
                </div>
                <div class="conv-info">
                  <div class="conv-top-row">
                    <span class="conv-name">好友通知</span>
                  </div>
                  <div class="conv-bottom-row">
                    <span class="conv-last-msg">好友申请通知</span>
                    <span v-if="pendingRequestCount" class="unread-badge">{{ pendingRequestCount }}</span>
                  </div>
                </div>
              </div>
              <!-- 群聊通知 -->
              <div class="conversation-item"
                   :class="{ active: activeView === 'notifications-group' }"
                   @click="$emit('open-group-notifications')">
                <div class="conv-avatar avatar avatar-sm notification-avatar"
                     :style="{ background: 'linear-gradient(135deg, #11998e, #9df3c4)' }">
                  <el-icon :size="18"><Bell /></el-icon>
                </div>
                <div class="conv-info">
                  <div class="conv-top-row">
                    <span class="conv-name">群聊通知</span>
                  </div>
                  <div class="conv-bottom-row">
                    <span class="conv-last-msg">群成员变动通知</span>
                    <span v-if="groupNotificationCount" class="unread-badge">{{ groupNotificationCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { SwitchButton, Plus, ArrowDown, Edit, Search, Bell, UserFilled } from '@element-plus/icons-vue';
import { formatTime } from '@/utils/time';
import { useDropdown } from '@/composables/useDropdown';

defineOptions({ name: 'ChatLeftPanel' });

const props = defineProps({
  friends: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  selectedFriendId: { type: Number, default: null },
  selectedGroupId: { type: Number, default: null },
  chatType: { type: String, default: 'friend' },
  userName: { type: String, default: '' },
  isLoggedIn: { type: Boolean, default: false },
  isLoggingOut: { type: Boolean, default: false },
  friendsExpanded: { type: Boolean, default: true },
  groupsExpanded: { type: Boolean, default: true },
  notificationsExpanded: { type: Boolean, default: true },
  pendingRequestCount: { type: Number, default: 0 },
  groupNotificationCount: { type: Number, default: 0 },
  activeView: { type: String, default: 'chat' },
  mobileShow: { type: Boolean, default: false },
  loadingFriends: { type: Boolean, default: false },
});

const emit = defineEmits([
  'select-friend', 'select-group',
  'toggle-friends', 'toggle-groups', 'toggle-notifications',
  'group-action',
  'logout', 'open-side-panel', 'open-notifications', 'open-group-notifications', 'open-profile',
]);

// ==================== 内部状态 ====================
const friendSearch = ref('');
const groupPlusBtnRef = ref(null);

// 群聊下拉菜单
const { show: showGroupMenu, position: groupMenuPos, toggle: toggleGroupMenu, close: closeGroupMenu } = useDropdown({ triggerRef: groupPlusBtnRef });

// ==================== 计算属性 ====================
const filteredFriends = computed(() => {
  let list = [...props.friends];
  if (friendSearch.value) {
    const q = friendSearch.value.toLowerCase();
    list = list.filter(f => f.userName?.toLowerCase().includes(q) || f.userAccount?.includes(q));
  }
  return list.sort((a, b) => {
    const tA = a.lastMessageTime || '';
    const tB = b.lastMessageTime || '';
    if (tA !== tB) return tA > tB ? -1 : 1;
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return 0;
  });
});

// ==================== 群聊菜单 ====================
function handleGroupAction(action) {
  closeGroupMenu();
  emit('group-action', action);
}

</script>

<style scoped>
/* ==================== 左侧面板 ==================== */
.left-panel {
  position: relative;
  z-index: 5;
  width: 320px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 0;
}

/* 顶部用户栏 */
.user-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
}

.user-bar-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  border-radius: 8px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: opacity 0.2s ease;
}
.user-bar-profile:hover {
  opacity: 0.75;
}

.user-bar-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 图标按钮 */
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: #555;
  font-size: 18px;
}
.icon-btn:hover:not(:disabled) {
  background: rgba(17, 153, 142, 0.15);
  color: #11998e;
  transform: translateY(-2px);
}

/* ==================== 统一列表卡片 ==================== */
.list-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.list-section { min-height: 0; }
.list-section.collapsed { flex: 0 0 auto; }

.header-actions { display: flex; align-items: center; gap: 6px; }

/* 折叠图标 */
.collapse-icon {
  color: #11998e;
  font-size: 14px;
  transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
.collapse-icon.expanded { transform: rotate(180deg); }

/* 可折叠内容区 */
.section-body {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  min-height: 0;
}
.list-section.collapsed .section-body { grid-template-rows: 0fr; }

.section-body-inner {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* 分割线 */
.section-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 16px;
  flex-shrink: 0;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}
.card-header:hover { background: rgba(98, 210, 162, 0.06); }

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #11998e;
  letter-spacing: 0.5px;
}

.card-action-btn {
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
.card-action-btn:hover {
  background: rgba(17, 153, 142, 0.25);
  transform: translateY(-2px);
}

/* 卡片内搜索框 */
.card-search { padding: 8px 14px; position: relative; }
.search-input {
  padding-left: 32px !important;
  padding-top: 7px !important;
  padding-bottom: 7px !important;
  font-size: 13px !important;
}
.search-icon {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
  font-size: 13px;
  pointer-events: none;
}

/* 会话列表 */
.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
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

/* 会话项 */
.conversation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  margin: 0 6px;
}
.conversation-item:hover {
  background: rgba(98, 210, 162, 0.12);
  transform: translateY(-2px);
}
.conversation-item.active { background: rgba(98, 210, 162, 0.22); }

.conv-avatar { position: relative; }
.conv-info { flex: 1; min-width: 0; }

.conv-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}
.conv-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-time {
  font-size: 11px;
  color: #aaa;
  flex-shrink: 0;
  margin-left: 6px;
}

.conv-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.conv-last-msg {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* ==================== 群聊下拉菜单 ==================== */
.action-dropdown { position: relative; display: inline-flex; }

.dropdown-menu {
  position: fixed;
  z-index: 10000;
  min-width: 148px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  pointer-events: auto;
}

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.2s ease; }
.dropdown-enter-from { opacity: 0; transform: translateY(-4px) scale(0.96); }
.dropdown-leave-to { opacity: 0; transform: translateY(-4px) scale(0.96); }

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  font-size: 13px;
  color: #333;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.dropdown-item:hover {
  background: rgba(98, 210, 162, 0.15);
  color: #11998e;
}
.dropdown-item .el-icon { font-size: 15px; color: #11998e; }

.notification-avatar {
  color: #fff;
}

/* ==================== 响应式 ==================== */
@media (max-width: 1199px) {
  .left-panel { width: 280px; min-width: 280px; }
}
@media (max-width: 767px) {
  .left-panel {
    position: absolute;
    inset: 0;
    width: 100%;
    min-width: 100%;
    height: 100vh;
    z-index: 10;
    padding: 12px;
  }
  .left-panel:not(.mobile-show) { display: none; }
}
</style>
