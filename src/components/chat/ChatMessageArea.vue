<!--
 * 聊天消息区域
 * 包含聊天头部 + 消息流 + 输入框
 -->
<template>
  <div class="chat-card" :class="{ 'mobile-show': mobileShow }">
    <!-- 未选中占位 -->
    <div v-if="!chatTarget" class="no-chat-selected">
      <el-icon :size="64" color="#ccc"><ChatDotSquare /></el-icon>
      <p>选择好友或群聊开始聊天</p>
    </div>

    <template v-else>
      <!-- 聊天头部 -->
      <div class="chat-header-bar">
        <button class="mobile-back-btn" @click="$emit('back-to-list')">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <div class="chat-target-info">
          <!-- 好友头像（可点击查看资料） -->
          <div v-if="chatType === 'friend'" class="chat-header-avatar avatar avatar-sm"
               :class="chatTarget.isOnline ? 'online' : 'offline'"
               :style="{ background: 'linear-gradient(135deg, #11998e, #38ef7d)' }"
               @click="$emit('view-profile', chatTarget)" title="查看好友资料">
            {{ (chatTarget.userName || '?').charAt(0) }}
            <span class="online-indicator" :class="chatTarget.isOnline ? 'online' : 'offline'"></span>
          </div>
          <div class="chat-target-text">
            <span class="chat-target-name">{{ chatTarget.userName || chatTarget.groupName }}</span>
            <span v-if="chatType === 'friend'" class="chat-target-status" :class="{ online: chatTarget.isOnline }">
              {{ chatTarget.isOnline ? '在线' : '离线' }}
            </span>
            <span v-else class="chat-target-status">{{ chatTarget.memberCount || '' }} 人</span>
          </div>
        </div>
      </div>

      <!-- 消息流 -->
      <div class="message-flow" ref="messageListRef" @scroll="onScroll">
        <div v-if="loadingMore" class="load-more">
          <span class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
          <span>加载更多...</span>
        </div>
        <div v-if="!hasMoreMessages && messages.length > 0" class="no-more-messages">
          <span>— 没有更多消息了 —</span>
        </div>
        <div v-for="msg in messages" :key="msg.recordId || msg._id"
             class="message-row" :class="{ 'is-self': msg.senderId === userId }">
          <div class="message-avatar avatar avatar-sm"
               :style="{
                 background: msg.senderId === userId
                   ? 'linear-gradient(135deg, #11998e, #38ef7d)' : '#9df3c4',
                 color: msg.senderId === userId ? '#fff' : '#333'
               }">
            {{ (msg.senderId === userId ? userName : msg.senderName)?.charAt(0) }}
          </div>
          <div class="message-content">
            <span class="message-sender-name">
              {{ msg.senderId === userId ? '我' : msg.senderName }}
            </span>
            <div class="message-bubble"
                 :class="msg.senderId === userId ? 'self-bubble' : 'other-bubble'">
              {{ msg.content }}
              <span class="message-time">{{ formatMessageTime(msg.sendTime) }}</span>
            </div>
          </div>
        </div>
        <div v-if="messages.length === 0 && !loadingMessages" class="empty-messages">
          <p>暂无聊天记录，发送第一条消息吧！</p>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <textarea class="form-input message-textarea" placeholder="输入消息..."
                  v-model="inputText" @keydown="onKeydown" rows="4"></textarea>
        <div class="input-bottom-row">
          <span class="shortcut-hint">Enter 发送 · Ctrl+Enter 换行</span>
          <button class="submit-button send-btn" @click="$emit('send', inputText)"
                  :disabled="!inputText.trim() || isSending">
            <span v-if="isSending" class="loading-icon"><img src="@/assets/loading.png" alt="Loading"></span>
            <el-icon v-else><Promotion /></el-icon>
            发送
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { Promotion, ChatDotSquare, ArrowLeft } from '@element-plus/icons-vue';

defineOptions({ name: 'ChatMessageArea' });

const props = defineProps({
  chatTarget: { type: Object, default: null },
  chatType: { type: String, default: 'friend' },
  messages: { type: Array, default: () => [] },
  userName: { type: String, default: '' },
  userId: { type: Number, default: null },
  isSending: { type: Boolean, default: false },
  loadingMessages: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false },
  hasMoreMessages: { type: Boolean, default: true },
  mobileShow: { type: Boolean, default: false },
});

const emit = defineEmits(['send', 'scroll-top', 'back-to-list', 'view-profile']);

const messageListRef = ref(null);
const inputText = ref('');

defineExpose({ messageListRef, inputText, scrollToBottom, resetInput });

function scrollToBottom() {
  if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
}

function onScroll() {
  if (!messageListRef.value) return;
  emit('scroll-top');
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    emit('send', inputText.value);
  } else if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    const el = e.target;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = inputText.value;
    inputText.value = val.slice(0, start) + '\n' + val.slice(end);
    nextTick(() => {
      el.selectionStart = el.selectionEnd = start + 1;
    });
  }
}

// 暴露 inputText 的 reset 能力
function resetInput() {
  inputText.value = '';
}

function formatMessageTime(t) {
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
.chat-card {
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

/* 未选中占位 */
.no-chat-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #999;
}
.no-chat-selected p { font-size: 16px; }

/* 聊天头部 */
.chat-header-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.chat-target-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}
.chat-header-avatar {
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  flex-shrink: 0;
}
.chat-header-avatar:hover {
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
}
.chat-target-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.chat-target-name { font-size: 16px; font-weight: 600; }
.chat-target-status { font-size: 12px; opacity: 0.8; }
.chat-target-status.online { opacity: 1; }

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

/* 消息流 */
.message-flow {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.message-flow::-webkit-scrollbar { width: 4px; }
.message-flow::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  border-radius: 2px;
}

.load-more, .no-more-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  color: #999;
  font-size: 12px;
}
.empty-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

/* 消息行 */
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 70%;
}
.message-row.is-self {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.message-row.is-self .message-content { align-items: flex-end; }

.message-sender-name { font-size: 12px; color: #999; padding: 0 4px; }

.message-time {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
  text-align: left;
  margin-top: 4px;
  padding: 0;
}

.message-bubble {
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  max-width: 100%;
}
.self-bubble {
  background: rgba(255, 255, 255, 0.85);
  color: #333;
  border: 1.5px solid #47b687;
  border-radius: 16px 4px 16px 16px;
  box-shadow: 0 2px 10px rgba(56, 239, 125, 0.25), 0 1px 3px rgba(0, 0, 0, 0.06);
}
.self-bubble .message-time {
  color: rgba(0, 0, 0, 0.45);
  text-align: left;
}
.other-bubble {
  background: #9df3c4;
  color: #333;
  border-radius: 4px 16px 16px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.other-bubble .message-time { color: rgba(0, 0, 0, 0.4); text-align: left; }

/* 输入区 */
.input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0 0 16px 16px;
}
.message-textarea {
  flex: 1;
  resize: none;
  line-height: 1.5;
  padding: 10px 14px !important;
  min-height: 100px;
}
.input-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.shortcut-hint { font-size: 12px; color: #aaa; user-select: none; }
.send-btn {
  width: auto !important;
  padding: 8px 24px !important;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ==================== 响应式 ==================== */
@media (max-width: 767px) {
  .chat-card {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100vh;
    z-index: 10;
    border-radius: 0;
    display: none;
  }
  .chat-card.mobile-show { display: flex; }
  .chat-header-bar { border-radius: 0; }
  .input-area { border-radius: 0; }
  .mobile-back-btn { display: flex; }
  .message-row { max-width: 85%; }
}
</style>
