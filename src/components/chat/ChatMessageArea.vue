<!--
 * 聊天消息区域
 * 包含聊天头部 + 消息流 + 输入框
 -->
<template>
  <div class="chat-card glass-card" :class="{ 'mobile-show': mobileShow, 'dimmed': dimmed }">
    <!-- 邀请模式遮罩 -->
    <div v-if="dimmed" class="dimmed-overlay"></div>
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
          <!-- 群聊头像（可点击查看群资料） -->
          <div v-else class="chat-header-avatar avatar avatar-sm"
               :style="{ background: 'linear-gradient(135deg, #62d2a2, #9df3c4)', color: '#333' }"
               @click="$emit('view-profile', chatTarget)" title="查看群聊资料">
            {{ (chatTarget.groupName || '#').charAt(0) }}
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
        <template v-for="item in messagesWithDividers" :key="item._divider ? item.key : (item.recordId || item._id)">
          <!-- 时间分隔线 -->
          <div v-if="item._divider" class="time-divider">
            <span>{{ item.label }}</span>
          </div>
          <!-- 消息气泡 -->
          <div v-else class="message-row" :class="{ 'is-self': item.senderId === userId }">
            <div class="message-avatar avatar avatar-sm"
                 :style="{
                   background: item.senderId === userId
                     ? 'linear-gradient(135deg, #11998e, #38ef7d)' : '#9df3c4',
                   color: item.senderId === userId ? '#fff' : '#333'
                 }">
              {{ (item.senderId === userId ? userName : item.senderName)?.charAt(0) }}
            </div>
            <div class="message-content">
              <span class="message-sender-name">
                {{ item.senderId === userId && chatType !== 'group' ? '我' : item.senderName }}
              </span>
              <!-- 已撤回的消息气泡 -->
              <div v-if="item.recalled" class="message-bubble recalled-bubble">
                {{ item.senderId === userId ? '你撤回了一条消息' : (item.senderName || '对方') + '撤回了一条消息' }}
                <span class="message-time">{{ formatTime(item.sendTime) }}</span>
              </div>
              <!-- 正常消息气泡 -->
              <div v-else class="message-bubble"
                   :class="item.senderId === userId ? 'self-bubble' : 'other-bubble'"
                   @contextmenu.prevent="onMessageContextMenu($event, item)">
                {{ item.content }}
                <span class="message-time">{{ formatTime(item.sendTime) }}</span>
              </div>
            </div>
          </div>
        </template>
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

  <!-- 右键菜单（Teleported to body，复用 dropdown 磨砂玻璃风格） -->
  <Teleport to="body">
    <Transition name="contextmenu">
      <div v-if="contextMenu.show" class="recall-context-menu dropdown-menu"
           :style="{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 10001 }">
        <div class="dropdown-item" @click.stop="handleRecall">
          <span>撤回</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { Promotion, ChatDotSquare, ArrowLeft } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import { formatTime, insertTimeDividers } from '@/utils/time';

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
  dimmed: { type: Boolean, default: false },
});

const emit = defineEmits(['send', 'scroll-top', 'back-to-list', 'view-profile', 'recall-message']);

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

// ==================== 右键菜单（消息撤回） ====================
const contextMenu = ref({ show: false, x: '0px', y: '0px', message: null });

/** 检查消息是否可撤回（自己发送、2分钟内、未被撤回、有 recordId） */
function canRecall(msg) {
  if (!msg || msg.recalled) return false;
  if (msg.senderId !== props.userId) return false;
  if (!msg.recordId) return false;
  const sendTime = new Date((msg.sendTime || '').replace('T', ' ')).getTime();
  if (isNaN(sendTime)) return false;
  return Date.now() - sendTime < 2 * 60 * 1000;
}

/** 右键消息气泡 */
function onMessageContextMenu(e, msg) {
  if (!canRecall(msg)) return;
  e.preventDefault();
  // 边界处理：防止菜单超出屏幕
  let x = e.clientX;
  let y = e.clientY;
  const menuW = 120, menuH = 40;
  if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
  if (y + menuH > window.innerHeight) y = y - menuH - 8;
  contextMenu.value = { show: true, x: x + 'px', y: y + 'px', message: msg };
}

/** 关闭右键菜单 */
function closeContextMenu() {
  contextMenu.value.show = false;
}

/** 确认撤回消息 */
function handleRecall() {
  const msg = contextMenu.value.message;
  closeContextMenu();
  ElMessageBox.confirm('确定要撤回这条消息吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    customClass: 'confirm-dialog',
  }).then(() => {
    emit('recall-message', msg);
  }).catch(() => { /* 用户取消 */ });
}

/** 点击菜单外部关闭 */
function onDocumentClick(e) {
  if (!contextMenu.value.show) return;
  const menu = document.querySelector('.recall-context-menu');
  if (menu && !menu.contains(e.target)) {
    closeContextMenu();
  }
}

onMounted(() => { document.addEventListener('click', onDocumentClick); });
onBeforeUnmount(() => { document.removeEventListener('click', onDocumentClick); });

/** 带时间分隔线的消息列表，相邻消息间隔超过 5 分钟时自动插入时间标签 */
const messagesWithDividers = computed(() =>
  insertTimeDividers(props.messages, 'sendTime', {
    keyFn: (i, item) => item._divider ? `div-${i}` : `div-${item.recordId || item._id}`,
  })
);
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
  background: rgba(56, 239, 125, 0.22);
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  color: #333;
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
  border: 1.5px solid rgba(56, 239, 125, 0.45);
  background: rgba(56, 239, 125, 0.15);
  color: #11998e;
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
.load-more, .no-more-messages, .time-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  color: #bbb;
  font-size: 12px;
  user-select: none;
}
.time-divider span {
  position: relative;
}
.time-divider span::before,
.time-divider span::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 32px;
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
}
.time-divider span::before {
  right: calc(100% + 10px);
}
.time-divider span::after {
  left: calc(100% + 10px);
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

/* ==================== 已撤回消息气泡 ==================== */
.recalled-bubble {
  background: rgba(200, 200, 200, 0.25) !important;
  color: #999 !important;
  font-style: italic;
  font-size: 12px;
  border: 1px dashed rgba(0, 0, 0, 0.12) !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  padding: 8px 14px;
  user-select: none;
}
.recalled-bubble .message-time {
  color: #bbb !important;
}

/* ==================== 右键菜单 ==================== */
.recall-context-menu {
  position: fixed;
  min-width: 100px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  pointer-events: auto;
}
.recall-context-menu .dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  font-size: 13px;
  color: #e05353;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.recall-context-menu .dropdown-item:hover {
  background: rgba(224, 83, 83, 0.12);
}

/* Teleport Transition（unscoped 需放在此处，scoped 对 Teleport 内容有效） */
.contextmenu-enter-active,
.contextmenu-leave-active {
  transition: all 0.2s ease;
}
.contextmenu-enter-from {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}
.contextmenu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
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
