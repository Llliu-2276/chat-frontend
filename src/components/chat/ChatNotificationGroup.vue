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
        <!-- 成员变动 / 群解散 / 群主转让 通知 -->
        <!-- JOIN：群聊视角（发送者=群聊，头像=群名首字，内容=谁加入了） -->
        <!-- LEAVE（自己）：右侧气泡 -->
        <!-- LEAVE（他人）/ DISBANDED / OWNER_TRANSFERRED：左侧气泡，发送者=当事人 -->
        <div v-else-if="item._type === 'member-change'"
             class="message-row"
             :class="isSelfLeave(item) ? 'is-self' : 'is-other'">
          <!-- 头像 -->
          <div class="bubble-avatar avatar avatar-sm"
               :class="{ clickable: !isSelfLeave(item) && item.type !== 'GROUP_MEMBER_JOIN' }"
               :style="isSelfLeave(item)
                 ? { background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff' }
                 : item.type === 'GROUP_MEMBER_JOIN'
                   ? { background: '#c8e6c9', color: '#2e7d32' }
                   : { background: '#9df3c4', color: '#333' }"
               @click="!isSelfLeave(item) && item.type !== 'GROUP_MEMBER_JOIN' && viewGroupMemberProfile(item)"
               :title="item.type === 'GROUP_MEMBER_JOIN' ? '' : (isSelfLeave(item) ? '' : '查看 ' + item.senderName + ' 的资料')">
            {{ item.type === 'GROUP_MEMBER_JOIN' ? (item.groupName?.charAt(0) || '?') : (item.senderName?.charAt(0) || '?') }}
          </div>
          <div class="bubble-content">
            <span class="bubble-sender-name">
              <template v-if="item.type === 'GROUP_MEMBER_JOIN'">「{{ item.groupName }}」群通知</template>
              <template v-else-if="isSelfLeave(item)">你退出了群聊</template>
              <template v-else>{{ item.senderName }}</template>
            </span>
            <div class="bubble group-notif-bubble"
                 :class="isSelfLeave(item) ? 'self-bubble' : 'other-bubble'">
              <div>
                <template v-if="item.type === 'GROUP_DISBANDED' || item.type === 'GROUP_OWNER_TRANSFERRED'">
                  <span>{{ item.content || item.groupName }}</span>
                </template>
                <template v-else-if="item.type === 'GROUP_MEMBER_JOIN'">
                  <!-- JOIN：优先用 content（REST），降级用 senderName 构造（WS） -->
                  <span>{{ item.content || (item.senderName + ' 加入了群聊') }}</span>
                </template>
                <template v-else-if="isSelfLeave(item)">
                  <span>你退出了 </span>
                  <span class="group-notif-group-name">「{{ item.groupName }}」</span>
                </template>
                <template v-else>
                  <span>{{ item.senderName }}</span>
                  <span class="group-notif-action"> 退出了 </span>
                  <span class="group-notif-group-name">「{{ item.groupName }}」</span>
                </template>
              </div>
              <div class="bubble-footer">
                <span class="bubble-time">{{ formatGroupNotifTime(item.sendTime) }}</span>
                <span v-if="!item.isRead && !isSelfLeave(item) && item.type !== 'GROUP_MEMBER_JOIN'" class="unread-dot"></span>
              </div>
            </div>
          </div>
        </div>
        <!-- 加群申请 -->
        <div v-else-if="item._type === 'join-request'"
             class="message-row" :class="isSelfRequest(item) ? 'is-self' : 'is-other'">
          <div class="bubble-avatar avatar avatar-sm"
               :class="{ clickable: !isSelfRequest(item) }"
               :style="isSelfRequest(item)
                 ? { background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff' }
                 : { background: '#9df3c4', color: '#333' }"
               @click="!isSelfRequest(item) && emit('view-profile', { userId: item.senderId, userName: item.senderName })"
               :title="isSelfRequest(item) ? '' : '查看 ' + item.senderName + ' 的资料'">
            {{ item.senderName?.charAt(0) || '?' }}
          </div>
          <div class="bubble-content">
            <span class="bubble-sender-name">{{ isSelfRequest(item) ? '我申请加入' : item.senderName }}</span>
            <div class="bubble group-notif-bubble"
                 :class="isSelfRequest(item) ? 'self-bubble' : 'other-bubble'">
              <div>
                <span>申请加入 </span>
                <span class="group-notif-group-name">「{{ item.groupName }}」</span>
              </div>
              <div v-if="item.message" class="join-req-message">{{ item.message }}</div>
              <div class="bubble-footer">
                <span class="bubble-time">{{ formatGroupNotifTime(item.sendTime) }}</span>
                <span v-if="!item.isRead && !isSelfRequest(item)" class="unread-dot"></span>
                <span v-if="item.status === 0" class="req-status-tag pending">待处理</span>
                <span v-else-if="item.status === 1" class="req-status-tag accepted">已同意</span>
                <span v-else class="req-status-tag rejected">已拒绝</span>
              </div>
            </div>
            <div v-if="!isSelfRequest(item) && item.status === 0" class="bubble-actions">
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
  currentUserId: { type: Number, default: 0 },
});

const emit = defineEmits(['handle-join-request', 'view-profile']);

const formatGroupNotifTime = (t) => formatTime(t);

/**
 * 判断是否为当前用户自己发出的入群申请
 * _isSelf 由 addSelfJoinRequest 显式设置；REST 加载的数据通过 senderId 匹配
 * @param {Object} item
 * @returns {boolean}
 */
function isSelfRequest(item) {
  return item._isSelf || item.senderId === props.currentUserId;
}

/**
 * 判断是否为当前用户自己退出群聊的事件
 * 自己的退群通知显示在右侧，与入群申请的 self/other 模式一致
 * @param {Object} item
 * @returns {boolean}
 */
function isSelfLeave(item) {
  return item.type === 'GROUP_MEMBER_LEAVE' && item.senderId === props.currentUserId;
}

const allGroupItems = computed(() => {
  const items = [];
  for (const n of props.groupNotifications) {
    items.push({ ...n, _type: 'member-change', _key: n._key, _sortTime: n.sendTime });
  }
  for (const r of props.joinGroupRequests) {
    // 所有申请均展示：自己的（不限状态）+ 他人的（不限状态，含已处理）
    // 审批按钮通过 isSelfRequest + status===0 控制，已处理的不显示按钮
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
