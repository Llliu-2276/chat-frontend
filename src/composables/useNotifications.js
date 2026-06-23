/**
 * 通知管理 Composable
 * 负责好友申请通知的加载、处理、以及 WebSocket 实时通知
 *
 * @module composables/useNotifications
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  handleFriendRequest,
  getReceivedRequests,
  getSentRequests,
} from '@/api/friend';
import { handleJoinRequest, getJoinRequests, handleGroupInvite, getReceivedInvites } from '@/api/group';
import { wsManager } from '@/utils/websocket';
import { getLastReadAt, updateLastReadAt, computeIsRead } from '@/utils/notificationReadState';
import { loadInteractedGroups, addInteractedGroup, mergeInteractedGroups } from '@/utils/interactedGroups';

/**
 * 通知管理
 * @param {Object} options - 依赖注入
 * @param {Function} options.loadFriends - 刷新好友列表的回调（来自 useFriendList）
 * @param {Function} options.loadGroups - 刷新群列表的回调（来自 useFriendList）
 * @param {import('vue').Ref<Array>} options.groups - 群列表 ref
 * @param {import('vue').Ref<string>} options.activeView - 当前视图状态 ref
 * @param {import('vue').Ref} options.chatTarget - 当前聊天对象 ref
 * @param {import('vue').Ref<string>} options.mobileView - 移动端视图状态 ref
 * @param {number} options.userId - 当前用户 ID（用于检测自己是否被批准入群）
 * @param {Object} options.toast - Toast 通知对象
 */
export function useNotifications({ loadFriends, loadGroups, groups, activeView, chatTarget, mobileView, userId, toast }) {
  // ==================== 通知状态 ====================
  const receivedRequests = ref([]);
  const sentRequests = ref([]);
  const loadingReceived = ref(false);
  const loadingSent = ref(false);
  const loadingMoreReceived = ref(false);
  const loadingMoreSent = ref(false);
  const receivedPage = ref(1);
  const sentPage = ref(1);
  const hasMoreReceived = ref(true);
  const hasMoreSent = ref(true);
  const pendingRequestCount = ref(0);

  // 群聊加群申请（群主视角）
  const joinGroupRequests = ref([]);

  // 群聊入群邀请（被邀请者视角）
  const groupInvites = ref([]);

  /** 通知已读判断委托给 notificationReadState.computeIsRead */

  // ==================== 通知操作 ====================
  /**
   * 打开通知面板
   * 重置分页并重新加载申请列表
   */
  function openNotifications() {
    activeView.value = 'notifications';
    chatTarget.value = null;
    mobileView.value = 'chat';
    // 每次打开都重新拉取数据，确保显示最新申请
    receivedPage.value = 1;
    sentPage.value = 1;
    loadReceivedRequests();
    loadSentRequests();
  }

  /**
   * 加载收到的好友申请
   * @param {boolean} append - 是否追加模式（加载更多）
   */
  async function loadReceivedRequests(append = false) {
    if (append) loadingMoreReceived.value = true;
    else loadingReceived.value = true;
    try {
      const res = await getReceivedRequests({ page: receivedPage.value, size: 20 });
      if (res.code === 200 && res.data) {
        const content = res.data.content || [];
        hasMoreReceived.value = receivedPage.value < res.data.totalPages;
        if (append) {
          receivedRequests.value = [...receivedRequests.value, ...content];
        } else {
          receivedRequests.value = content;
        }
      }
      // 单独拉取待处理计数（始终只统计 status=0）
      loadPendingCount();
    } catch (e) {
      console.error('加载收到的申请失败:', e);
      // 发生错误时清空列表，避免显示旧的过期数据
      if (!append) {
        receivedRequests.value = [];
      }
      toast.error('加载申请列表失败，请稍后重试');
    }
    finally { loadingReceived.value = false; loadingMoreReceived.value = false; }
  }

  /**
   * 加载发出的好友申请
   * @param {boolean} append - 是否追加模式（加载更多）
   */
  async function loadSentRequests(append = false) {
    if (append) loadingMoreSent.value = true;
    else loadingSent.value = true;
    try {
      const res = await getSentRequests({ page: sentPage.value, size: 20 });
      if (res.code === 200 && res.data) {
        const content = res.data.content || [];
        hasMoreSent.value = sentPage.value < res.data.totalPages;
        if (append) {
          sentRequests.value = [...sentRequests.value, ...content];
        } else {
          sentRequests.value = content;
        }
      }
    } catch (e) {
      console.error('加载发出的申请失败:', e);
      // 发生错误时清空列表，避免显示旧的过期数据
      if (!append) {
        sentRequests.value = [];
      }
      toast.error('加载申请列表失败，请稍后重试');
    }
    finally { loadingSent.value = false; loadingMoreSent.value = false; }
  }

  /** 加载更多收到的申请 */
  function loadMoreReceived() {
    receivedPage.value++;
    loadReceivedRequests(true);
  }

  /** 加载更多发出的申请 */
  function loadMoreSent() {
    sentPage.value++;
    loadSentRequests(true);
  }

  /**
   * 处理好友申请（同意/拒绝）
   * @param {number} requestId - 申请ID
   * @param {boolean} accept - 是否同意
   */
  async function onHandleRequest(requestId, accept) {
    try {
      const res = await handleFriendRequest({ requestId, accept });
      if (res.code === 200 || res.code === 201) {
        toast.success(accept ? '已同意好友申请' : '已拒绝好友申请');
        // 刷新列表
        receivedPage.value = 1;
        loadReceivedRequests();
        // 如果同意了申请，刷新好友列表（已弹 toast，静默刷新）
        if (accept) loadFriends({ silent: true });
      }
    } catch (e) {
      toast.error('处理申请失败，请重试');
      console.error('处理好友申请失败:', e);
    }
  }

  /** 加载待处理申请计数（静默） */
  async function loadPendingCount() {
    try {
      const res = await getReceivedRequests({ status: 0, page: 1, size: 1 });
      if (res.code === 200 && res.data) {
        pendingRequestCount.value = res.data.totalElements || 0;
      }
    } catch (e) {
      console.error('加载待处理申请计数失败:', e);
      // 静默失败，不影响主流程
    }
  }

  /**
   * 从后端 REST 加载入群申请历史（群主视角）
   * 遍历当前用户拥有的群，拉取每群的待处理入群申请，合并到 joinGroupRequests
   * 已存在于列表中的申请（通过 requestId 去重）不会重复添加
   */
  async function loadJoinRequestsHistory() {
    // 先同步当前群列表到 localStorage，确保持久化数据是最新的
    mergeInteractedGroups(groups.value || []);
    // 合并 groups 列表 + 交互过的群（用户申请过但尚未成为成员的群）
    const interacted = loadInteractedGroups();
    const groupMap = new Map();
    for (const g of (groups.value || [])) {
      groupMap.set(g.groupId, g.groupName);
    }
    for (const ig of interacted) {
      if (!groupMap.has(ig.groupId)) {
        groupMap.set(ig.groupId, ig.groupName);
      }
    }
    const targetGroups = Array.from(groupMap, ([groupId, groupName]) => ({ groupId, groupName }));
    if (targetGroups.length === 0) {
      console.log('[通知] 没有可查询的群，跳过入群申请历史加载');
      return;
    }
    console.log('[通知] 为', targetGroups.length, '个群加载入群申请历史（含交互群），groups:', groups.value?.length, 'interacted:', interacted.length);
    for (const g of targetGroups) {
      try {
        const res = await getJoinRequests(g.groupId);
        if (res.code === 200 && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.content || []);
          for (const req of list) {
            const reqId = req.requestId || req.id;
            // 去重：已存在于 joinGroupRequests 中则更新 message（WS 可能不含留言）
            const existIdx = joinGroupRequests.value.findIndex(r => r.requestId === reqId);
            if (existIdx !== -1) {
              const restMessage = req.message || req.content || '';
              if (restMessage && !joinGroupRequests.value[existIdx].message) {
                joinGroupRequests.value[existIdx] = {
                  ...joinGroupRequests.value[existIdx],
                  message: restMessage,
                };
                console.log('[通知] 补充入群申请留言 requestId=', reqId, 'message=', restMessage.slice(0, 30));
              }
              continue;
            }
            // 替换自己发出的临时条目（requestId 为 0 的占位，与 REST 数据 groupId 相同且 senderName === '我'）
            const selfIdx = joinGroupRequests.value.findIndex(r =>
              r._isSelf && r.requestId === 0 && r.groupId === g.groupId
            );
            const entry = {
              _key: `join-req-${reqId}`,
              requestId: reqId,
              groupId: g.groupId,
              groupName: g.groupName,
              senderId: req.senderId || req.applicantId || 0,
              senderName: req.senderName || req.applicantName || '',
              sendTime: req.createTime || req.sendTime || new Date().toISOString(),
              status: req.status,
              isRead: computeIsRead(req.createTime || req.sendTime || new Date().toISOString(), activeView.value === 'notifications-group'),
              message: req.message || req.content || '',  // 入群留言
            };
            if (selfIdx !== -1) {
              // 用 REST 真实数据替换临时占位条目（保留 _isSelf 标记）
              entry._isSelf = true;
              entry._key = joinGroupRequests.value[selfIdx]._key;  // 保留旧 key 避免 DOM 闪烁
              joinGroupRequests.value.splice(selfIdx, 1, entry);
              console.log('[通知] 替换自己发出的入群申请占位为真实数据 requestId=', reqId);
            } else {
              joinGroupRequests.value.push(entry);
            }
          }
          console.log('[通知] 群「' + g.groupName + '」入群申请加载完成（共', list.length, '条）');
        } else if (res.code !== 200) {
          console.warn('[通知] 群「' + g.groupName + '」入群申请查询返回 code:', res.code, res.message);
        }
      } catch (e) {
        console.error('[通知] 加载群「' + g.groupName + '」入群申请失败:', e?.message || e);
      }
    }
  }

  /**
   * 从后端 REST 加载收到的入群邀请历史（被邀请者视角）
   * GET /api/group/invites/received 返回当前用户收到的所有邀请
   * 按 inviteId 去重合并到 groupInvites，仅加载状态为 0（待处理）的邀请
   */
  async function loadGroupInvitesHistory() {
    try {
      const res = await getReceivedInvites({ page: 1, size: 50 });
      if (res.code === 200 && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.content || []);
        let added = 0;
        for (const item of list) {
          // 仅加载待处理的邀请
          if (item.status !== 0) continue;
          const inviteId = item.inviteId || item.id;
          if (!inviteId) continue;
          // 去重
          if (groupInvites.value.some(i => i.inviteId === inviteId)) continue;
          groupInvites.value.push({
            _key: `grp-invite-${inviteId}`,
            _type: 'group-invite',
            inviteId,
            groupId: item.groupId,
            groupName: item.groupName || `群聊${item.groupId}`,
            senderId: item.inviterId || 0,
            senderName: item.inviterName || '',
            message: item.message || '',
            sendTime: item.createTime || new Date().toISOString(),
            isRead: computeIsRead(item.createTime || new Date().toISOString(), activeView.value === 'notifications-group'),
          });
          added++;
        }
        if (added > 0) console.log('[通知] 加载到', added, '条待处理入群邀请');
      }
    } catch (e) {
      console.error('[通知] 加载入群邀请历史失败:', e?.message || e);
    }
  }

  /** 标记所有入群邀请为已读 */
  function markAllGroupInvitesAsRead() {
    groupInvites.value.forEach(i => { i.isRead = true; });
  }

  // ==================== WebSocket 事件处理 ====================
  /**
   * 处理 WebSocket 好友申请通知
   * @param {import('@/types/index.js').WsFriendRequestNotification} msg
   */
  function handleWsFriendRequest(msg) {
    // 去重：检查是否已经存在于列表中
    const exists = receivedRequests.value.some(r =>
      r.senderId === msg.senderId && r.status === 0
    );

    if (!exists) {
      pendingRequestCount.value++;
      toast.info(`${msg.senderName} 请求加你为好友`);
      // 始终预加载最新申请列表，确保用户打开通知面板时立即显示新申请
      receivedPage.value = 1;
      loadReceivedRequests();
    }
  }

  /**
   * 处理 WebSocket 好友申请结果通知
   * @param {import('@/types/index.js').WsFriendRequestResult} msg
   */
  function handleWsFriendRequestResult(msg) {
    const action = msg.content === 'accepted' ? '同意了' : '拒绝了';
    toast.info(`${msg.senderName} ${action}你的好友申请`);
    // 对方同意后，刷新好友列表（已弹 toast，静默刷新）
    if (msg.content === 'accepted') loadFriends({ silent: true });
    // 如果当前在通知面板，刷新发出的申请列表
    if (activeView.value === 'notifications') {
      sentPage.value = 1;
      loadSentRequests();
    }
  }

  /**
   * 处理 WebSocket 加群申请通知（群主收到 — 后端 v2.1）
   * WS 消息格式: { type: 'JOIN_GROUP_REQUEST', groupId, senderId, senderName, content, requestId, sendTime }
   * 注意：WS 消息不包含 groupName，需从 groups 列表中查找
   */
  function handleWsJoinGroupRequest(msg) {
    console.log('[通知] 收到 WS JOIN_GROUP_REQUEST:', JSON.stringify(msg));
    const { groupId, senderId, senderName, requestId, sendTime, content } = msg;

    // 去重
    const exists = joinGroupRequests.value.some(r => r.requestId === requestId);
    if (exists) {
      console.log('[通知] JOIN_GROUP_REQUEST 重复，跳过 requestId=', requestId);
      return;
    }

    // 从 groups 列表中查找群名，降级使用 content 字段（content 格式为"申请加入群聊 XXX"）
    const group = groups.value?.find(g => g.groupId === groupId);
    const groupName = group?.groupName || (content || '').replace('申请加入群聊 ', '') || `群聊${groupId}`;

    // WS content 字段是"申请加入群聊 XXX"格式的系统文本，不是用户的入群留言
    // 用户的真实留言可能在 message/requestMessage 字段中，也可能 WS 不传（需等 REST 加载补充）
    const realMessage = msg.message || msg.requestMessage || '';

    // 存到加群申请列表（最新在上方）
    joinGroupRequests.value.unshift({
      _key: `join-req-${requestId}`,
      requestId,
      groupId,
      groupName,
      senderId,
      senderName,
      sendTime: sendTime || new Date().toISOString(),
      status: 0, // 0=待处理
      isRead: computeIsRead(sendTime || new Date().toISOString(), activeView.value === 'notifications-group'),
      message: realMessage,  // 用户入群留言（WS 可能不传，后续 REST 加载会补充）
    });

    // 最多保留 50 条
    if (joinGroupRequests.value.length > 50) {
      joinGroupRequests.value = joinGroupRequests.value.slice(0, 50);
    }

    toast.info(`${senderName} 申请加入「${groupName}」`);
  }

  /**
   * 添加自己发出的加群申请（发送成功后调用，显示在群聊通知中）
   * @param {Object} data - { groupId, groupName, requestId }
   */
  function addSelfJoinRequest(data) {
    console.log('[通知] addSelfJoinRequest 添加自己发出的入群申请:', JSON.stringify(data));
    // 持久化群 ID，确保后续刷新页面仍能查询该群的入群申请历史
    addInteractedGroup(data.groupId, data.groupName);
    const reqId = data.requestId || 0;
    joinGroupRequests.value.unshift({
      _key: reqId ? `self-join-${reqId}` : `self-join-${Date.now()}`,
      requestId: reqId,
      groupId: data.groupId,
      groupName: data.groupName,
      senderId: 0,       // 自己发的，不显示头像跳转
      senderName: '我',
      sendTime: new Date().toISOString(),
      status: 0,         // 待处理
      _isSelf: true,     // 标记为自己发出的
      isRead: true,      // 自己发起的申请始终已读
      message: data.message || '',  // 入群留言
    });
  }

  /**
   * 处理加群申请（群主同意/拒绝）
   * @param {number} groupId - 群组ID
   * @param {number} requestId - 申请ID
   * @param {boolean} accept - 是否同意
   */
  async function handleJoinRequestAction(groupId, requestId, accept) {
    try {
      const res = await handleJoinRequest(groupId, { requestId, accept });
      if (res.code === 200 || res.code === 201) {
        const idx = joinGroupRequests.value.findIndex(r => r.requestId === requestId);
        if (idx !== -1) {
          // 替换数组元素触发 Vue 响应式更新（直接修改属性不会触发 computed 重算）
          const updated = { ...joinGroupRequests.value[idx], status: accept ? 1 : 2 };
          joinGroupRequests.value.splice(idx, 1, updated);
        }
        toast.success(accept ? '已同意入群申请' : '已拒绝入群申请');
        // 刷新群聊列表（已弹 toast，静默刷新）
        loadGroups({ silent: true });
      }
    } catch (error) {
      toast.error(error.message || '操作失败，请重试');
    }
  }

  /**
   * 处理 WebSocket 入群申请结果通知（后端 v2.1+）
   * 群主审批后推送给申请人，content 为 "accepted" 或 "rejected"
   * @param {Object} msg - { type, senderId, senderName, groupId, groupName, content, requestId, sendTime }
   */
  function handleWsJoinGroupRequestResult(msg) {
    console.log('[通知] 收到 WS JOIN_GROUP_REQUEST_RESULT:', JSON.stringify(msg));
    const { groupId, groupName: wsGroupName, content, requestId } = msg;
    const accepted = content === 'accepted';

    // 查找匹配的自己发出的入群申请，更新状态
    let found = false;
    for (const r of joinGroupRequests.value) {
      const matchByRequestId = requestId && r.requestId === requestId;
      const matchByGroup = !requestId && (r._isSelf || r.senderId === userId) && r.groupId === groupId && r.status === 0;
      if (matchByRequestId || matchByGroup) {
        r.status = accepted ? 1 : 2;
        r.isRead = false;  // 标记为未读让用户注意到结果
        found = true;
      }
    }

    const groupName = wsGroupName || groups.value?.find(g => g.groupId === groupId)?.groupName || `群聊${groupId}`;
    if (found) {
      toast.success(accepted ? `你已成功加入「${groupName}」` : `你加入「${groupName}」的申请已被拒绝`);
    } else {
      // REST 历史可能还没加载，先显示 toast
      toast.info(accepted ? `你已成功加入「${groupName}」` : `你加入「${groupName}」的申请已被拒绝`);
    }
    // 通过则刷新群列表
    if (accepted && loadGroups) loadGroups({ silent: true });
  }

  /**
   * 处理 WebSocket 群成员加入通知
   * 作为 JOIN_GROUP_REQUEST_RESULT 的兜底：当检测到当前用户被批准入群时，
   * 自动更新自己发出的入群申请状态为「已同意」
   * @param {Object} msg - { type, groupId, senderId, senderName, sendTime }
   */
  function handleWsGroupMemberJoin(msg) {
    const { groupId, senderId } = msg;
    // 如果不是自己加入，忽略（JOIN_GROUP_REQUEST_RESULT 已处理则此处跳过）
    if (senderId !== userId) return;
    console.log('[通知] 检测到自己被批准加入群聊 groupId=', groupId);
    // 查找该群自己发出的待处理申请，更新为已同意
    let found = false;
    for (const r of joinGroupRequests.value) {
      if ((r._isSelf || r.senderId === userId) && r.groupId === groupId && r.status === 0) {
        r.status = 1;
        r.isRead = false;  // 标记为未读让用户注意到结果
        found = true;
      }
    }
    if (found) {
      const groupName = msg.groupName || groups.value?.find(g => g.groupId === groupId)?.groupName || `群聊${groupId}`;
      toast.success(`你已成功加入「${groupName}」`);
      // 刷新群列表以显示新加入的群
      if (loadGroups) loadGroups({ silent: true });
    }
  }

  /**
   * 处理入群邀请通知（被邀请者视角）
   * WS 消息格式: { type: 'GROUP_INVITE', senderId, senderName, groupId, groupName, requestId, requestMessage, sendTime }
   */
  function handleWsGroupInvite(msg) {
    console.log('[通知] 收到 WS GROUP_INVITE:', JSON.stringify(msg));
    const { senderId, senderName, groupId, groupName, sendTime } = msg;
    const resolvedGroupName = groupName || `群聊${groupId}`;
    // 后端 WS 使用 requestId（REST 使用 inviteId），requestMessage 为邀请附言
    const inviteId = msg.requestId;
    const message = msg.requestMessage || msg.message || '';
    if (!inviteId) {
      console.warn('[通知] GROUP_INVITE 缺少 requestId，无法存储到通知列表，原始消息:', JSON.stringify(msg));
      toast.info(`${senderName} 邀请你加入「${resolvedGroupName}」（请刷新后查看通知面板操作）`);
      return;
    }
    // 去重
    if (groupInvites.value.some(i => i.inviteId === inviteId)) return;
    groupInvites.value.unshift({
      _key: `grp-invite-${inviteId}`,
      _type: 'group-invite',
      inviteId,
      groupId,
      groupName: resolvedGroupName,
      senderId,
      senderName,
      message,
      sendTime: sendTime || new Date().toISOString(),
      isRead: computeIsRead(sendTime || new Date().toISOString(), activeView.value === 'notifications-group'),
    });
    if (groupInvites.value.length > 50) {
      groupInvites.value = groupInvites.value.slice(0, 50);
    }
    toast.info(`${senderName} 邀请你加入「${resolvedGroupName}」`);
  }

  /** 处理入群邀请（接受/拒绝） */
  async function onHandleGroupInvite(inviteId, groupId, accept) {
    if (!inviteId || !groupId) {
      toast.error('邀请信息不完整，请刷新后重试');
      return;
    }
    try {
      const res = await handleGroupInvite(groupId, inviteId, accept);
      if (res.code === 200) {
        const item = groupInvites.value.find(i => i.inviteId === inviteId);
        const groupName = item?.groupName || `群聊${groupId}`;
        if (accept) {
          toast.success(`已加入「${groupName}」`);
          if (loadGroups) loadGroups({ silent: true });
        } else {
          toast.info(`已拒绝加入「${groupName}」`);
        }
        // 移除已处理的邀请
        groupInvites.value = groupInvites.value.filter(i => i.inviteId !== inviteId);
      }
    } catch (e) {
      toast.error(e?.message || '操作失败，请重试');
    }
  }

  /**
   * 处理入群邀请结果通知（邀请者视角）
   * WS 消息: { type: 'GROUP_INVITE_RESULT', senderId被邀请人, senderName被邀请人, groupId, groupName, content="accepted"/"rejected", requestId, sendTime }
   */
  function handleWsGroupInviteResult(msg) {
    console.log('[通知] 收到 WS GROUP_INVITE_RESULT:', JSON.stringify(msg));
    const { senderName, groupName, content, requestId } = msg;
    const group = groupName || `群聊${msg.groupId}`;
    const isAccepted = content === 'accepted';
    if (isAccepted) {
      toast.success(`「${senderName || '对方'}」已接受你的入群邀请，加入「${group}」`);
      if (loadGroups) loadGroups({ silent: true });
    } else {
      toast.info(`「${senderName || '对方'}」拒绝了你的入群邀请（「${group}」）`);
    }
    // 防御性清理：如果邀请者侧也存了该邀请记录，移除之
    const idx = groupInvites.value.findIndex(i => i.inviteId === requestId);
    if (idx !== -1) groupInvites.value.splice(idx, 1);
  }

  // 包装函数（确保 cleanup 时能正确移除最新闭包）
  const _wsGroupInvite = (msg) => handleWsGroupInvite(msg);
  const _wsGroupInviteResult = (msg) => handleWsGroupInviteResult(msg);
  const _wsGroupMemberJoin = (msg) => handleWsGroupMemberJoin(msg);
  const _wsJoinGroupRequestResult = (msg) => handleWsJoinGroupRequestResult(msg);

  // ==================== WebSocket 生命周期 ====================
  // 使用包装函数确保每次事件触发时都调用最新的函数引用
  const _wsFriendRequest = (msg) => handleWsFriendRequest(msg);
  const _wsFriendRequestResult = (msg) => handleWsFriendRequestResult(msg);
  const _wsJoinGroupRequest = (msg) => handleWsJoinGroupRequest(msg);

  onMounted(() => {
    loadPendingCount();
    wsManager.on('FRIEND_REQUEST', _wsFriendRequest);
    wsManager.on('FRIEND_REQUEST_RESULT', _wsFriendRequestResult);
    wsManager.on('JOIN_GROUP_REQUEST', _wsJoinGroupRequest);
    wsManager.on('JOIN_GROUP_REQUEST_RESULT', _wsJoinGroupRequestResult);
    wsManager.on('GROUP_MEMBER_JOIN', _wsGroupMemberJoin);
    wsManager.on('GROUP_INVITE', _wsGroupInvite);
    wsManager.on('GROUP_INVITE_RESULT', _wsGroupInviteResult);
  });

  onBeforeUnmount(() => {
    wsManager.off('FRIEND_REQUEST', _wsFriendRequest);
    wsManager.off('FRIEND_REQUEST_RESULT', _wsFriendRequestResult);
    wsManager.off('JOIN_GROUP_REQUEST', _wsJoinGroupRequest);
    wsManager.off('JOIN_GROUP_REQUEST_RESULT', _wsJoinGroupRequestResult);
    wsManager.off('GROUP_MEMBER_JOIN', _wsGroupMemberJoin);
    wsManager.off('GROUP_INVITE', _wsGroupInvite);
    wsManager.off('GROUP_INVITE_RESULT', _wsGroupInviteResult);
  });

  /** 标记所有入群申请为已读 */
  function markAllJoinRequestsAsRead() {
    joinGroupRequests.value.forEach(r => { r.isRead = true; });
  }

  return {
    // 通知状态
    receivedRequests,
    sentRequests,
    loadingReceived,
    loadingSent,
    loadingMoreReceived,
    loadingMoreSent,
    hasMoreReceived,
    hasMoreSent,
    pendingRequestCount,
    joinGroupRequests,
    groupInvites,
    // 通知操作
    openNotifications,
    loadReceivedRequests,
    loadSentRequests,
    loadMoreReceived,
    loadMoreSent,
    onHandleRequest,
    handleJoinRequestAction,
    addSelfJoinRequest,
    loadPendingCount,
    loadJoinRequestsHistory,
    markAllJoinRequestsAsRead,
    loadGroupInvitesHistory,
    markAllGroupInvitesAsRead,
    onHandleGroupInvite,
    // 清理（供 Chat.vue 的 onBeforeUnmount 调用）
    _cleanupNotifications() {
      wsManager.off('FRIEND_REQUEST', _wsFriendRequest);
      wsManager.off('FRIEND_REQUEST_RESULT', _wsFriendRequestResult);
      wsManager.off('JOIN_GROUP_REQUEST', _wsJoinGroupRequest);
      wsManager.off('JOIN_GROUP_REQUEST_RESULT', _wsJoinGroupRequestResult);
      wsManager.off('GROUP_MEMBER_JOIN', _wsGroupMemberJoin);
      wsManager.off('GROUP_INVITE', _wsGroupInvite);
      wsManager.off('GROUP_INVITE_RESULT', _wsGroupInviteResult);
    },
  };
}
