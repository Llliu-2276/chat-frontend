# 前端编码规范

> 本文档从项目实际代码中提取，所有规范基于代码库中已验证的模式。  
> 创建日期：2026-06-22 | 基于 commit `5820bdf` 的完整代码审查

---

## ⚠️ 强制性要求

**所有对代码的修改必须遵循以下规范。** 本文档中的每一条规则都是基于项目已有代码模式提炼的硬性约束，任何偏离都将导致代码风格不一致、架构退化或运行时 bug。

**每次修改代码后，都需要检查文档是否需要更新。** 具体检查清单：

| 变更类型 | 需检查的文档 |
|---------|-------------|
| 新增/修改组件 Props、Events、Expose | `frontend_document/COMPONENTS.md` |
| 新增/修改 API 接口调用方式 | `frontend_document/API_GUIDE.md` |
| 架构模式变更（数据流、Composable 拆分） | `frontend_document/ARCHITECTURE.md`、`CLAUDE.md` |
| Store/Composable 状态结构变更 | `frontend_document/STATE_MANAGEMENT.md` |
| 编码规范新增或调整 | `frontend_document/CODE_STANDARDS.md` |
| 部署流程变更 | `frontend_document/NGINX_DEPLOYMENT.md` |
| 新增 JSDoc 类型 | `src/types/index.js` |

如果变更不涉及上述任何文档，则在代码注释中说明变更原因即可。

---

## 一、文件组织与命名

### 1.1 命名规范

| 文件类型 | 命名风格 | 示例 |
|---------|---------|------|
| 页面组件 (`views/`) | PascalCase | `Login.vue`, `Chat.vue` |
| 子组件 (`components/`) | PascalCase，按功能分子目录 | `chat/ChatLeftPanel.vue`, `common/GlobalLoading.vue` |
| Composables (`composables/`) | camelCase，`use` 前缀 | `useChatMessages.js`, `useFriendList.js` |
| API 模块 (`api/`) | kebab-case | `auth.js`, `friend.js`, `group.js` |
| 工具模块 (`utils/`) | kebab-case | `websocket.js`, `storage.js`, `time.js` |
| Store (`stores/`) | camelCase | `user.js` |

### 1.2 目录结构约束

- **禁止**在 `src/` 根目录下直接放置业务 JS 文件
- Composables 仅放于 `src/composables/`，不作为组件内部代码
- API 接口函数必须集中在 `src/api/` 对应模块中，禁止在组件/Composable 内直接调用 `axios` 或 `fetch`
- 新增通用工具函数放入 `src/utils/`，不得在组件或 Composable 内定义可复用的工具函数

### 1.3 组件定义要求

每个组件必须显式设置 `name` 选项（用于 Vue DevTools 识别）：

```javascript
// ✅ 正确
defineOptions({ name: 'ChatLeftPanel' });

// ❌ 错误 —— 缺少 name，DevTools 显示为匿名组件
```

---

## 二、Vue 组件编写规范

### 2.1 Composition API 强制要求

- 所有组件必须使用 `<script setup>` 语法
- 使用 Composition API（`ref`, `computed`, `watch`, `onMounted` 等），禁止使用 Options API
- Store 使用 Pinia Composition API 风格（`defineStore` 内使用 `ref`/`computed`/函数）

### 2.2 Props / Emits / Expose 声明

```javascript
// Props —— 必须声明类型和默认值
const props = defineProps({
  friends: { type: Array, default: () => [] },
  selectedFriendId: { type: Number, default: null },
  isLoggedIn: { type: Boolean, default: false },
});

// Emits —— 必须显式声明
const emit = defineEmits([
  'select-friend', 'select-group',
  'toggle-friends', 'logout',
]);

// Expose —— 需要暴露给父组件的方法/属性
defineExpose({ messageListRef, inputText, scrollToBottom, resetInput });
```

### 2.3 组件通信规范

- **严格单向数据流**：父→子通过 props，子→父通过 emit
- **禁止**在子组件中直接修改 props（Vue 会警告），需要修改时 emit 事件由父组件处理
- **禁止**跨层级使用 `provide`/`inject` 传递业务数据 —— 仅用于 App.vue 提供的全局基础设施（`toast`, `loading`）
- 需要跨组件共享的状态放入 Composable 或 Pinia Store（当前项目中聊天状态全在 Composables 中）

### 2.4 CSS 样式规范

#### Scoped vs Unscoped

```vue
<!-- 页面布局样式：scoped -->
<style scoped>
.chat-page { /* ... */ }
</style>

<!-- 弹窗/全局样式：unscoped（ElMessageBox 渲染在 body 下） -->
<style>
.add-friend-dialog { /* ... */ }
.confirm-dialog { /* ... */ }
</style>
```

**Unscoped 样式的合法使用场景**：
1. `ElMessageBox` / `ElMessage` / `ElNotification` 的自定义 class（因为它们渲染在 `<body>` 根节点）
2. 父组件提供给子组件使用的共享样式类（如 `ChatNotificationPanel` 的 `.bubble-flow` 供子组件使用，`ChatProfileCard` 的 `.profile-info-card` 供四个 Profile 子组件使用）

**禁止**为与弹窗无关的页面元素使用 unscoped 样式。

#### 设计令牌使用

```css
/* ✅ 必须使用 shared.css 中定义的全局 class */
<div class="form-input" />
<button class="submit-button" />
<div class="avatar avatar-sm online" />
<span class="unread-badge" />
<div class="glass-card" />

/* ✅ 必须使用 CSS 变量 —— 不硬编码颜色值 */
color: var(--primary-color);           /* 而非 color: #11998e */
background: var(--primary-gradient);   /* 而非重复写渐变 */
transition: transform var(--transition-fast);  /* 而非 0.3s ease */

/* ❌ 禁止在组件内重复定义 shared.css 已有的 token */
```

#### 动画参数

本项目统一的弹性动画曲线 **必须保持一致**：
```css
transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
/* 或使用 CSS 变量 */
transition: transform var(--transition-bounce);
```

适用于：面板滑入/滑出、遮罩拖动、折叠展开、下拉菜单。  
普通交互（hover、按钮）使用 `0.3s ease`。

#### 玻璃卡片效果

```css
.glass-card {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);  /* Safari 必须 */
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
}
```

---

## 三、JavaScript 编码规范

### 3.1 类型系统

- **纯 JavaScript**，禁止引入 TypeScript
- 类型注释使用 **JSDoc**：文件头 `@module`，函数 `@param`/`@returns`，类型定义 `@typedef`（集中在 `src/types/index.js`）
- 数据结构必须同步更新 `types/index.js` 中的 JSDoc typedef

### 3.2 JSDoc 注释规范

```javascript
/**
 * 聊天消息管理 Composable
 * 负责消息列表状态、发送、历史加载、滚动处理
 *
 * @module composables/useChatMessages
 */

/**
 * 发送消息
 * 优先通过 WebSocket 发送，降级到 HTTP API
 * @param {string} content - 消息内容
 * @returns {Promise<void>}
 */
async function onSendMessage(content) { /* ... */ }

/**
 * 聊天记录视图对象
 * @typedef {Object} ChatRecordVO
 * @property {number} recordId - 消息记录ID
 * @property {string} content - 消息内容
 */
```

### 3.3 注释语言

- 所有 JSDoc 和行内注释使用**中文**
- 控制台日志 (`console.log/error/warn`) 使用**中文**或英文均可
- API 文档中的字段说明使用**中文**

### 3.4 模块导出规范

```javascript
// API 模块：命名导出每个函数
export function login(data) { /* ... */ }
export function register(data) { /* ... */ }

// Composable：默认导出工厂函数
export function useChatMessages(chatTarget, chatType, ...) { /* ... */ }

// 单例：命名导出实例
export const wsManager = new WebSocketManager();
export const heartbeatManager = new HeartbeatManager();

// Store：命名导出工厂函数
export const useUserStore = defineStore('user', () => { /* ... */ });
```

---

## 四、数据流与架构规范

### 4.1 三层数据流（不可破坏）

```
Vue Views（仅编排）
  → Composables（拥有状态 + 业务逻辑）
    → API 模块（仅 HTTP 调用封装）
      → Backend
```

**禁止**：
- View 直接调用 API 模块（必须经 Composable）
- Composable 直接操作 DOM（必须通过 template ref 暴露，由组件操作）
- API 模块包含业务逻辑（如数据处理、状态更新）

### 4.2 Composable 设计规范

每个 Composable 必须：
1. 通过参数接收依赖（toast、store、其他 composable 的方法引用）
2. 拥有独立的 `onMounted`/`onBeforeUnmount` WebSocket 生命周期（见 5.3 例外）
3. 以普通对象形式返回 `{ state, methods }`
4. 有清晰的职责边界（不与其他 Composable 职责重叠）

依赖注入的两种风格：
```javascript
// 风格A：独立参数（依赖简单，无循环引用）
useChatMessages(chatTarget, chatType, friends, messageAreaRef, userStore, toast)

// 风格B：Options 对象（依赖复杂，含回调函数解决循环依赖）
useNotifications({ loadFriends, loadGroups, groups, activeView, chatTarget, mobileView, toast })
```

### 4.3 Chat.vue 编排规范

Chat.vue 的角色是**纯编排**，不拥有业务状态：
- ✅ 持有：`isLoggingOut`（登出 UI 状态）、`notificationTab`（通知入口控制）、三个定时器引用
- ✅ 实现：跨 Composable 编排函数（如 `onSelectFriend()` = 调用 A composable 的选择 + B composable 的重置 + C composable 的加载）
- ❌ 不持有：聊天消息、好友列表、通知数据、侧面板状态 —— 这些全在 Composables 中

### 4.4 状态响应式注意事项

**数组元素替换必须触发 Vue 响应式**：
```javascript
// ✅ 正确 —— splice 替换，触发 computed 重算
const updated = { ...joinGroupRequests.value[idx], status: 1 };
joinGroupRequests.value.splice(idx, 1, updated);

// ❌ 错误 —— 直接修改属性，computed 可能不重算
joinGroupRequests.value[idx].status = 1;
```

使用 `computed` 进行 `filter`/`sort` 时，依赖的数组引用必须发生变化才能触发重算。

---

## 五、WebSocket 规范

### 5.1 注册/注销生命周期

```javascript
// ✅ 标准模式：onMounted 注册，onBeforeUnmount 注销
onMounted(() => {
  wsManager.on('PRIVATE_MESSAGE', handleWsPrivateMessage);
  wsManager.on('GROUP_MESSAGE', handleWsGroupMessage);
});

onBeforeUnmount(() => {
  wsManager.off('PRIVATE_MESSAGE', handleWsPrivateMessage);
  wsManager.off('GROUP_MESSAGE', handleWsGroupMessage);
});
```

**禁止**遗漏 `off()` 调用 —— 会导致内存泄漏和重复处理。

### 5.2 `_cleanup` 例外模式

当 Composable 使用闭包包装的 handler（`const _wsHandler = (msg) => actualHandler(msg)`）确保调用最新闭包时，必须：
- 导出 `_cleanupXxx()` 函数
- 由 **Chat.vue** 在其 `onBeforeUnmount` 中调用

```javascript
// useNotifications.js
const _wsFriendRequest = (msg) => handleWsFriendRequest(msg);
// ... onMounted 注册 _wsFriendRequest，不注册 handleWsFriendRequest

return {
  _cleanupNotifications() {
    wsManager.off('FRIEND_REQUEST', _wsFriendRequest);
    // ...
  },
};

// Chat.vue
onBeforeUnmount(() => {
  _cleanupNotifications();  // 必须显式调用
  _cleanupSidePanel();      // 同上
});
```

### 5.3 双 Handler 模式

`PRIVATE_MESSAGE` 和 `GROUP_MESSAGE` 在 `useChatMessages` 和 `useFriendList` 中**各自独立注册** —— 这是刻意的设计模式。修改时需要确保两侧逻辑一致性（如 unread count 的清理/累加逻辑必须相同）。详见 `CLAUDE.md` 中的 "Dual-Handler Pattern" 说明。

### 5.4 消息发送规范

```javascript
// ✅ 正确：先尝试 WS，失败降级 HTTP
const sent = wsManager.send({ type: 'PRIVATE_MESSAGE', receiverId, content });
if (!sent) {
  await sendMessageApi({ receiverId, content });  // HTTP fallback
}
```

### 5.5 乐观更新与回滚

```javascript
// 1. 创建临时消息
const tempMsg = { _id: Date.now(), content, /* ... */ };
messages.value.push(tempMsg);

// 2. 清空输入框（乐观）
messageAreaRef.value?.resetInput();

try {
  // 3. 发送消息
  // ...
  // 4. WS 回传消息时会通过 recordId 替换临时消息
} catch (e) {
  // 5. 失败回滚：移除临时消息
  toast.error('消息发送失败，请重试');
  messages.value = messages.value.filter(m => m._id !== tempMsg._id);
}
```

临时消息通过 `_id` 字段（非 `recordId`）标识。WS 回传消息替换时匹配条件：`m._id && m.senderId === senderId && !m.recordId`。

---

## 六、API 调用规范

### 6.1 响应码检查

```javascript
// ✅ 正确 —— 检查多种成功码
if (res.code === 200 || res.code === 201) { /* 处理成功 */ }

// ❌ 错误 —— 只检查 200，201 Created 场景会误判失败
if (res.code === 200) { /* ... */ }
```

本项目使用的成功码：`200`（OK）, `201`（Created）, `202`（Accepted）, `204`（No Content）, `206`（Partial Content）。

关键 201 接口：`sendFriendRequest`, `createGroup`, `sendGroupMessage`, `joinGroup`。

### 6.2 错误处理标准模式

```javascript
async function loadFriends({ silent = false } = {}) {
  loadingFriends.value = true;
  try {
    const res = await getFriendList();
    if (res.code === 200) {
      // 成功处理
      friends.value = /* ... */;
    } else if (!silent) {
      toast.error(res.message || '加载好友列表失败，请刷新重试');
    }
  } catch (e) {
    console.error('加载好友列表失败:', e);
    if (!silent) toast.error('网络异常，加载好友列表失败');
  } finally {
    loadingFriends.value = false;  // 必须：无论成败都清除 loading 状态
  }
}
```

**关键规则**：
- `try-catch` 包裹所有 API 调用
- `finally` 块中重置 loading 状态（避免按钮永久 disabled）
- `catch` 中必须调用 `toast.error`
- 优先使用 `error.message`（即后端返回的错误消息）作为 toast 内容

### 6.3 静默失败（Silent Mode）

后台轮询/刷新必须使用静默模式，避免频繁弹 toast：

```javascript
// ✅ 后台轮询：静默
setInterval(() => fetchUnreadMessages({ silent: true }), 30000);
setInterval(() => loadFriends({ silent: true }), 60000);
setInterval(() => loadGroups({ silent: true }), 60000);

// ✅ 主操作已弹 toast，刷新数据静默
loadFriends({ silent: true });  // 前面已 toast "已删除好友"

// ✅ 首次加载：不静默（用户需要知道失败）
await loadFriends();  // 默认 silent=false
```

### 6.4 API 函数规范

```javascript
// ✅ API 模块只做 HTTP 调用，返回 Promise
export function getChatHistory(friendId, params) {
  return request({
    url: `/friends/chat-history/${friendId}`,
    method: 'GET',
    params,
  });
}

// ❌ 不要在 API 模块中处理响应或错误 —— 交给调用方
```

---

## 七、定时器与事件监听规范

### 7.1 定时器清理

```javascript
let unreadTimer = null, friendListTimer = null, groupListTimer = null;

onMounted(async () => {
  // 初始化
  unreadTimer = setInterval(() => fetchUnreadMessages({ silent: true }), 30000);
  friendListTimer = setInterval(() => loadFriends({ silent: true }), 60000);
  groupListTimer = setInterval(() => loadGroups({ silent: true }), 60000);
});

onBeforeUnmount(() => {
  // 必须全部清除
  if (unreadTimer) clearInterval(unreadTimer);
  if (friendListTimer) clearInterval(friendListTimer);
  if (groupListTimer) clearInterval(groupListTimer);
});
```

**禁止**遗漏 `clearInterval`/`clearTimeout` —— 会导致组件卸载后回调仍执行，访问已销毁的响应式状态。

### 7.2 全局事件监听

```javascript
// ✅ 正确：onBeforeUnmount 中移除所有全局事件
onMounted(() => {
  window.addEventListener('resize', handleResize);
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
});
```

---

## 八、登录/认证规范

### 8.1 登录成功流程（不可改变顺序）

```
1. 设置 token 和 userInfo（内存 + localStorage）
2. heartbeatManager.start()    —— 启动心跳
3. wsManager.connect()         —— 建立 WebSocket
4. 延迟 2s 后 router.push('/chat')
```

### 8.2 登出/401 清理流程（不可改变顺序）

```
1. userStore.token = ''        —— 清除 Pinia 内存
2. userStore.userInfo = null
3. removeToken() + removeUserInfo()  —— 清除 localStorage
4. heartbeatManager.stop()     —— 停止心跳
5. wsManager.disconnect()      —— 断开 WS（设置 manuallyClosed=true）
6. ElMessage.error('登录已过期，请重新登录')
7. router.push('/login?redirect=...')
```

**`handleUnauthorized()` 和 `userStore.clearUserState()` 必须保持一致的清理逻辑。**

### 8.3 防重复 401 处理

`api/request.js` 中的 `isHandlingUnauthorized` 标志位：
- 设置 `true` → 执行清理 → `router.push()` 完成后设回 `false`
- 并发 401 请求只执行一次清理

---

## 九、Toast 通知规范

### 9.1 Toast 类型选择

```javascript
toast.success('操作成功');     // 成功操作
toast.error('操作失败，请重试'); // 错误（红色）
toast.warning('请输入用户名');  // 表单验证警告
toast.info('xxx 请求加你为好友'); // 通知性信息
```

### 9.2 Toast 消息内容要求

- 成功消息：明确告知用户做了什么（如 "已删除好友「张三」" 而非 "操作成功"）
- 错误消息：
  - 网络错误：使用 "网络异常，xxx" 前缀
  - 业务错误：优先使用后端返回的 `error.message`
  - 操作失败：给出明确的用户可操作提示（如 "请刷新重试"）
- 信息消息：简洁描述发生了什么

---

## 十、Element Plus 弹窗规范

### 10.1 ElMessageBox 使用

```javascript
// 确认弹窗 —— 必须设置 customClass
await ElMessageBox.confirm('确认内容', '标题', {
  confirmButtonText: '确定',
  cancelButtonText: '取消',
  type: 'warning',
  customClass: 'confirm-dialog',     // 匹配 unscoped 样式
});

// 输入弹窗
const { value } = await ElMessageBox.prompt('内容HTML', '标题', {
  confirmButtonText: '发送',
  cancelButtonText: '取消',
  inputValue: defaultMsg,
  dangerouslyUseHTMLString: true,    // 内容含 HTML 时必须设置
  customClass: 'add-friend-dialog',
  closeOnClickModal: false,          // 防止误触关闭
});
```

### 10.2 取消处理

```javascript
try {
  const { value } = await ElMessageBox.prompt(/* ... */);
  // 处理确认
} catch (e) {
  // 取消时抛出 'cancel' 或 Error('cancel')
  if (e === 'cancel' || e?.message === 'cancel') {
    // 用户主动取消，静默处理
  } else {
    // 其他异常
    toast.error(e?.message || '操作失败');
  }
}
```

---

## 十一、防御性编程检查清单

修改代码后必须审视以下项：

### WebSocket
- [ ] 新注册的 WS handler 是否在 `onBeforeUnmount`（或 `_cleanup`）中注销？
- [ ] 如果使用闭包包装 handler，是否通过 `_cleanupXxx` 导出正确清理？
- [ ] 新发的 WS 消息类型是否在 `types/index.js` 中已有 typedef？

### 乐观更新
- [ ] 乐观更新失败时（catch 块），临时消息/状态是否正确回滚？
- [ ] 临时消息是否有唯一 `_id` 标识（不与真实数据冲突）？

### 定时器
- [ ] `setInterval`/`setTimeout` 是否在 `onBeforeUnmount` 中清除？
- [ ] 后台定时器是否使用 `{ silent: true }` 防止 toast 骚扰？

### 错误处理
- [ ] 每个 async 函数是否有 `try-catch`？
- [ ] `catch` 中是否有 `toast.error`？
- [ ] `finally` 中是否重置了 loading/spinning 状态？
- [ ] 是否检查了 201（以及 202/204/206）响应码？

### 401 场景
- [ ] 401 触发时是否执行了完整清理（store + localStorage + heartbeat + WS + redirect）？
- [ ] `handleUnauthorized()` 和 `clearUserState()` 清理步骤是否一致？

### 状态响应式
- [ ] 数组元素属性修改是否使用了 `splice` 替换（而非直接赋值）？
- [ ] computed 依赖的 ref 数组是否通过赋值新引用触发重算？

### 样式
- [ ] 弹窗样式是否放在 `<style>`（unscoped）中？
- [ ] 是否使用了 `shared.css` 的全局 class 而非重复定义？
- [ ] 动画参数是否使用 `var(--transition-bounce)` 或 `cubic-bezier(0.68, -0.55, 0.27, 1.55)`？
- [ ] 磨砂玻璃效果是否包含 `-webkit-backdrop-filter`？

### 文档同步
- [ ] `frontend_document/` 下相关文档是否需要更新？
- [ ] 新的 typedef 是否已添加到 `types/index.js`？

---

## 十二、Git 提交规范

**将代码推送到仓库时，必须使用中文备注。** 提交信息应简洁明确地描述本次改动内容：

```bash
# ✅ 正确示例
git commit -m "修复注册成功卡片账号显示 undefined"
git commit -m "新增群聊解散和群主转让 WebSocket 通知处理"
git commit -m "实现入群申请和群通知历史 REST 加载"

# ❌ 错误示例
git commit -m "fix bug"
git commit -m "update code"
git commit -m "修复了一些问题"  # 太模糊，应说明具体修复了什么
```

---

## 十三、禁止事项清单

| 禁止项 | 替代做法 |
|--------|---------|
| 引入 TypeScript（`.ts`/`.tsx`） | 使用 JSDoc + `types/index.js` |
| 使用 Options API | 使用 Composition API + `<script setup>` |
| 在组件/Composable 内定义可复用工具函数 | 放入 `src/utils/` |
| 在组件/Composable 内直接 `axios.get()` / `fetch()` | 通过 `src/api/` 模块调用 |
| 硬编码颜色值（如 `#11998e`） | 使用 CSS 变量或 `shared.css` 全局 class |
| 直接修改 props | emit 事件通知父组件修改 |
| 跨组件使用 `provide`/`inject` 传业务数据 | 放入 Composable 或 Pinia |
| 遗漏 `wsManager.off()` | 在 `onBeforeUnmount` 中对应注销 |
| 遗漏 `clearInterval`/`clearTimeout` | `onBeforeUnmount` 中清除所有定时器 |
| 弹窗样式放在 `<style scoped>` 中 | 放在 `<style>`（unscoped）中 |
| 只检查 `res.code === 200` | 同时检查 201/202/204/206 |
| API 模块中处理响应数据或错误 | 交给 Composable 调用方处理 |
| 重复定义 `shared.css` 已有的设计令牌 | 使用已有的 CSS 变量 |

---

**文档版本**: v1.0 | **创建日期**: 2026-06-22
