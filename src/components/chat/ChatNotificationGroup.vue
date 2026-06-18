<!--
 * 群聊通知子面板
 * 合并成员变动事件 + 加群申请，以时间线气泡流展示
 * 成员变动 → 左侧系统消息气泡
 * 加群申请 → 他人发出左侧（带审批按钮），自己发出右侧（带状态标签）
 -->
<template>
  <div class="bubble-flow">
    <div v-if="allGroupItems.length === 0" class="list-empty">
      <el-icon :size="48" color="#ccc"><Bell /></el-icon>
      <p>暂无群聊通知</p>
    </div>
    <template v-else>
      <template v-for="item in allGroupItemsWithDividers" :key="item._divider ? item.key : item._key">
        <div v-if="item._divider" class="time-divider"><span>{{ item.label }}</span></div>
        <!-- 成员变动通知 -->
        <div v-else-if="item._type === 'member-change'" class="message-row is-other">
          <div class="bubble-avatar avatar avatar-sm clickable"
               :style="{ background: '#9df3c4', color: '#333' }"
               @click="viewGroupMemberProfile(item)"
               :title="'查看 ' + item.senderName + ' 的资料'">
            {{ item.senderName?.charAt(0) || '?' }}
          </div>
          <div class="bubble-content">
            <span class="bubble-sender-name">{{ item.senderName }}</span>
            <div class="bubble other-bubble group-notif-bubble">
              <div>
                <span class="group-notif-action">{{ item.type === 'GROUP_MEMBER_JOIN' ? '加入了' : '退出了' }}</span>
                <span class="group-notif-group-name">「{{ item.groupName }}」</span>
              </div>
              <div class="bubble-footer">
                <span class="bubble-time">{{ formatGroupNotifTime(item.sendTime) }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 加群申请 -->
        <div v-else-if="item._type === 'join-request'"
             class="message-row" :class="item._isSelf ? 'is-self' : 'is-other'">
          <div class="bubble-avatar avatar avatar-sm"
               :class="{ clickable: !item._isSelf }"
               :style="item._isSelf
                 ? { background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff' }
                 : { background: '#9df3c4', color: '#333' }"
               @click="!item._isSelf && emit('view-profile', { userId: item.senderId, userName: item.senderName })"
               :title="item._isSelf ? '' : '查看 ' + item.senderName + ' 的资料'">
            {{ item.senderName?.charAt(0) || '?' }}
          </div>
          <div class="bubble-content">
            <span class="bubble-sender-name">{{ item._isSelf ? '我申请加入' : item.senderName }}</span>
            <div class="bubble group-notif-bubble"
                 :class="item._isSelf ? 'self-bubble' : 'other-bubble'">
              <div>
                <span>申请加入 </span>
                <span class="group-notif-group-name">「{{ item.groupName }}」</span>
              </div>
              <div class="bubble-footer">
                <span class="bubble-time">{{ formatGroupNotifTime(item.sendTime) }}</span>
                <span v-if="item.status === 0" class="req-status-tag pending">待处理</span>
                <span v-else-if="item.status === 1" class="req-status-tag accepted">已同意</span>
                <span v-else class="req-status-tag rejected">已拒绝</span>
              </div>
            </div>
            <div v-if="!item._isSelf && item.status === 0" class="bubble-actions">
              <button class="btn-accept" style="padding:6px 16px;font-size:12px"
                      @click="emit('handle-join-request', item.groupId, item.requestId, true)">
                <el-icon><Select /></el-icon> 同意
              </button>
              <button class="btn-danger" style="padding:6px 16px;font-size:12px"
                      @click="emit('handle-join-request', item.groupId, item.requestId, false)">
                <el-icon><CloseBold /></el-icon> 拒绝
              </button>
            </div>
          </div>
        </div>
      </template>
      <div class="no-more">— 仅显示最近通知 —</div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Bell, Select, CloseBold } from '@element-plus/icons-vue';
import { formatTime, insertTimeDividers } from '@/utils/time';

defineOptions({ name: 'ChatNotificationGroup' });

const props = defineProps({
  groupNotifications: { type: Array, default: () => [] },
  joinGroupRequests: { type: Array, default: () => [] },
});

const emit = defineEmits(['handle-join-request', 'view-profile']);

const formatGroupNotifTime = (t) => formatTime(t);

const allGroupItems = computed(() => {
  const items = [];
  for (const n of props.groupNotifications) {
    items.push({ ...n, _type: 'member-change', _key: n._key, _sortTime: n.sendTime });
  }
  for (const r of props.joinGroupRequests) {
    items.push({ ...r, _type: 'join-request', _key: r._key, _sortTime: r.sendTime });
  }
  items.sort((a, b) => {
    const ta = a._sortTime ? new Date(a._sortTime).getTime() : 0;
    const tb = b._sortTime ? new Date(b._sortTime).getTime() : 0;
    return ta - tb;
  });
  return items;
});

const allGroupItemsWithDividers = computed(() =>
  insertTimeDividers(allGroupItems.value, '_sortTime', { keyFn: (i) => `gdiv-${i}` })
);

function viewGroupMemberProfile(item) {
  emit('view-profile', { userId: item.senderId, userName: item.senderName });
}
</script>
