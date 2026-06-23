# 组件说明文档

> 项目所有 Vue 组件的职责、Props、Events、使用方式说明。

---

## 一、组件总览

```
src/
├── App.vue                           # 根组件（全局 Loading + Toast 注入）
├── views/                            # 页面级组件
│   ├── Login.vue                     # 登录/注册页
│   └── Chat.vue                      # 聊天主页（容器组件）
├── components/
│   ├── chat/                         # 聊天子组件
│   │   ├── ChatLeftPanel.vue         # 左侧面板
│   │   ├── ChatMessageArea.vue       # 消息区域
│   │   ├── ChatNotificationPanel.vue # 通知面板（调度器）
│   │   ├── ChatNotificationFriend.vue# 好友通知气泡流
│   │   ├── ChatNotificationGroup.vue # 群聊通知气泡流
│   │   ├── ChatSidePanel.vue         # 右侧面板（容器）
│   │   ├── ChatProfileCard.vue       # 个人/群聊资料卡片（调度器）
│   │   ├── ProfileSelf.vue           # 本人资料
│   │   ├── ProfileFriend.vue         # 好友资料
│   │   ├── ProfileStranger.vue       # 陌生人资料
│   │   ├── ProfileGroup.vue          # 群聊资料（含成员列表）
│   │   └── index.js                  # 统一导出
│   └── common/
│       └── GlobalLoading.vue         # 全局加载遮罩
```

---

## 二、页面组件

### App.vue（根组件）

**职责**：提供路由视图入口，通过 `provide/inject` 向所有子组件注入全局方法。

| 提供 | 方法 | 说明 |
|------|------|------|
| `loading` | `show(text)` / `hide()` | 全屏加载遮罩 |
| `toast` | `success/error/warning/info(msg)` | Element Plus 消息提示 |

**使用方式**（在任意子组件中）：
```js
const toast = inject('toast');
toast.success('操作成功');

const loading = inject('loading');
loading.show('加载中...');
loading.hide();
```

---

### Login.vue（登录/注册页）

**职责**：一体化登录注册页面，通过可拖动的薄型手环圆环遮罩切换登录/注册表单。

**关键特性**：
- 遮罩拖动切换：`maskPosition` 0=左（显示登录） / 1=右（显示注册）
- 注册成功后自动滑动遮罩到登录区
- 3D 透视圆环设计，带弹性吸附动画和文字呼吸发光
- 表单验证：账号 8 位数字、密码 6~32 字符、确认密码一致性

**依赖**：`useUserStore`、`inject('toast')`、`inject('loading')`

---

### Chat.vue（聊天主页）

**职责**：容器组件，初始化 5 个 Composables，负责跨 composable 编排和定时器管理。自身不持有业务状态（状态全部在 composable 内部）。

**编排的 Composables**：

| Composable | 管理状态 | 关键职责 |
|------------|---------|---------|
| `useFriendList` | `friends`, `groups`, `chatTarget`, `chatType`, `mobileView`, `activeView`, 收展状态 | 好友/群聊列表、在线状态、群通知 |
| `useChatMessages` | `messages`, 加载/分页/发送状态 | 消息收发、历史加载、WS 事件 |
| `useNotifications` | `receivedRequests`, `sentRequests`, `pendingRequestCount`, `joinGroupRequests` | 好友申请流、入群申请流 |
| `useSidePanel` | `showSidePanel`, `sidePanelMode`, `groupSubMode`, 搜索状态 | 侧面板 UI 状态、用户/群聊搜索 |
| `useProfile` | `profileUser`, `profileContext`, `profileLoading`, `panelHistory` | 资料查看、用户名/密码编辑 |

**跨 Composable 编排**（wrapper 函数）：Chat.vue 提供桥接函数（如 `onSelectFriend` 调用 `useFriendList._selectFriend` + `useChatMessages.resetChat` + `loadChatHistory`），确保一个 composable 的输出能触发另一个 composable 的动作。

**轮询定时器**：
- 未读消息轮询：每 30 秒
- 好友列表刷新：每 60 秒
- 群聊列表刷新：每 60 秒

**WS ERROR 处理**：注册 `ERROR` handler，检测认证相关关键词 → 强制登出。

---

## 三、聊天子组件

### ChatLeftPanel.vue（左侧面板）

**职责**：用户信息栏 + 三个可折叠区域：好友列表、群聊列表、通知入口。群聊区使用 `useDropdown` 管理下拉菜单。

| Props | 类型 | 说明 |
|-------|------|------|
| `friends` | `Array` | 好友列表 |
| `groups` | `Array` | 群聊列表 |
| `selectedFriendId` | `Number` | 当前选中好友 ID |
| `selectedGroupId` | `Number` | 当前选中群聊 ID |
| `chatType` | `String` | 聊天类型 |
| `userName` | `String` | 当前用户名 |
| `friendsExpanded` | `Boolean` | 好友区是否展开 |
| `groupsExpanded` | `Boolean` | 群聊区是否展开 |
| `notificationsExpanded` | `Boolean` | 通知区是否展开 |
| `loadingFriends` | `Boolean` | 好友列表加载中 |
| `pendingRequestCount` | `Number` | 待处理好友申请数（红点） |
| `groupNotificationCount` | `Number` | 群通知事件数（红点） |
| `isLoggedIn` | `Boolean` | 是否已登录 |
| `isLoggingOut` | `Boolean` | 登出中（禁用按钮） |
| `activeView` | `String` | 当前视图状态 |
| `mobileShow` | `Boolean` | 移动端是否显示列表 |
| `inviteMode` | `Boolean` | 是否处于邀请好友入群模式 |
| `inviteGroupName` | `String` | 邀请模式下目标群名称 |
| `inviteGroupMemberIds` | `Array` | 邀请模式下目标群已有成员的 userId 列表（用于过滤复选框） |

| Events | 说明 |
|--------|------|
| `select-friend` | 选择好友，参数：好友对象 |
| `select-group` | 选择群聊，参数：群聊对象 |
| `toggle-friends` | 切换好友区折叠 |
| `toggle-groups` | 切换群聊区折叠 |
| `toggle-notifications` | 切换通知区折叠 |
| `group-action` | 群聊操作（create/join） |
| `logout` | 登出 |
| `open-side-panel` | 打开侧面板（添加好友） |
| `open-profile` | 打开个人资料（点击用户栏头像/用户名） |
| `open-notifications` | 打开好友通知面板 |
| `open-group-notifications` | 打开群聊通知面板 |
| `confirm-invite` | 确认邀请，参数：`{ userIds, message }` |
| `cancel-invite` | 取消邀请模式 |

**内部功能**：
- 好友搜索过滤（按用户名/账号）
- 好友列表排序（最新消息时间 → 在线状态）
- 群聊加号下拉菜单（创建/加入，使用 Teleport 避免 overflow 裁剪）
- 通知入口：好友通知（带未处理红点）+ 群聊通知（带事件数红点）
- 顶部用户栏点击可查看个人资料
- 邀请模式：标题栏高亮 + 好友前出现复选框 + 留言输入框 + 邀请/取消按钮 + 自动过滤已在群中的好友

---

### ChatMessageArea.vue（消息区域）

**职责**：聊天头部 + 消息流（分页加载）+ 输入区。

| Props | 类型 | 说明 |
|-------|------|------|
| `chatTarget` | `Object` | 聊天对象 |
| `chatType` | `String` | 聊天类型 |
| `messages` | `Array` | 消息列表 |
| `userName` | `String` | 当前用户名 |
| `userId` | `Number` | 当前用户 ID |
| `isSending` | `Boolean` | 消息发送中 |
| `loadingMessages` | `Boolean` | 消息历史加载中 |
| `loadingMore` | `Boolean` | 加载更多消息中 |
| `hasMoreMessages` | `Boolean` | 还有更多消息 |
| `mobileShow` | `Boolean` | 移动端是否显示消息区 |

| Events | 说明 |
|--------|------|
| `send` | 发送消息，参数：消息内容 |
| `scroll-top` | 滚动到顶部（加载更多） |
| `back-to-list` | 返回好友列表（移动端） |
| `view-profile` | 查看好友资料（点击头部头像），参数：好友对象 |
| `recall-message` | 撤回消息，参数：消息对象（含 recordId, groupId 等） |

**已撤回消息**：
- 已撤回消息（`item.recalled === true`）渲染灰色斜体虚线气泡，内容显示"你撤回了一条消息"（自己）或"xxx撤回了一条消息"（他人）
- 后端 v2.6+ 历史接口返回 `isDeleted` 字段，刷页面后自动识别为已撤回

**右键菜单（消息撤回）**：
- 右键自己的消息气泡（2 分钟内、未被撤回、有 recordId）→ 弹出磨砂玻璃右键菜单（Teleport to body）
- 菜单含"撤回"选项 → `ElMessageBox.confirm` 确认 → `emit('recall-message', msg)` → Chat.vue → `useChatMessages.recallMessage()`
- 点击菜单外部自动关闭，菜单位置自动避让屏幕边界

**暴露方法**（通过 `defineExpose`）：
- `scrollToBottom()` — 滚动到底部
- `messageListRef` — 消息列表 DOM 引用
- `inputText` — 输入框文本 ref
- `resetInput()` — 重置输入框

**快捷键**：
- `Enter` — 发送消息
- `Ctrl + Enter` — 换行

---

### ChatSidePanel.vue（右侧面板）

**职责**：添加好友 / 创建群聊 / 加入群聊 / 个人资料，四种子模式容器。Profile 模式委托给 `ChatProfileCard`。

| Props | 类型 | 说明 |
|-------|------|------|
| `visible` | `Boolean` | 是否显示 |
| `mode` | `String` | `'friend'` / `'group'` / `'profile'` |
| `groupSubMode` | `String` | `'join'` 或 `'create'`（仅 group 模式） |
| `searchResults` | `Array` | 搜索结果（仅 friend 模式） |
| `searching` | `Boolean` | 搜索中（仅 friend 模式） |
| `friends` | `Array` | 好友列表（判断"已是好友"） |
| `sentRequests` | `Array` | 已发送的好友申请列表 |
| `sendingRequestIds` | `Set` | 正在发送申请的 userId 集合 |
| `groups` | `Array` | 群聊列表（判断已是群成员） |
| `groupSearchResults` | `Array` | 群搜索列表结果 |
| `groupSearching` | `Boolean` | 群搜索中 |
| `joiningGroupIds` | `Set` | 正在发送入群请求的 groupId 集合 |
| `isGroupMember` | `Function` | 判断指定群 ID 是否为成员 |
| `profileUser` | `Object` | 当前查看的用户（透传给 ChatProfileCard） |
| `profileContext` | `String` | 透传给 ChatProfileCard |
| `profileLoading` | `Boolean` | 透传给 ChatProfileCard |

| Events | 说明 |
|--------|------|
| `close` | 关闭面板 |
| `search` | 搜索用户，参数：关键词 |
| `add-friend` | 添加好友（friend 模式），参数：用户对象 |
| `create-group` | 创建群聊 |
| `join-group` | 加入群聊 |
| `edit-username` / `change-password` / `send-message-to` / `add-friend-from-profile` / `delete-friend` / `logout` | 由 ChatProfileCard 透传 |
| `view-profile` | 查看用户资料（搜索结果点击），参数：user 对象 |

---

### ChatProfileCard.vue（个人/群聊资料卡片 — 调度器）

**职责**：根据 `profileContext` 将资料展示调度到对应子组件。共享头像头部和 `.profile-card` 样式（unscoped）。

| Props | 类型 | 说明 |
|-------|------|------|
| `profileUser` | `Object` | 当前查看的用户/群聊对象 |
| `profileContext` | `String` | `'self'` / `'friend'` / `'stranger'` / `'group'` |
| `profileLoading` | `Boolean` | 操作加载中 |

**四种视角调度**：
- `self` → **ProfileSelf**：用户名 inline 编辑、密码修改（可展开）、登出
- `friend` → **ProfileFriend**：用户信息 + 发消息 + 删除好友
- `stranger` → **ProfileStranger**：用户信息 + 添加好友
- `group` → **ProfileGroup**：群聊信息 + 成员列表 + 发消息/加入/解散/退出（根据 `isGroupMember` 切换 UI）

**Events**（透传自子组件）：`edit-username`, `change-password`, `send-message-to`, `add-friend-from-profile`, `delete-friend`, `logout`, `send-message-to-group`, `dissolve-group`, `leave-group`, `join-group`, `view-profile`

---

### ProfileSelf.vue（本人资料）

**职责**：展示/编辑本人用户名（inline 切换）和密码修改（可展开区域）。

**特性**：
- 用户名：点击铅笔图标 → 输入框替换文本 → 确认/取消按钮，调用 `edit-username` emit
- 密码修改：点击展开（grid 动画）→ 旧密码/新密码表单 → 调用 `change-password` emit
- 登出按钮 → emit `logout`

---

### ProfileFriend.vue（好友资料）

**职责**：展示好友信息 + "发消息" + "删除好友"操作按钮。

---

### ProfileStranger.vue（陌生人资料）

**职责**：展示用户信息 + "添加好友"按钮（调用 `add-friend-from-profile` emit）。

---

### ProfileGroup.vue（群聊资料）

**职责**：展示群聊信息 + 成员列表 + 操作按钮。根据 `isGroupMember`（computed from `groups[]`）渲染不同 UI：

**已加入成员**：完整信息（名称/账号/群主/成员数/创建日期）+ 成员列表 + "发消息" + "解散群聊"（群主）/ "退出群聊"（普通成员）
**非成员**：基本信息（名称/账号/成员数）+ "加入群聊"按钮

**群主操作按钮**（仅 `profileUser.isOwner` 时显示）：
- "转让群主"：点击后进入选择模式（`selectMode = 'transfer'`），成员列表每项出现 `el-radio`，选中非群主成员后确认
- "踢出成员"：同上，`selectMode = 'kick'`，确认后调用 `kickGroupMember` API
- "邀请好友"：成员列表标题栏显示，emit `open-invite` 触发 Chat.vue 邀请模式

| Events | 说明 |
|--------|------|
| `send-message-to` | 发送消息给群聊 |
| `dissolve-or-leave-group` | 解散（群主）/ 退出（成员）群聊 |
| `join-group` | 非成员申请加入群聊 |
| `transfer-owner` | 转让群主，参数：`targetUserId` |
| `kick-member` | 踢出成员，参数：`targetUserId` |
| `open-invite` | 打开邀请好友入群模式 |

**成员列表加载**：`getGroupInfo`（主）→ `getGroupMembers`（降级）。排序：群主优先 → joinDate 升序。群主头像金色渐变 + "群主"标签。

---

### ChatNotificationPanel.vue（通知面板 — 调度器）

**职责**：根据 `initialTab` prop 调度到 `ChatNotificationFriend` 或 `ChatNotificationGroup`。共享 unscoped 气泡样式（`.bubble-flow`, `.bubble`, `.message-row` 等）。

| Props | 类型 | 说明 |
|-------|------|------|
| `initialTab` | `String` | `'friend'` — 好友申请 / `'group'` — 群聊通知 |
| `mobileShow` | `Boolean` | 移动端是否显示 |

| Events | 说明 |
|--------|------|
| `handle-request` | 处理好友申请，参数：`(requestId, accept)` |
| `handle-join-request` | 处理入群申请，参数：`(requestId, groupId, accept)` |
| `handle-group-invite` | 处理入群邀请（接受/拒绝），参数：`(inviteId, groupId, accept)` |
| `load-more` | 加载更多 |
| `back-to-list` | 返回好友列表（移动端） |
| `view-profile` | 查看用户资料（点击头像） |

---

### ChatNotificationFriend.vue（好友通知气泡流）

**职责**：合并收到/发出的好友申请为统一时间线气泡流。

**特性**：
- `mergedRequests` 计算属性：合并 received + sent，按 `createTime` 升序，最新在底部
- 收到的申请 → 左侧气泡（`other-bubble`），待处理时显示"同意"/"拒绝"按钮
- 发出的申请 → 右侧气泡（`self-bubble`），显示处理状态标签（待处理/已同意/已拒绝）
- 双向均可点击头像查看用户资料
- 使用 `insertTimeDividers` 插入时间分隔符

---

### ChatNotificationGroup.vue（群聊通知气泡流）

**职责**：合并群成员变更事件 + 入群申请为统一时间线气泡流。

**特性**：
- 三种消息类型：`member-change`（成员加入/离开/群解散/群主转让）、`join-request`（入群申请）、`group-invite`（入群邀请）
- **成员加入（JOIN）**→ 群聊视角左侧气泡：头像=群名首字（绿底），发送者=「XXX」群通知，内容=实际加入者的名字
- **成员退出（LEAVE，他人）**→ 左侧气泡：头像=退出的成员，发送者=成员名，内容="XXX 退出了「YYY」"
- **成员退出（LEAVE，自己）**→ 右侧气泡（`is-self`）：主渐变头像，"你退出了「XXX」"
- **群主转让（他人转让）**→ 左侧气泡，内容来自 `content` 字段
- **群主转让（自己转让）**→ 右侧气泡（`isSelfSide`），发送者="你转让了群主"
- **群解散**→ 左侧气泡，内容来自 `content` 字段
- 入群申请：他人申请（左侧，待处理时有同意/拒绝按钮），本人申请（右侧，显示状态标签）
- 入群邀请（`group-invite`）：被邀请者视角，左侧气泡显示"XXX 邀请你加入「群名」"+ 接受/拒绝按钮
- 已处理的入群申请（status ≠ 0）仍显示但不再显示审批按钮
- 使用 `insertTimeDividers` 插入时间分隔符
- `isSelfRequest(item)` = `item._isSelf || item.senderId === currentUserId`
- `isSelfLeave(item)` = `item.type === 'GROUP_MEMBER_LEAVE' && item.senderId === currentUserId`
- `isSelfTransfer(item)` = `item.type === 'GROUP_OWNER_TRANSFERRED' && item.senderId === currentUserId`
- `isSelfSide(item)` = `isSelfLeave(item) || isSelfTransfer(item)`（统一右侧气泡判断）

---

### GlobalLoading.vue（全局加载遮罩）

**职责**：全屏加载遮罩，支持计数器嵌套调用。

| 方法 | 说明 |
|------|------|
| `show(text)` | 显示加载（text 为提示文字） |
| `hide()` | 隐藏加载（计数器减 1，归 0 时隐藏） |

**使用**：通过 `App.vue` 的 `provide('loading')` 注入。

---

## 四、组件通信模式

```
Chat.vue（容器 — 初始化 5 个 composable，编排跨 composable 逻辑）
  │ composable 暴露的状态通过 props 向下传递
  │ 子组件事件通过 Chat.vue wrapper 函数桥接 composable
  ├── ChatLeftPanel
  │     props: friends, groups, userName, ...  (来自 useFriendList)
  │     events: select-friend, logout, open-side-panel, open-profile, open-notifications, open-group-notifications...
  │
  ├── ChatMessageArea 或 ChatNotificationPanel（条件渲染，通过 activeView 控制）
  │     ChatMessageArea: props: messages, chatTarget, ... (来自 useChatMessages)
  │                      events: send, scroll-top, view-profile
  │                      expose: scrollToBottom(), messageListRef, inputText, resetInput()
  │     ChatNotificationPanel: props: initialTab (来自 notificationTab)
  │                            ├── ChatNotificationFriend（initialTab='friend'）
  │                            │     props/events 来自 useNotifications + useProfile
  │                            └── ChatNotificationGroup（initialTab='group'）
  │                                  props/events 来自 useFriendList.groupNotifications + useNotifications.joinGroupRequests
  │
  └── ChatSidePanel
        props: visible, mode, ... (来自 useSidePanel + useProfile)
        ├── friend 模式：搜索用户 → 添加好友
        ├── group 模式（create/join）：创建群聊 / 搜索群聊 → 加入
        └── profile 模式 → ChatProfileCard
              ├── ProfileSelf（context='self'）
              ├── ProfileFriend（context='friend'）
              ├── ProfileStranger（context='stranger'）
              └── ProfileGroup（context='group'）
```

**设计原则**：
- Chat.vue 不直接持有业务状态 — 所有状态由 5 个 Composable 管理
- 子组件通过 props 接收数据、通过 events 上报 — Chat.vue 的 wrapper 函数将事件桥接到对应 composable 的方法
- 全局功能（Loading/Toast）通过 `provide/inject` 注入，不通过 props 传递
- Composable 拥有独立生命周期（WebSocket 注册/注销在 `onMounted`/`onBeforeUnmount` 中）

---

**文档版本**: v2.0 | **最后更新**: 2026-06-23
