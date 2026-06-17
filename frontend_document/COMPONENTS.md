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
│   │   ├── ChatNotificationPanel.vue # 通知面板
│   │   ├── ChatSidePanel.vue         # 右侧面板（容器）
│   │   ├── ChatProfileCard.vue       # 个人资料卡片
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

**职责**：容器组件，集中管理所有聊天相关状态和业务逻辑，编排三个子组件。

**管理的状态**：

| 状态 | 类型 | 说明 |
|------|------|------|
| `friends` | `Array` | 好友列表（含在线状态、最新消息、未读数） |
| `groups` | `Array` | 群聊列表 |
| `chatTarget` | `Object` | 当前聊天对象 |
| `chatType` | `string` | `'friend'` 或 `'group'` |
| `messages` | `Array` | 当前聊天的消息列表 |
| `showSidePanel` | `boolean` | 侧面板是否展开 |

**WebSocket 事件处理**：

| 消息类型 | 处理 |
|---------|------|
| `PRIVATE_MESSAGE` | 接收/回传消息，更新消息列表和好友列表 |
| `FRIEND_ONLINE` | 更新好友在线状态为 true |
| `FRIEND_OFFLINE` | 更新好友在线状态为 false |
| `READ_RECEIPT` | 标记消息为已读 |

**轮询定时器**：
- 未读消息轮询：每 30 秒
- 好友列表刷新：每 60 秒

---

## 三、聊天子组件

### ChatLeftPanel.vue（左侧面板）

**职责**：用户信息栏 + 好友列表（搜索/收展）+ 群聊列表（下拉菜单）。

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
| `loadingFriends` | `Boolean` | 好友列表加载中 |

| Events | 说明 |
|--------|------|
| `select-friend` | 选择好友，参数：好友对象 |
| `select-group` | 选择群聊，参数：群聊对象 |
| `toggle-friends` | 切换好友区折叠 |
| `toggle-groups` | 切换群聊区折叠 |
| `group-action` | 群聊操作（create/join） |
| `logout` | 登出 |
| `open-side-panel` | 打开侧面板（添加好友） |
| `open-profile` | 打开个人资料（点击用户栏头像/用户名） |

**内部功能**：
- 好友搜索过滤（按用户名/账号）
- 好友列表排序（最新消息时间 → 在线状态）
- 群聊加号下拉菜单（创建/加入，使用 Teleport 避免 overflow 裁剪）
- 顶部用户栏点击可查看个人资料

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
| `hasMoreMessages` | `Boolean` | 还有更多消息 |

| Events | 说明 |
|--------|------|
| `send` | 发送消息，参数：消息内容 |
| `scroll-top` | 滚动到顶部（加载更多） |
| `back-to-list` | 返回好友列表（移动端） |
| `view-profile` | 查看好友资料（点击头部头像），参数：好友对象 |

**暴露方法**（通过 `defineExpose`）：
- `scrollToBottom()` — 滚动到底部
- `messageListRef` — 消息列表 DOM 引用

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

### ChatProfileCard.vue（个人资料卡片）

**职责**：展示用户资料，支持三种视角的自适应 UI。

| Props | 类型 | 说明 |
|-------|------|------|
| `profileUser` | `Object` | 当前查看的用户对象 |
| `profileContext` | `String` | `'self'` / `'friend'` / `'stranger'` |
| `profileLoading` | `Boolean` | 操作加载中 |

| Events | 说明 |
|--------|------|
| `edit-username` | 修改用户名，参数：`newName` |
| `change-password` | 修改密码，参数：`{oldPassword, newPassword}` |
| `send-message-to` | 发消息，参数：user |
| `add-friend-from-profile` | 添加好友，参数：user |
| `delete-friend` | 删除好友，参数：user |
| `logout` | 登出 |

**三种视角**：
- `self`：用户名 inline 编辑、密码修改（可展开）、登出
- `friend`：用户信息 + 发消息 + 删除好友
- `stranger`：用户信息 + 添加好友

**内部状态**：编辑用户名、修改密码的表单状态和验证逻辑均在组件内部管理，不污染父组件。

---

### ChatNotificationPanel.vue（通知面板）

**职责**：合并展示收到与发出的好友申请，以聊天气泡风格按时间线排列。

| Props | 类型 | 说明 |
|-------|------|------|
| `receivedRequests` | `Array` | 收到的好友申请列表 |
| `sentRequests` | `Array` | 发出的好友申请列表 |
| `loadingReceived` | `Boolean` | 收到的申请加载中 |
| `loadingSent` | `Boolean` | 发出的申请加载中 |
| `loadingMoreReceived` | `Boolean` | 收到的申请加载更多中 |
| `loadingMoreSent` | `Boolean` | 发出的申请加载更多中 |
| `hasMoreReceived` | `Boolean` | 是否还有更多收到的申请 |
| `hasMoreSent` | `Boolean` | 是否还有更多发出的申请 |
| `pendingCount` | `Number` | 待处理申请数量 |
| `mobileShow` | `Boolean` | 移动端是否显示 |

| Events | 说明 |
|--------|------|
| `handle-request` | 处理申请（同意/拒绝），参数：`(requestId, accept)` |
| `load-more` | 加载更多申请 |
| `back-to-list` | 返回好友列表（移动端） |

**内部逻辑**：
- `mergedRequests` 计算属性：将收到和发出的申请合并，按 `createTime` 升序排列，最新在底部
- 收到的申请 → 左侧气泡（`other-bubble` 样式），待处理时显示"同意"/"拒绝"按钮
- 发出的申请 → 右侧气泡（`self-bubble` 样式），显示处理状态标签
- 状态标签样式：待处理（橙色）、已同意（绿色）、已拒绝（灰色）

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
Chat.vue（容器）
  │ props ↓  ↑ events
  ├── ChatLeftPanel
  │     props: friends, groups, userName...
  │     events: select-friend, logout, open-side-panel, open-profile...
  │
  ├── ChatMessageArea 或 ChatNotificationPanel（条件渲染）
  │     ChatMessageArea: props: messages, chatTarget, userId...
  │                      events: send, scroll-top, view-profile
  │                      expose: scrollToBottom(), messageListRef
  │     ChatNotificationPanel: props: receivedRequests, sentRequests, pendingCount...
  │                            events: handle-request, load-more
  │
  └── ChatSidePanel
        props: visible, mode, searchResults, profileUser, profileContext...
        events: close, search, add-friend, edit-username, change-password,
                send-message-to, add-friend-from-profile, delete-friend, view-profile, logout
```

**设计原则**：
- Chat.vue 集中持有所有状态，子组件是**纯展示 + 事件上报**
- 子组件不直接调用 API，所有数据变更由 Chat.vue 统一处理
- 全局功能（Loading/Toast）通过 `provide/inject` 注入，不通过 props 传递

---

**文档版本**: v1.2 | **最后更新**: 2026-06-16
