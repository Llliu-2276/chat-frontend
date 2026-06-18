<!--
 * 好友通知子面板
 * 合并收到与发出的好友申请，以聊天气泡流展示
 * 收到 → 左侧气泡（带同意/拒绝按钮），发出 → 右侧气泡（带状态标签）
 -->
<template>
  <div class="bubble-flow">
    <div v-if="isLoading && mergedRequests.length === 0" class="list-loading">
      <span class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
      <span>加载中...</span>
    </div>
    <div v-else-if="mergedRequests.length === 0" class="list-empty">
      <el-icon :size="48" color="#ccc"><Bell /></el-icon>
      <p>暂无好友申请</p>
    </div>
    <template v-else>
      <template v-for="item in requestsWithDividers" :key="item._divider ? item.key : item._key">
        <div v-if="item._divider" class="time-divider"><span>{{ item.label }}</span></div>
        <div v-else class="message-row" :class="item._isSelf ? 'is-self' : 'is-other'">
          <div class="bubble-avatar avatar avatar-sm"
               :class="{ clickable: true }"
               :style="item._isSelf
                 ? { background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff' }
                 : { background: '#9df3c4', color: '#333' }"
               @click="viewUserProfile(item)"
               :title="'查看 ' + item._displayName + ' 的资料'">
            {{ item._displayName?.charAt(0) || '?' }}
          </div>
          <div class="bubble-content">
            <span class="bubble-sender-name">{{ item._headerLabel }}</span>
            <div class="bubble" :class="item._isSelf ? 'self-bubble' : 'other-bubble'">
              <div class="req-account-row">
                <span class="req-label">账号：</span>{{ item._account }}
              </div>
              <div v-if="item.message" class="req-message">{{ item.message }}</div>
              <div class="bubble-footer">
                <span class="bubble-time">{{ formatRequestTime(item.createTime) }}</span>
                <span class="req-status-tag" :class="statusClass(item.status)">
                  {{ item.statusDescription }}
                </span>
              </div>
            </div>
            <div v-if="!item._isSelf && item.status === 0" class="bubble-actions">
              <button class="btn-accept" style="padding:6px 16px;font-size:12px"
                      @click="$emit('handle-request', item.requestId, true)">
                <el-icon><Select /></el-icon> 同意
              </button>
              <button class="btn-danger" style="padding:6px 16px;font-size:12px"
                      @click="$emit('handle-request', item.requestId, false)">
                <el-icon><CloseBold /></el-icon> 拒绝
              </button>
            </div>
          </div>
        </div>
      </template>
      <div v-if="!hasMoreReceived && !hasMoreSent" class="no-more">— 没有更多了 —</div>
      <button v-else class="btn-accept" :disabled="isLoadingMore" style="align-self:center;padding:8px 24px;font-size:13px"
              @click="$emit('load-more')">
        <span v-if="isLoadingMore" class="loading-icon">
          <img src="@/assets/loading.png" alt="Loading">
        </span>
        {{ isLoadingMore ? '加载中...' : '加载更多' }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Bell, Select, CloseBold } from '@element-plus/icons-vue';
import { formatTime, insertTimeDividers } from '@/utils/time';

defineOptions({ name: 'ChatNotificationFriend' });

const props = defineProps({
  receivedRequests: { type: Array, default: () => [] },
  sentRequests: { type: Array, default: () => [] },
  loadingReceived: { type: Boolean, default: false },
  loadingSent: { type: Boolean, default: false },
  loadingMoreReceived: { type: Boolean, default: false },
  loadingMoreSent: { type: Boolean, default: false },
  hasMoreReceived: { type: Boolean, default: false },
  hasMoreSent: { type: Boolean, default: false },
});

const emit = defineEmits(['handle-request', 'load-more', 'view-profile']);

const formatRequestTime = (t) => formatTime(t);
const isLoading = computed(() => props.loadingReceived || props.loadingSent);
const isLoadingMore = computed(() => props.loadingMoreReceived || props.loadingMoreSent);

function statusClass(status) {
  return { pending: status === 0, accepted: status === 1, rejected: status === 2 };
}

const mergedRequests = computed(() => {
  const merged = [];
  for (const req of props.receivedRequests) {
    merged.push({ ...req, _key: 'recv-' + req.requestId, _isSelf: false, _displayName: req.senderName, _headerLabel: req.senderName, _account: req.senderAccount });
  }
  for (const req of props.sentRequests) {
    merged.push({ ...req, _key: 'sent-' + req.requestId, _isSelf: true, _displayName: req.receiverName, _headerLabel: '发给 ' + req.receiverName, _account: req.receiverAccount });
  }
  merged.sort((a, b) => {
    const ta = a.createTime ? new Date(a.createTime).getTime() : 0;
    const tb = b.createTime ? new Date(b.createTime).getTime() : 0;
    return ta - tb;
  });
  return merged;
});

const requestsWithDividers = computed(() =>
  insertTimeDividers(mergedRequests.value, 'createTime', {
    keyFn: (i, item) => item._divider ? `div-${i}` : `div-${item.requestId}`,
  })
);

function viewUserProfile(item) {
  const userId = item._isSelf ? item.receiverId : item.senderId;
  const userName = item._isSelf ? item.receiverName : item.senderName;
  const userAccount = item._isSelf ? item.receiverAccount : item.senderAccount;
  emit('view-profile', { userId, userName, userAccount });
}
</script>
