# 状态管理说明

> 项目使用 Pinia 进行状态管理，本文档说明各 Store 的结构、职责和使用方式。

---

## 一、Store 结构

```
src/stores/
├── index.js         # Pinia 实例创建和导出
└── user.js          # 用户状态管理
```

> 目前只有一个 `user` Store。聊天相关状态（好友、消息、通知、面板等）由 5 个 Composables 管理，见下表。

---

## 二、User Store（stores/user.js）

### 2.1 State（响应式状态）

| 状态 | 类型 | 说明 | 持久化 |
|------|------|------|--------|
| `userInfo` | `Ref<Object\|null>` | 用户信息对象 | ✅ localStorage |
| `token` | `Ref<string>` | JWT Token | ✅ localStorage |

### 2.2 Getters（计算属性）

| Getter | 类型 | 说明 |
|--------|------|------|
| `isLoggedIn` | `boolean` | 是否已登录（`!!token.value`） |
| `userId` | `number\|null` | 用户 ID |
| `userName` | `string` | 用户名 |
| `userAccount` | `string` | 用户账号（8 位数字） |

### 2.3 Actions（方法）

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `login(loginData)` | `{userAccount, password}` | `{success, data?, message?}` | 登录：调 API → 存 Token → 启动心跳 → 连接 WS |
| `register(registerData)` | `{userName, password}` | `{success, data?, message?}` | 注册：调 API，不自动登录 |
| `logout()` | — | — | 登出：调 API → 清状态 → 停心跳 → 断 WS → 跳登录页 |
| `fetchUserInfo()` | — | `{success, data?, message?}` | 从后端刷新用户信息 |
| `updateUserInfo(newData)` | `Object` | — | 本地合并更新用户信息并持久化 |
| `clearUserState()` | — | — | 清除所有状态（内存 + localStorage + 心跳 + WS） |
| `initUserState()` | — | — | 应用启动时从 localStorage 恢复登录态 |

---

## 三、登录/登出完整流程

### 3.1 登录流程

```
Login.vue → userStore.login({userAccount, password})
  ├── POST /api/auth/login → 获取 {token, userId, userName, ...}
  ├── token.value = data.token
  ├── userInfo.value = data
  ├── setToken() + setUserInfo() 持久化到 localStorage
  ├── heartbeatManager.start() 启动心跳（2 分钟间隔）
  ├── wsManager.connect() 建立 WebSocket 连接
  └── return { success: true }
      └── Login.vue: toast.success() → 2s 后 router.push('/chat')
```

### 3.2 登出流程

```
Chat.vue → handleLogout()
  ├── ElMessageBox.confirm('确定要登出吗？')
  ├── userStore.logout()
  │   ├── POST /api/auth/logout（失败也继续）
  │   ├── clearUserState()
  │   │   ├── token.value = ''
  │   │   ├── userInfo.value = null
  │   │   ├── removeToken() + removeUserInfo()
  │   │   ├── heartbeatManager.stop()
  │   │   └── wsManager.disconnect()
  │   └── router.push('/login')
  └── finally: isLoggingOut = false
```

### 3.3 应用启动恢复

```
main.js → userStore.initUserState()
  ├── 读取 localStorage: chat_token + chat_user_info
  ├── 若都存在：
  │   ├── token.value = savedToken
  │   ├── userInfo.value = savedUserInfo
  │   ├── heartbeatManager.start()
  │   └── wsManager.connect()
  └── 若不存在：保持未登录状态
```

---

## 三之一、Composables 状态管理

聊天页面的业务状态由 5 个 Composables 分层管理，Chat.vue 纯做编排：

| Composable | 管理状态 | 关键职责 |
|------------|---------|---------|
| `useFriendList` | `friends`, `groups`, `chatTarget`, `chatType`, 展开/折叠状态 | 好友/群聊列表加载、在线状态更新、未读消息轮询、群聊 WS 事件 |
| `useChatMessages` | `messages`, `loadingMessages`, `currentPage`, `hasMoreMessages` | 消息收发（WS 优先 + HTTP fallback）、历史加载、群聊消息 |
| `useNotifications` | `receivedRequests`, `sentRequests`, 分页、`pendingRequestCount` | 好友申请流管理、申请处理、WS 实时通知 |
| `useSidePanel` | `showSidePanel`, `sidePanelMode`, `groupSubMode`, 搜索状态, `sendingRequestIds` | 侧面板 UI 状态、用户搜索（防抖）、发送好友申请、创建群聊 |
| `useProfile` | `profileUser`, `profileContext`, `profileLoading`, `panelHistory` | 资料查看（用户/群聊）、用户名编辑、密码修改、删除好友、解散/退出群聊 |

**设计原则**：Composable 通过参数接收依赖（toast、store、回调函数），拥有独立生命周期（WebSocket 注册/注销在 `onMounted`/`onBeforeUnmount` 中），Chat.vue 只负责初始化顺序和跨 composable 编排。

---

## 四、本地存储（utils/storage.js）

| 键名 | 内容 | 操作函数 |
|------|------|---------|
| `chat_token` | JWT Token 字符串 | `setToken()` / `getToken()` / `removeToken()` |
| `chat_user_info` | 用户信息 JSON | `setUserInfo()` / `getUserInfo()` / `removeUserInfo()` |
| — | 同时清除两者 | `clearAuth()` |

---

## 五、心跳管理（utils/heartbeat.js）

单例模式 `heartbeatManager`：

| 方法 | 说明 |
|------|------|
| `start()` | 停止已有 → 立即发一次 → 每 2 分钟定时发送 |
| `stop()` | 清除定时器 |
| `send()` | 调用 `POST /user/heartbeat`，静默失败 |

**生命周期**：登录成功 → `start()` → 登出 → `stop()`

---

## 六、WebSocket 管理（utils/websocket.js）

单例模式 `wsManager`：

### 6.1 核心方法

| 方法 | 说明 |
|------|------|
| `connect()` | 建立连接（从环境变量获取 URL，自动推导 ws/wss） |
| `disconnect()` | 主动断开（登出时调用） |
| `send(data)` | 发送消息，返回 `boolean` 表示是否成功 |
| `on(type, callback)` | 订阅消息类型 |
| `off(type, callback)` | 取消订阅 |

### 6.2 自动重连

| 配置 | 值 |
|------|-----|
| 最大重连次数 | 10 |
| 重连间隔 | 3 秒 |
| 触发条件 | 连接非主动关闭时自动重连 |

### 6.3 连接地址推导

```
VITE_WS_URL = "ws://localhost:8080/ws/chat"   → 直接使用
VITE_WS_URL = "/ws/chat"                      → 自动推导：
  当前页面 https://xxx.vicp.fun
  → wss://xxx.vicp.fun/ws/chat
```

---

## 七、Chat 相关状态（Composables 管理）

> 聊天相关状态已通过 Composables 模式进行模块化管理，Chat.vue 仅负责编排。

### 7.1 状态分布

| Composable | 管理的状态 | 说明 |
|------------|-----------|------|
| `useFriendList` | `friends`, `groups`, `chatTarget`, `chatType`, `mobileView`, `activeView`, `friendsExpanded`, `groupsExpanded`, `notificationsExpanded`, `groupNotifications` | 好友/群聊列表、在线状态、未读轮询、群聊 WS 事件 |
| `useChatMessages` | `messages`, `loadingMessages`, `loadingMore`, `isSending`, `hasMoreMessages`, `currentPage` | 消息收发（WS 优先 + HTTP fallback）、历史分页加载 |
| `useNotifications` | `receivedRequests`, `sentRequests`, `pendingRequestCount`, `joinGroupRequests`, 分页状态 | 好友申请流管理、入群申请流管理、WS 实时通知 |
| `useSidePanel` | `showSidePanel`, `sidePanelMode`, `groupSubMode`, `panelSearchResults`, `panelSearching`, `groupSearchResults`, `groupSearching`, `sendingRequestIds`, `joiningGroupIds` | 侧面板 UI 状态、用户/群聊搜索（防抖）、发送好友申请 |
| `useProfile` | `profileUser`, `profileContext`, `profileLoading`, `panelHistory` | 资料查看（用户/群聊）、用户名编辑、密码修改、删除好友、解散/退出群聊 |

### 7.2 编排模式

Chat.vue 初始化 5 个 composable，通过解构获取状态和方法，再通过 wrapper 函数进行跨 composable 编排：

```js
// useProfile + useFriendList + useChatMessages 桥接
function onSelectFriend(friend) {
  _selectFriend(friend);       // useFriendList
  resetChat();                 // useChatMessages
  loadChatHistory(false);      // useChatMessages
}

// useProfile → useSidePanel 桥接
function handleAddFriendFromProfile(user) {
  _addFriendFromProfile(user);  // useProfile
  handleAddFriend(user);        // useSidePanel
}

// useSidePanel → useNotifications 回调桥接
// Chat.vue 传入 onJoinRequestSent 回调给 useSidePanel，
// 当用户发起入群申请时通过回调调用 useNotifications.addSelfJoinRequest()
```

### 7.3 Profile 状态（useProfile composable 管理）

> 个人资料相关状态由 `useProfile` composable 管理，Chat.vue 通过解构获取。

| 状态 | 类型 | 说明 | 管理者 |
|------|------|------|--------|
| `profileUser` | `Ref<Object\|null>` | 当前查看的用户/群聊对象 | useProfile |
| `profileContext` | `Ref<string>` | `'self'` / `'friend'` / `'stranger'` / `'group'` | useProfile |
| `profileLoading` | `Ref<boolean>` | 修改用户名/密码/解散/退出操作加载中 | useProfile |
| `panelHistory` | `Array` | 面板历史栈（支持返回到上一个面板模式） | useProfile |

**入口点**（均为 useProfile 的方法）：
- 用户栏点击头像/用户名 → `openSelfProfile()` → context=`'self'`
- 聊天头部点击好友头像 → `onViewProfile(user)` → context=`'friend'`
- 搜索结果点击用户 → `onViewProfile(user)` → 自动判断 context（好友/陌生人）
- 聊天头部点击群名 → `onViewGroupProfile(group)` → context=`'group'`

**关键流程**：
- 修改用户名：`ChatSidePanel` emit `edit-username` → Chat.vue → `useProfile.handleEditUsername()` → 调 API → `userStore.updateUserInfo()` 同步
- 修改密码：`ChatSidePanel` emit `change-password` → Chat.vue → `useProfile.handleChangePassword()` → 调 API → 成功后 `clearUserState()` + 跳转登录页
- 发消息（好友视角）：关闭面板 → Chat.vue `onSelectFriend(user)`
- 发消息（群聊视角）：关闭面板 → Chat.vue `onSelectGroup(group)`
- 面板返回导航：`useProfile.handlePanelClose()` 检查 `panelHistory` 栈 → 有历史则恢复上一个模式，否则关闭面板

### 7.4 设计要点

- **依赖注入**：Composable 通过参数接收依赖（toast、store、回调函数、外部 ref），避免循环引用
- **独立生命周期**：WebSocket 事件注册/注销在 `onMounted`/`onBeforeUnmount` 中（例外：useNotifications 和 useSidePanel 使用 `_cleanup` 模式由 Chat.vue 统一管理）
- **双 Handler 模式**：`PRIVATE_MESSAGE` 和 `GROUP_MESSAGE` 由 useChatMessages 和 useFriendList 各自注册独立 handler — 前者负责消息展示，后者负责侧边栏状态

---

## 八、组件中使用 Store

```vue
<script setup>
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

// 读取状态
console.log(userStore.userName);
console.log(userStore.isLoggedIn);

// 调用方法
const result = await userStore.login({ userAccount: '12345678', password: 'pwd' });
if (result.success) { ... }
</script>

<template>
  <span>{{ userStore.userName }}</span>
  <span v-if="userStore.isLoggedIn">已登录</span>
</template>
```

---

**文档版本**: v2.0 | **最后更新**: 2026-06-23
