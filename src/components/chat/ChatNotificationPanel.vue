<!--
 * 通知面板（中间区域）
 * 双重入口：好友通知 + 群聊通知
 * 委托具体渲染到 ChatNotificationFriend / ChatNotificationGroup
 -->
<template>
  <div class="notification-panel glass-card" :class="{ 'mobile-show': mobileShow }">
    <!-- 头部：好友通知 -->
    <div v-if="initialTab === 'friend'" class="notification-header">
      <button class="mobile-back-btn" @click="$emit('back-to-list')">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <span class="notification-title">好友通知</span>
      <span v-if="pendingCount" class="header-badge">{{ pendingCount }}</span>
    </div>

    <!-- 头部：群聊通知 -->
    <div v-if="initialTab === 'group'" class="notification-header">
      <button class="mobile-back-btn" @click="$emit('back-to-list')">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <span class="notification-title">群聊通知</span>
      <span v-if="groupNotifications.length" class="header-badge group-badge">{{ groupNotifications.length }}</span>
    </div>

    <!-- 好友通知内容 -->
    <ChatNotificationFriend
      v-if="initialTab === 'friend'"
      :received-requests="receivedRequests"
      :sent-requests="sentRequests"
      :loading-received="loadingReceived"
      :loading-sent="loadingSent"
      :loading-more-received="loadingMoreReceived"
      :loading-more-sent="loadingMoreSent"
      :has-more-received="hasMoreReceived"
      :has-more-sent="hasMoreSent"
      @handle-request="(id, accept) => $emit('handle-request', id, accept)"
      @load-more="$emit('load-more')"
      @view-profile="(user) => $emit('view-profile', user)"
    />

    <!-- 群聊通知内容 -->
    <ChatNotificationGroup
      v-if="initialTab === 'group'"
      :group-notifications="groupNotifications"
      :join-group-requests="joinGroupRequests"
      @handle-join-request="(gid, rid, accept) => $emit('handle-join-request', gid, rid, accept)"
      @view-profile="(user) => $emit('view-profile', user)"
    />
  </div>
</template>

<script setup>
import { ArrowLeft } from '@element-plus/icons-vue';
import ChatNotificationFriend from '@/components/chat/ChatNotificationFriend.vue';
import ChatNotificationGroup from '@/components/chat/ChatNotificationGroup.vue';

defineOptions({ name: 'ChatNotificationPanel' });

defineProps({
  receivedRequests: { type: Array, default: () => [] },
  sentRequests: { type: Array, default: () => [] },
  loadingReceived: { type: Boolean, default: false },
  loadingSent: { type: Boolean, default: false },
  loadingMoreReceived: { type: Boolean, default: false },
  loadingMoreSent: { type: Boolean, default: false },
  hasMoreReceived: { type: Boolean, default: false },
  hasMoreSent: { type: Boolean, default: false },
  pendingCount: { type: Number, default: 0 },
  groupNotifications: { type: Array, default: () => [] },
  joinGroupRequests: { type: Array, default: () => [] },
  initialTab: { type: String, default: 'friend' },
  mobileShow: { type: Boolean, default: false },
});

defineEmits(['handle-request', 'handle-join-request', 'load-more', 'back-to-list', 'view-profile']);
</script>

<!-- 共享样式（unscoped → 子组件可使用 .bubble-flow / .bubble / .message-row 等类） -->
<style>
/* ==================== 通知面板整体 ==================== */
.notification-panel {
  position: relative;
  z-index: 5;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.notification-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.notification-title { font-size: 16px; font-weight: 600; }

.header-badge {
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 10px; background: rgba(255,255,255,0.3);
  color: #fff; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; line-height: 1;
}
.header-badge.group-badge { background: rgba(255,255,255,0.25); }

.mobile-back-btn {
  display: none; width: 36px; height: 36px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.2); color: #fff;
  cursor: pointer; font-size: 18px; align-items: center; justify-content: center;
}

/* ==================== 气泡对话流 ==================== */
.bubble-flow {
  flex: 1; overflow-y: auto; padding: 20px 24px;
  display: flex; flex-direction: column;
}

.list-loading, .list-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 48px 16px; color: #bbb; font-size: 14px; flex: 1;
}
.list-empty p { margin: 0; }

/* ==================== 消息行（聊天气泡布局） ==================== */
.message-row {
  display: flex; align-items: flex-start; gap: 10px; max-width: 75%;
}
.message-row.is-other { align-self: flex-start; }
.message-row.is-self { align-self: flex-end; flex-direction: row-reverse; }

.bubble-avatar { flex-shrink: 0; margin-top: 2px; }
.bubble-avatar.clickable { cursor: pointer; transition: all 0.3s ease; }
.bubble-avatar.clickable:hover { transform: scale(1.15); box-shadow: 0 2px 8px rgba(17,153,142,0.3); }

.bubble-content { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.message-row.is-self .bubble-content { align-items: flex-end; }
.message-row.is-other .bubble-content { align-items: flex-start; }

.bubble-sender-name { font-size: 12px; color: #999; padding: 0 4px; }

/* ==================== 气泡本体 ==================== */
.bubble { padding: 10px 16px; font-size: 14px; line-height: 1.6; word-break: break-word; max-width: 100%; display: flex; flex-direction: column; gap: 6px; }
.other-bubble { background: #9df3c4; color: #333; border-radius: 4px 16px 16px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.self-bubble { background: rgba(255,255,255,0.85); color: #333; border: 1.5px solid #47b687; border-radius: 16px 4px 16px 16px; box-shadow: 0 2px 10px rgba(56,239,125,0.25), 0 1px 3px rgba(0,0,0,0.06); }

.req-account-row { font-size: 12px; opacity: 0.75; }
.req-label { font-weight: 500; }
.req-message { font-size: 14px; line-height: 1.5; padding: 6px 10px; border-radius: 8px; word-break: break-word; }
.other-bubble .req-message, .self-bubble .req-message { background: rgba(0,0,0,0.06); }

.bubble-footer { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-top: 2px; }
.bubble-time { opacity: 0.55; }
.other-bubble .bubble-time, .self-bubble .bubble-time { color: rgba(0,0,0,0.45); }

.req-status-tag { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 10px; }
.other-bubble .req-status-tag.pending { background: rgba(230,162,60,0.15); color: #c27c0e; }
.other-bubble .req-status-tag.accepted { background: rgba(17,153,142,0.15); color: #0e8a7e; }
.other-bubble .req-status-tag.rejected { background: rgba(0,0,0,0.08); color: #888; }
.self-bubble .req-status-tag.pending { background: rgba(230,162,60,0.18); color: #b06d0c; }
.self-bubble .req-status-tag.accepted { background: rgba(17,153,142,0.18); color: #0e8a7e; }
.self-bubble .req-status-tag.rejected { background: rgba(0,0,0,0.08); color: #888; }

.bubble-actions { display: flex; gap: 8px; margin-top: 6px; padding: 0 4px; }

.no-more, .time-divider { text-align: center; font-size: 12px; color: #bbb; padding: 8px 0; user-select: none; }
.time-divider span { position: relative; }
.time-divider span::before, .time-divider span::after {
  content: ''; position: absolute; top: 50%; width: 32px; height: 1px; background: rgba(0,0,0,0.08);
}
.time-divider span::before { right: calc(100% + 10px); }
.time-divider span::after { left: calc(100% + 10px); }

/* ==================== 群聊通知气泡 ==================== */
.group-notif-bubble { gap: 4px; }
.group-notif-action { font-weight: 600; color: #11998e; }
.group-notif-group-name { font-weight: 600; color: #333; }

/* ==================== 响应式 ==================== */
@media (max-width: 767px) {
  .notification-panel {
    position: absolute; inset: 0; width: 100%; height: 100vh;
    z-index: 10; border-radius: 0; display: none;
  }
  .notification-panel.mobile-show { display: flex; }
  .notification-header { border-radius: 0; }
  .mobile-back-btn { display: flex; }
  .message-row { max-width: 85%; }
  .bubble-flow { padding: 16px 14px; }
}
</style>
