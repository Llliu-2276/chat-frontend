/**
 * 聊天消息管理 Composable
 * 负责消息列表状态、发送、历史加载、滚动处理、
 * 时间格式化，以及消息相关的 WebSocket 事件处理
 *
 * @module composables/useChatMessages
 */
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { getChatHistory, sendMessage as sendMessageApi } from '@/api/friend';
import { getGroupHistory, sendGroupMessage } from '@/api/group';
import { wsManager } from '@/utils/websocket';

/**
 * 聊天消息管理
 * @param {import('vue').Ref} chatTarget - 当前聊天对象 ref
 * @param {import('vue').Ref<string>} chatType - 聊天类型 ref ('friend'|'group')
 * @param {import('vue').Ref<Array>} friends - 好友列表 ref（用于更新未读计数和最新消息）
 * @param {import('vue').Ref} messageAreaRef - 消息区域组件模板 ref
 * @param {Object} userStore - 用户 Store 实例
 * @param {Object} toast - Toast 通知对象
 */
export function useChatMessages(chatTarget, chatType, friends, messageAreaRef, userStore, toast) {
  // ==================== 状态 ====================
  const messages = ref([]);
  const loadingMessages = ref(false);
  const loadingMore = ref(false);
  const isSending = ref(false);
  const currentPage = ref(1);
  const hasMoreMessages = ref(true);

  // ==================== 工具函数 ====================
  /**
   * 格式化本地日期时间为 ISO 风格字符串
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的字符串 YYYY-MM-DDTHH:mm:ss
   */
  function formatLocalDateTime(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  /**
   * 格式化时间为 HH:mm
   * @param {string} t - 时间字符串
   * @returns {string}
   */
  function formatTime(t) {
    if (!t) return '';
    const normalized = t.replace('T', ' ');
    return normalized.length >= 16 ? normalized.slice(11, 16) : normalized;
  }

  /**
   * 更新好友列表中指定好友的最后一条消息
   * @param {number} friendId - 好友用户ID
   * @param {string} content - 消息内容
   * @param {string} sendTime - 发送时间
   */
  function updateFriendLastMessage(friendId, content, sendTime) {
    const friend = friends.value.find(f => f.userId === friendId);
    if (friend) {
      if (!friend.lastMessageTime || sendTime > friend.lastMessageTime) {
        friend.lastMessage = content;
        friend.lastMessageTime = sendTime;
      }
    }
  }

  // ==================== 核心操作 ====================
  /**
   * 重置聊天状态（切换聊天对象时调用）
   */
  function resetChat() {
    currentPage.value = 1;
    hasMoreMessages.value = true;
    messages.value = [];
  }

  /**
   * 加载聊天记录
   * @param {boolean} append - 是否追加模式（加载更多）
   */
  async function loadChatHistory(append = false) {
    if (!chatTarget.value) return;
    if (append) loadingMore.value = true;
    else loadingMessages.value = true;
    try {
      const isGroup = chatType.value === 'group';
      const res = isGroup
        ? await getGroupHistory(chatTarget.value.groupId, { page: currentPage.value, size: 20 })
        : await getChatHistory(chatTarget.value.userId, { page: currentPage.value, size: 20 });
      if (res.code === 200 && res.data) {
        const newMsgs = res.data.content || [];
        hasMoreMessages.value = currentPage.value < res.data.totalPages;
        if (append) {
          const oldH = messageAreaRef.value?.messageListRef?.scrollHeight || 0;
          messages.value = [...newMsgs.reverse(), ...messages.value];
          await nextTick();
          const ml = messageAreaRef.value?.messageListRef;
          if (ml) ml.scrollTop = ml.scrollHeight - oldH;
        } else {
          messages.value = newMsgs.reverse();
          await nextTick();
          messageAreaRef.value?.scrollToBottom();
        }
      } else {
        toast.error(res.message || '加载聊天记录失败，请重试');
      }
    } catch (e) {
      console.error('加载聊天记录失败:', e);
      toast.error('网络异常，加载聊天记录失败');
    }
    finally { loadingMessages.value = false; loadingMore.value = false; }
  }

  /**
   * 发送消息
   * 优先通过 WebSocket 发送，降级到 HTTP API
   * @param {string} content - 消息内容
   */
  async function onSendMessage(content) {
    if (!chatTarget.value || !content.trim()) return;
    isSending.value = true;
    const trimmed = content.trim();
    const isGroup = chatType.value === 'group';

    const tempMsg = {
      _id: Date.now(),
      senderId: userStore.userId,
      senderName: userStore.userName,
      content: trimmed,
      sendTime: formatLocalDateTime(new Date()),
      readStatus: false,
      ...(isGroup
        ? { groupId: chatTarget.value.groupId }
        : { receiverId: chatTarget.value.userId, receiverName: chatTarget.value.userName }
      ),
    };

    messages.value.push(tempMsg);
    if (!isGroup) {
      updateFriendLastMessage(chatTarget.value.userId, trimmed, tempMsg.sendTime);
    }
    await nextTick();
    messageAreaRef.value?.scrollToBottom();

    try {
      let sent;
      if (isGroup) {
        sent = wsManager.send({
          type: 'GROUP_MESSAGE',
          groupId: chatTarget.value.groupId,
          content: trimmed,
        });
      } else {
        sent = wsManager.send({
          type: 'PRIVATE_MESSAGE',
          receiverId: chatTarget.value.userId,
          content: trimmed,
        });
      }

      if (!sent) {
        if (isGroup) {
          await sendGroupMessage({ groupId: chatTarget.value.groupId, content: trimmed });
        } else {
          await sendMessageApi({ receiverId: chatTarget.value.userId, content: trimmed });
        }
      }

      // 发送成功：清空输入框
      messageAreaRef.value?.resetInput();
    } catch (e) {
      toast.error('消息发送失败，请重试');
      messages.value = messages.value.filter(m => m._id !== tempMsg._id);
    } finally {
      isSending.value = false;
    }
  }

  /**
   * 处理滚动到顶部（加载更多消息）
   */
  async function handleScroll() {
    const ml = messageAreaRef.value?.messageListRef;
    if (!ml || loadingMore.value || !hasMoreMessages.value) return;
    if (ml.scrollTop === 0) {
      currentPage.value++;
      await loadChatHistory(true);
    }
  }

  // ==================== WebSocket 事件处理 ====================
  /**
   * 处理 WebSocket 收到的私聊消息
   * - 自己发送的消息回传 → 替换临时消息
   * - 对方发来的消息 → 追加到列表，更新未读计数
   */
  function handleWsPrivateMessage(msg) {
    const { senderId, senderName, receiverId, content, sendTime, recordId } = msg;

    // 自己发送的消息回传 → 替换临时消息
    if (senderId === userStore.userId) {
      const idx = messages.value.findIndex(m => m._id && m.senderId === senderId && !m.recordId);
      if (idx !== -1) {
        messages.value[idx] = {
          ...messages.value[idx],
          recordId,
          sendTime: sendTime || messages.value[idx].sendTime,
          readStatus: true,
        };
        return;
      }
    }

    const isCurrentChat = chatTarget.value?.userId === senderId && chatType.value === 'friend';
    const newMsg = {
      recordId,
      senderId,
      senderName,
      receiverId,
      content,
      sendTime: sendTime || formatLocalDateTime(new Date()),
      readStatus: false,
    };

    messages.value.push(newMsg);
    updateFriendLastMessage(senderId, content, newMsg.sendTime);

    if (isCurrentChat) {
      const f = friends.value.find(x => x.userId === senderId);
      if (f) f.unreadCount = 0;
      wsManager.send({ type: 'READ_RECEIPT', recordId });
      nextTick(() => messageAreaRef.value?.scrollToBottom());
    } else {
      const f = friends.value.find(x => x.userId === senderId);
      if (f) f.unreadCount = (f.unreadCount || 0) + 1;
    }
  }

  /**
   * 处理已读回执
   */
  function handleWsReadReceipt(msg) {
    const message = messages.value.find(m => m.recordId === msg.recordId);
    if (message) message.readStatus = true;
  }

  /**
   * 处理 WebSocket 群聊消息
   * - 自己发送的回传 → 替换临时消息
   * - 他人发来的消息 → 追加到列表
   */
  function handleWsGroupMessage(msg) {
    const { senderId, senderName, groupId, content, sendTime, recordId } = msg;

    // 自己发送的回传 → 替换临时消息
    if (senderId === userStore.userId) {
      const idx = messages.value.findIndex(m => m._id && m.senderId === senderId && !m.recordId);
      if (idx !== -1) {
        messages.value[idx] = {
          ...messages.value[idx],
          recordId,
          groupId,
          sendTime: sendTime || messages.value[idx].sendTime,
        };
        return;
      }
    }

    const isCurrentChat = chatTarget.value?.groupId === groupId && chatType.value === 'group';
    const newMsg = {
      recordId,
      senderId,
      senderName,
      groupId,
      content,
      sendTime: sendTime || formatLocalDateTime(new Date()),
    };

    messages.value.push(newMsg);

    if (isCurrentChat) {
      nextTick(() => messageAreaRef.value?.scrollToBottom());
    }
  }

  // ==================== WebSocket 生命周期 ====================
  onMounted(() => {
    wsManager.on('PRIVATE_MESSAGE', handleWsPrivateMessage);
    wsManager.on('READ_RECEIPT', handleWsReadReceipt);
    wsManager.on('GROUP_MESSAGE', handleWsGroupMessage);
  });

  onBeforeUnmount(() => {
    wsManager.off('PRIVATE_MESSAGE', handleWsPrivateMessage);
    wsManager.off('READ_RECEIPT', handleWsReadReceipt);
    wsManager.off('GROUP_MESSAGE', handleWsGroupMessage);
  });

  return {
    // 状态
    messages,
    loadingMessages,
    loadingMore,
    isSending,
    hasMoreMessages,
    // 操作
    resetChat,
    loadChatHistory,
    onSendMessage,
    handleScroll,
    // 工具函数
    formatLocalDateTime,
    formatTime,
  };
}
