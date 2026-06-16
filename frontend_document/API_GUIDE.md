# API 调用规范

> 项目 API 层的封装方式、调用约定、错误处理、环境变量配置说明。

---

## 一、API 文件结构

```
src/api/
├── request.js       # Axios 封装（拦截器、错误处理、Token 注入）
├── auth.js          # 认证接口（登录、注册、登出）
├── user.js          # 用户接口（资料、搜索、在线人数）
├── friend.js        # 好友接口（列表、消息、聊天记录）
└── heartbeat.js     # 心跳接口
```

---

## 二、Axios 封装（request.js）

### 2.1 基础配置

```js
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
});
```

### 2.2 请求拦截器

自动从 `localStorage` 读取 Token 并注入 `Authorization` 头：

```
Authorization: Bearer {token}
```

### 2.3 响应拦截器

| 响应码 | 处理 |
|--------|------|
| `code: 200/201` | 直接返回 `response.data`（即 `{code, message, data}`） |
| `code: 401` | 清除 Token → 跳转登录页 → reject |
| 其他业务错误 | `console.error` → reject |
| HTTP 401 | 同 `code: 401` |
| HTTP 403/404/500 | `console.error` → reject |
| 超时 | `console.error('请求超时')` → reject |

---

## 三、环境变量

| 文件 | 场景 | `VITE_API_BASE_URL` | `VITE_WS_URL` |
|------|------|---------------------|---------------|
| `.env` | 公共默认 | `/api` | `/ws/chat` |
| `.env.development` | 本地开发 | `http://localhost:8080/api` | `ws://localhost:8080/ws/chat` |
| `.env.production` | 生产构建 | `/api` | `/ws/chat` |

**核心原理**：生产环境使用相对路径，由 Nginx 反向代理到后端，实现同源无跨域。

---

## 四、后端统一响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `number` | 业务状态码（200 成功，201 创建，401 未授权等） |
| `message` | `string` | 提示信息 |
| `data` | `any` | 返回数据（可能为对象、数组、null） |

---

## 五、各模块接口清单

### 5.1 认证模块（auth.js）

| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `login(data)` | POST | `/auth/login` | 登录，参数 `{userAccount, password}` |
| `register(data)` | POST | `/auth/register` | 注册，参数 `{userName, password}` |
| `logout()` | POST | `/auth/logout` | 登出 |

### 5.2 用户模块（user.js）

| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getCurrentUser()` | GET | `/user/profile/me` | 获取当前用户信息 |
| `getUserById(id)` | GET | `/user/profile/info/:id` | 根据 ID 获取用户信息 |
| `updateUserName(data)` | PUT | `/user/profile/info` | 修改用户名 `{userName}` |
| `changePassword(data)` | POST | `/user/profile/password/change` | 修改密码 `{oldPassword, newPassword}` |
| `searchUsers(params)` | GET | `/user/search` | 搜索用户 `{keyword, page, size}` |
| `getOnlineCount()` | GET | `/user/search/count` | 获取在线人数 |

### 5.3 好友模块（friend.js）

| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getFriendList()` | GET | `/friends/list` | 获取好友列表（含在线状态） |
| `getUnreadMessages()` | GET | `/friends/messages/unread` | 获取未读消息（调用后自动标记已读） |
| `getChatHistory(id, params)` | GET | `/friends/chat-history/:id` | 聊天记录分页 `{page, size}` |
| `sendMessage(data)` | POST | `/friends/send-message` | 发送消息 `{receiverId, content}` |
| `sendFriendRequest(data)` | POST | `/friends/request` | 发起好友申请 `{receiverId, message?}` |
| `handleFriendRequest(data)` | POST | `/friends/request/handle` | 处理好友申请 `{requestId, accept}` |
| `getReceivedRequests(params)` | GET | `/friends/request/received` | 查询收到的申请 `{status?, page?, size?}` |
| `getSentRequests(params)` | GET | `/friends/request/sent` | 查询发出的申请 `{page?, size?}` |
| `deleteFriend(id)` | DELETE | `/friends/:id` | 删除好友（⏳ 后端规划中） |

### 5.4 心跳模块（heartbeat.js）

| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `sendHeartbeat()` | POST | `/user/heartbeat` | 发送心跳 |

---

## 六、调用规范

### 6.1 在 Store 中调用（推荐）

Store Action 负责调用 API 并处理业务逻辑，组件只调用 Store：

```js
// stores/user.js
import { login as loginApi } from '@/api/auth';

async function login(loginData) {
  try {
    const response = await loginApi(loginData);
    const userData = response.data;
    // 保存状态...
    return { success: true, data: userData };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

### 6.2 在组件中直接调用（简单场景）

适用于不需要修改全局状态的场景（如搜索、加载列表）：

```js
// Chat.vue
import { getFriendList } from '@/api/friend';

async function loadFriends() {
  const res = await getFriendList();
  if (res.code === 200) {
    friends.value = res.data || [];
  }
}
```

### 6.3 返回值处理约定

```js
// API 函数返回的是 { code, message, data } 整体对象
const res = await someApi();

// 判断成功
if (res.code === 200 || res.code === 201) { ... }

// 获取数据
const data = res.data;

// 错误信息
const msg = res.message;
```

---

## 七、WebSocket 通信

### 7.1 连接

```js
// 自动从环境变量获取地址，相对路径时自动推导 ws/wss 协议
wsManager.connect();
```

### 7.2 消息类型

**客户端发送：**

| type | 字段 | 说明 |
|------|------|------|
| `PRIVATE_MESSAGE` | `receiverId`, `content` | 发送私聊消息 |
| `READ_RECEIPT` | `recordId` | 发送已读回执 |
| `HEARTBEAT` | — | WebSocket 心跳 |

**服务端推送：**

| type | 字段 | 说明 |
|------|------|------|
| `PRIVATE_MESSAGE` | `senderId`, `senderName`, `content`, `sendTime`, `recordId` | 收到新消息 |
| `FRIEND_ONLINE` | `senderId`, `senderName` | 好友上线 |
| `FRIEND_OFFLINE` | `senderId`, `senderName` | 好友下线 |
| `FRIEND_REQUEST` | `senderId`, `senderName`, `requestId`, `requestMessage`, `sendTime` | 收到好友申请 |
| `FRIEND_REQUEST_RESULT` | `senderId`, `senderName`, `requestId`, `content`(accepted\|rejected), `sendTime` | 申请处理结果 |
| `READ_RECEIPT` | `senderId`, `recordId` | 对方已读 |
| `ERROR` | `error` | 错误通知 |

### 7.3 事件订阅

```js
wsManager.on('PRIVATE_MESSAGE', handler);
wsManager.off('PRIVATE_MESSAGE', handler);
```

---

## 八、错误处理约定

| 场景 | 处理方式 |
|------|---------|
| 网络错误 | `console.error` + Toast 提示用户 |
| 业务错误（code ≠ 200） | Toast 显示 `res.message` |
| 401 未授权 | 自动清状态跳登录（拦截器处理） |
| 表单验证 | 前端校验后 Toast warning，不发请求 |
| 登录/注册失败 | Store 返回 `{success: false, message}` 由组件 Toast |

**统一反馈原则**：所有用户可见的错误提示通过 `inject('toast')` 展示，不使用 `alert()`。

---

**文档版本**: v1.1 | **最后更新**: 2026-06-15
