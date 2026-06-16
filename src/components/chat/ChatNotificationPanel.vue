<!--
 * 通知面板（中间区域）— 合并对话气泡风格
 * 收到与发出的好友申请按时间合并为一条对话流
 * 收到的申请 → 左侧气泡（他人气泡样式）
 * 发出的申请 → 右侧气泡（自己气泡样式）
 -->
<template>
  <div class="notification-panel" :class="{ 'mobile-show': mobileShow }">
    <!-- 头部 -->
    <div class="notification-header">
      <button class="mobile-back-btn" @click="$emit('back-to-list')">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <span class="notification-title">好友申请</span>
      <span v-if="pendingCount" class="header-badge">{{ pendingCount }}</span>
    </div>

    <!-- 气泡对话流 -->
    <div class="bubble-flow">
      <!-- 加载中 -->
      <div v-if="isLoading && mergedRequests.length === 0" class="list-loading">
        <span class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="mergedRequests.length === 0" class="list-empty">
        <el-icon :size="48" color="#ccc"><Bell /></el-icon>
        <p>暂无好友申请</p>
      </div>

      <!-- 合并列表 -->
      <template v-else>
        <div v-for="req in mergedRequests" :key="req._key"
             class="message-row" :class="req._isSelf ? 'is-self' : 'is-other'">
          <!-- 头像 -->
          <div class="bubble-avatar avatar avatar-sm"
               :style="req._isSelf
                 ? { background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff' }
                 : { background: '#9df3c4', color: '#333' }">
            {{ req._displayName?.charAt(0) || '?' }}
          </div>
          <!-- 气泡内容 -->
          <div class="bubble-content">
            <span class="bubble-sender-name">{{ req._headerLabel }}</span>
            <div class="bubble" :class="req._isSelf ? 'self-bubble' : 'other-bubble'">
              <div class="req-account-row">
                <span class="req-label">账号：</span>{{ req._account }}
              </div>
              <div v-if="req.message" class="req-message">{{ req.message }}</div>
              <div class="bubble-footer">
                <span class="bubble-time">{{ formatRequestTime(req.createTime) }}</span>
                <span class="req-status-tag" :class="statusClass(req.status)">
                  {{ req.statusDescription }}
                </span>
              </div>
            </div>
            <!-- 收到的申请且待处理 → 操作按钮 -->
            <div v-if="!req._isSelf && req.status === 0" class="bubble-actions">
              <button class="action-btn accept-btn"
                      @click="$emit('handle-request', req.requestId, true)">
                <el-icon><Select /></el-icon> 同意
              </button>
              <button class="action-btn reject-btn"
                      @click="$emit('handle-request', req.requestId, false)">
                <el-icon><CloseBold /></el-icon> 拒绝
              </button>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="!hasMoreReceived && !hasMoreSent" class="no-more">— 没有更多了 —</div>
        <button v-else class="load-more-btn" :disabled="isLoadingMore"
                @click="$emit('load-more')">
          <span v-if="isLoadingMore" class="loading-icon">
            <img src="@/assets/loading.png" alt="Loading">
          </span>
          {{ isLoadingMore ? '加载中...' : '加载更多' }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ArrowLeft, Bell, Select, CloseBold } from '@element-plus/icons-vue';

defineOptions({ name: 'ChatNotificationPanel' });

const props = defineProps({
  /** 收到的申请列表 */
  receivedRequests: { type: Array, default: () => [] },
  /** 发出的申请列表 */
  sentRequests: { type: Array, default: () => [] },
  loadingReceived: { type: Boolean, default: false },
  loadingSent: { type: Boolean, default: false },
  loadingMoreReceived: { type: Boolean, default: false },
  loadingMoreSent: { type: Boolean, default: false },
  hasMoreReceived: { type: Boolean, default: false },
  hasMoreSent: { type: Boolean, default: false },
  /** 待处理申请数量 */
  pendingCount: { type: Number, default: 0 },
  mobileShow: { type: Boolean, default: false },
});

defineEmits([
  'handle-request',
  'load-more',
  'back-to-list',
]);

/** 初始加载中（首次加载时展示全屏 loading） */
const isLoading = computed(() => props.loadingReceived || props.loadingSent);

/** 加载更多中 */
const isLoadingMore = computed(() => props.loadingMoreReceived || props.loadingMoreSent);

/**
 * 合并收到与发出的申请，按时间升序排列（最新在底部）
 */
const mergedRequests = computed(() => {
  const merged = [];

  for (const req of props.receivedRequests) {
    merged.push({
      ...req,
      _key: 'recv-' + req.requestId,
      _isSelf: false,
      _displayName: req.senderName,
      _headerLabel: req.senderName,
      _account: req.senderAccount,
    });
  }

  for (const req of props.sentRequests) {
    merged.push({
      ...req,
      _key: 'sent-' + req.requestId,
      _isSelf: true,
      _displayName: req.receiverName,
      _headerLabel: '发给 ' + req.receiverName,
      _account: req.receiverAccount,
    });
  }

  // 按时间升序排列 → 最新的在底部（与聊天消息流一致）
  merged.sort((a, b) => {
    const ta = a.createTime ? new Date(a.createTime).getTime() : 0;
    const tb = b.createTime ? new Date(b.createTime).getTime() : 0;
    return ta - tb;
  });

  return merged;
});

/**
 * 状态对应样式类名
 * @param {number} status - 0待处理 1已同意 2已拒绝
 */
function statusClass(status) {
  return { pending: status === 0, accepted: status === 1, rejected: status === 2 };
}

/**
 * 格式化申请时间
 * @param {string} t - ISO时间字符串
 */
function formatRequestTime(t) {
  if (!t) return '';
  const normalized = t.replace('T', ' ');
  if (normalized.length < 16) return normalized;
  const datePart = normalized.slice(0, 10);
  const timePart = normalized.slice(11, 16);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (datePart === todayStr) return timePart;
  return normalized.slice(5, 10) + ' ' + timePart;
}
</script>

<style scoped>
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
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 头部 */
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
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.mobile-back-btn {
  display: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  font-size: 18px;
  align-items: center;
  justify-content: center;
}

/* ==================== 气泡对话流 ==================== */
.bubble-flow {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
}
.bubble-flow::-webkit-scrollbar { width: 4px; }
.bubble-flow::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  border-radius: 2px;
}

.list-loading, .list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 16px;
  color: #bbb;
  font-size: 14px;
  flex: 1;
}
.list-empty p { margin: 0; }

/* ==================== 消息行（聊天气泡布局） ==================== */
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 75%;
}
.message-row.is-other {
  align-self: flex-start;
}
.message-row.is-self {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.bubble-avatar {
  flex-shrink: 0;
  margin-top: 2px;
}

.bubble-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.message-row.is-self .bubble-content { align-items: flex-end; }
.message-row.is-other .bubble-content { align-items: flex-start; }

.bubble-sender-name {
  font-size: 12px;
  color: #999;
  padding: 0 4px;
}

/* ==================== 气泡本体 ==================== */
.bubble {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.other-bubble {
  background: #9df3c4;
  color: #333;
  border-radius: 4px 16px 16px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.self-bubble {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
  border-radius: 16px 4px 16px 16px;
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.2);
}

/* 气泡内：账号行 */
.req-account-row {
  font-size: 12px;
  opacity: 0.75;
}
.req-label {
  font-weight: 500;
}

/* 气泡内：申请留言 */
.req-message {
  font-size: 14px;
  line-height: 1.5;
  padding: 6px 10px;
  border-radius: 8px;
  word-break: break-word;
}
.other-bubble .req-message {
  background: rgba(0, 0, 0, 0.06);
}
.self-bubble .req-message {
  background: rgba(255, 255, 255, 0.18);
}

/* 气泡底部：时间 + 状态 */
.bubble-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  margin-top: 2px;
}
.bubble-time {
  opacity: 0.55;
}
.other-bubble .bubble-time { color: rgba(0, 0, 0, 0.45); }
.self-bubble .bubble-time { color: rgba(255, 255, 255, 0.75); }

.req-status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 10px;
}
/* 他人气泡内的状态标签 */
.other-bubble .req-status-tag.pending {
  background: rgba(230, 162, 60, 0.15);
  color: #c27c0e;
}
.other-bubble .req-status-tag.accepted {
  background: rgba(17, 153, 142, 0.15);
  color: #0e8a7e;
}
.other-bubble .req-status-tag.rejected {
  background: rgba(0, 0, 0, 0.08);
  color: #888;
}
/* 自己气泡内的状态标签 */
.self-bubble .req-status-tag.pending {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.self-bubble .req-status-tag.accepted {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}
.self-bubble .req-status-tag.rejected {
  background: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.8);
}

/* ==================== 操作按钮（收到申请时） ==================== */
.bubble-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  padding: 0 4px;
}
.action-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.accept-btn {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
}
.accept-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
}
.reject-btn {
  background: rgba(0, 0, 0, 0.06);
  color: #999;
}
.reject-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
  color: #666;
}

/* ==================== 加载更多 ==================== */
.load-more-btn {
  align-self: center;
  padding: 8px 24px;
  border: 1px solid rgba(17, 153, 142, 0.3);
  border-radius: 20px;
  background: transparent;
  color: #11998e;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.load-more-btn:hover:not(:disabled) {
  background: rgba(17, 153, 142, 0.06);
}
.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.no-more {
  text-align: center;
  font-size: 12px;
  color: #ccc;
  padding: 8px 0;
}

/* ==================== 响应式 ==================== */
@media (max-width: 767px) {
  .notification-panel {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100vh;
    z-index: 10;
    border-radius: 0;
    display: none;
  }
  .notification-panel.mobile-show { display: flex; }
  .notification-header { border-radius: 0; }
  .mobile-back-btn { display: flex; }
  .message-row { max-width: 85%; }
  .bubble-flow { padding: 16px 14px; }
}
</style>
