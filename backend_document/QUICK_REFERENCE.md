# 🚀 ChatBackend 前端快速参考手册

> 简洁版API参考 | 完整文档请查看 [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## 📡 基础信息

- **API基础路径**: `http://localhost:8080/api`
- **认证方式**: JWT Token (Bearer)
- **数据格式**: JSON
- **跨域**: 已配置CORS

---

## 🔑 核心接口速查

### 认证接口

| 接口 | 方法 | 路径 | 认证 |
|-----|------|------|------|
| 登录 | POST | `/api/auth/login` | ❌ |
| 注册 | POST | `/api/auth/register` | ❌ |
| 登出 | POST | `/api/auth/logout` | ✅ |

### 用户资料接口

| 接口 | 方法 | 路径 | 认证 |
|-----|------|------|------|
| 获取当前用户 | GET | `/api/user/profile/me` | ✅ |
| 获取指定用户 | GET | `/api/user/profile/info/{userId}` | ✅ |
| 修改用户名 | PUT | `/api/user/profile/info` | ✅ |
| 修改密码 | POST | `/api/user/profile/password/change` | ✅ |

### 搜索接口

| 接口 | 方法 | 路径 | 认证 |
|-----|------|------|------|
| 搜索用户 | GET | `/api/user/search?keyword=xx&page=1&size=10` | ✅ |
| 在线人数 | GET | `/api/user/search/count` | ✅ |

> **搜索参数约束**：关键词不能为空，最多20字符；每页大小 1-50；页码 ≥ 1。

### 心跳接口

| 接口 | 方法 | 路径 | 认证 |
|-----|------|------|------|
| 发送心跳 | POST | `/api/user/heartbeat` | ✅ |

### 好友接口

| 接口 | 方法 | 路径 | 认证 |
|-----|------|------|------|
| 好友列表 | GET | `/api/friends/list?page=1&size=20` | ✅ |
| 未读消息 | GET | `/api/friends/messages/unread` | ✅ |
| 聊天记录 | GET | `/api/friends/chat-history/{friendId}?page=1&size=20` | ✅ |
| 发送消息 | POST | `/api/friends/send-message` | ✅ |
| 发起好友申请 | POST | `/api/friends/request` | ✅ |
| 处理好友申请 | POST | `/api/friends/request/handle` | ✅ |
| 查询收到的申请 | GET | `/api/friends/request/received?status=0&page=1&size=20` | ✅ |
| 查询发出的申请 | GET | `/api/friends/request/sent?page=1&size=20` | ✅ |
| 删除好友 | DELETE | `/api/friends/remove/{friendId}` | ✅ |
| 撤回私聊消息 | POST | `/api/friends/message/{recordId}/recall` | ✅ |
| 搜索私聊消息 | GET | `/api/friends/chat-history/{friendId}/search?keyword=` | ✅ |

> **注意**：好友添加必须通过申请-同意流程，不存在直接添加好友的接口。撤回消息仅限发送者，且2分钟内可撤回。

### 群组接口

| 接口 | 方法 | 路径 | 认证 |
|-----|------|------|------|
| 创建群聊 | POST | `/api/group/create` | ✅ |
| 群聊列表 | GET | `/api/group/list` | ✅ |
| 群聊详情 | GET | `/api/group/info/{groupId}` | ✅ |
| 解散/退出群聊 | DELETE | `/api/group/{groupId}` | ✅ |
| 发送群消息 | POST | `/api/group/message` | ✅ |
| 群聊天记录 | GET | `/api/group/history/{groupId}?page=1&size=20` | ✅ |
| 群成员列表 | GET | `/api/group/members/{groupId}` | ✅ |
| 搜索群聊 | GET | `/api/group/search?keyword=&page=&size=` | ✅ |
| 编辑群聊信息 | PUT | `/api/group/{groupId}` | ✅ |
| 加入群聊 | POST | `/api/group/join/{groupId}?message=`(可选) | ✅ |
| 标记群消息已读 | POST | `/api/group/{groupId}/read/{recordId}` | ✅ |
| 群未读消息数 | GET | `/api/group/{groupId}/unread-count` | ✅ |
| 查看入群申请 | GET | `/api/group/{groupId}/join-requests` | ✅ |
| 处理入群申请 | POST | `/api/group/{groupId}/join-request/{requestId}/handle` | ✅ |
| 群通知列表 | GET | `/api/group/{groupId}/notifications` | ✅ |
| 踢出群成员 | DELETE | `/api/group/{groupId}/member/{targetUserId}` | ✅ |
| 转让群主 | POST | `/api/group/{groupId}/transfer/{targetUserId}` | ✅ |
| 邀请好友入群 | POST | `/api/group/{groupId}/invite/{inviteeId}` | ✅ |
| 撤回群聊消息 | POST | `/api/group/{groupId}/message/{recordId}/recall` | ✅ |
| 搜索群聊消息 | GET | `/api/group/history/{groupId}/search?keyword=` | ✅ |

> **注意**：群主解散群聊会清除所有成员和聊天记录且不可恢复；非群主只能退出群聊。搜索群聊支持按群名和群号模糊匹配。

---

### 用户拉黑接口

| 接口 | 方法 | 路径 | 认证 |
|-----|------|------|------|
| 拉黑用户 | POST | `/api/user/block` | ✅ |
| 取消拉黑 | DELETE | `/api/user/block/{blockedId}` | ✅ |
| 黑名单列表 | GET | `/api/user/blocked-list` | ✅ |

## 📡 WebSocket 实时通信

| 端点 | 说明 |
|------|------|
| `ws://localhost:8080/ws/chat` | 连接时 URL 携带 `?token={JWT}` 认证（含Token黑名单+心跳校验） |

**消息类型**：

| type | 方向 | 说明 |
|------|------|------|
| `PRIVATE_MESSAGE` | C→S / S→C | 私聊消息 |
| `GROUP_MESSAGE` | C→S / S→C | 群聊消息 |
| `GROUP_MEMBER_JOIN` | S→C | 群成员加入通知 |
| `GROUP_MEMBER_LEAVE` | S→C | 群成员退出/群解散通知 |
| `FRIEND_ONLINE` | S→C | 好友上线通知 |
| `FRIEND_OFFLINE` | S→C | 好友下线通知 |
| `FRIEND_REQUEST` | S→C | 好友申请通知（字段：senderId, senderName, requestId, requestMessage, sendTime） |
| `FRIEND_REQUEST_RESULT` | S→C | 好友申请结果通知（字段：senderId, senderName, requestId, content=accepted/rejected, sendTime） |
| `READ_RECEIPT` | S→C | 消息已读回执 |
| `HEARTBEAT` | S→C | 心跳响应 |
| `GROUP_READ_RECEIPT` | C→S | 群聊消息已读回执（字段：senderId, groupId, recordId） |
| `JOIN_GROUP_REQUEST` | S→C | 入群申请通知（字段：senderId申请人, senderName, groupId, content, requestId, sendTime） |
| `GROUP_DISBANDED` | S→C | 群聊解散通知（字段：groupId, senderId群主, senderName, content, sendTime） |
| `MESSAGE_RECALL` | S→C | 消息撤回通知（字段：senderId, senderName, recordId, groupId/receiverId） |
| `GROUP_OWNER_TRANSFERRED` | S→C | 群主转让通知（字段：groupId, senderId旧群主, targetUserId新群主） |
| `ERROR` | S→C | 错误通知 |

> 详细对接说明见 [WEBSOCKET_UPGRADE.md](./WEBSOCKET_UPGRADE.md)

---

## 💻 快速开始代码

### 1. 登录

```javascript
const response = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userAccount: '12345678',
    password: 'yourpassword'
  })
});

const data = await response.json();
if (data.code === 200) {
  localStorage.setItem('chat_token', data.data.token);
  localStorage.setItem('chat_user_info', JSON.stringify(data.data));
}
```

### 2. 带Token的请求

```javascript
const token = localStorage.getItem('chat_token');

const response = await fetch('http://localhost:8080/api/user/profile/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
```

### 3. 心跳机制

```javascript
// 登录后启动
const timer = setInterval(() => {
  fetch('http://localhost:8080/api/user/heartbeat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}, 2 * 60 * 1000); // 每2分钟

// 登出时停止
clearInterval(timer);
```

### 4. 登出

```javascript
await fetch('http://localhost:8080/api/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

localStorage.clear();
window.location.href = '/login.html';
```

### 5. 获取好友列表

```javascript
const response = await fetch('http://localhost:8080/api/friends/list', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();
if (data.code === 200) {
  const friends = data.data; // 好友列表
  friends.forEach(friend => {
    console.log(`${friend.userName} - ${friend.isOnline ? '在线' : '离线'}`);
  });
}
```

### 6. 获取未读消息

```javascript
const response = await fetch('http://localhost:8080/api/friends/messages/unread', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();
if (data.code === 200 && data.data.length > 0) {
  // 更新未读红点
  updateUnreadBadge(data.data.length);
  // 注意：返回后后端自动标记为已读
}
```

### 7. 获取聊天记录

```javascript
const friendId = 2;
const page = 1;
const size = 20;

const response = await fetch(
  `http://localhost:8080/api/friends/chat-history/${friendId}?page=${page}&size=${size}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const data = await response.json();
if (data.code === 200) {
  const messages = data.data.content; // 消息列表
  const totalPages = data.data.totalPages; // 总页数
  // 渲染消息列表
}
```

### 8. 发送好友消息

```javascript
const receiverId = 2;
const content = '你好，在吗？';

const response = await fetch('http://localhost:8080/api/friends/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ receiverId, content })
});

const data = await response.json();
if (data.code === 201) {
  console.log('消息发送成功');
  // 将消息追加到聊天列表
} else {
  console.log('发送失败：' + data.message);
}
```

### 9. 发送好友申请

```javascript
const receiverId = 2;
const message = '你好，我是张三，希望加你为好友';

const response = await fetch('http://localhost:8080/api/friends/request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ receiverId, message })
});

const data = await response.json();
if (data.code === 201) {
  console.log('好友申请已发送');
} else {
  console.log('申请失败：' + data.message);
}
```

### 10. 处理好友申请

```javascript
const requestId = 1;
const accept = true; // true=同意, false=拒绝

const response = await fetch('http://localhost:8080/api/friends/request/handle', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ requestId, accept })
});

const data = await response.json();
if (data.code === 200) {
  console.log(accept ? '已同意' : '已拒绝');
  // 刷新好友列表和申请列表
} else {
  console.log('操作失败：' + data.message);
}
```

### 11. 查询收到的好友申请

```javascript
const status = 0; // 0=待处理, 1=已同意, 2=已拒绝
const page = 1;
const size = 20;

const response = await fetch(
  `http://localhost:8080/api/friends/request/received?status=${status}&page=${page}&size=${size}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const data = await response.json();
if (data.code === 200) {
  const requests = data.data.content;
  requests.forEach(req => {
    console.log(`${req.senderName} 申请加你为好友: ${req.message || '无留言'}`);
  });
}
```

### 12. 删除好友

```javascript
const friendId = 2;

// 弹出确认对话框
if (!confirm('确定要删除该好友吗？聊天记录将被清除。')) return;

const response = await fetch(`http://localhost:8080/api/friends/remove/${friendId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();
if (data.code === 200) {
  console.log('好友已删除');
  // 刷新好友列表
  refreshFriendList();
} else {
  console.log('删除失败：' + data.message);
}
```

### 13. 创建群聊

```javascript
const response = await fetch('http://localhost:8080/api/group/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ groupName: '我的群聊' })
});

const data = await response.json();
if (data.code === 201) {
  console.log('群聊创建成功，群号：' + data.data.account);
  // 跳转到群聊页面
}
```

### 14. 获取群聊列表

```javascript
const response = await fetch('http://localhost:8080/api/group/list', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();
if (data.code === 200) {
  data.data.forEach(group => {
    console.log(`${group.groupName} - ${group.memberCount}人 - ${group.isOwner ? '群主' : '成员'}`);
  });
}
```

### 15. 解散/退出群聊

```javascript
const groupId = 1;
const isOwner = true; // 从群列表的isOwner字段获取

const actionText = isOwner ? '解散群聊' : '退出群聊';
const warnText = isOwner
  ? '确定要解散该群聊吗？所有成员和聊天记录将被清除。'
  : '确定要退出该群聊吗？';

if (!confirm(warnText)) return;

const response = await fetch(`http://localhost:8080/api/group/${groupId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();
if (data.code === 200) {
  console.log(isOwner ? '群聊已解散' : '已退出群聊');
  refreshGroupList();
}
```

---

## 📦 统一响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

**常见状态码**：
- `200` - 成功
- `201` - 创建成功
- `400` - 参数错误
- `401` - 未授权（跳转登录）
- `500` - 服务器错误

---

## 🔐 请求头规范

```javascript
// 需要认证
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}'
}

// 不需要认证（登录、注册）
{
  'Content-Type': 'application/json'
}
```

---

## 📊 数据模型

### UserInfo

```typescript
interface UserInfo {
  userId: number;           // 用户ID
  userAccount: string;      // 账号（8位数字）
  userName: string;         // 用户名（≤16字符）
  createDate: string;       // 创建日期（YYYY-MM-DD）
  isOnline: boolean;        // 是否在线
  isAvailable: boolean;     // 是否可用
}
```

---

## ⚠️ 错误处理模板

```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (data.code === 401) {
      localStorage.clear();
      window.location.href = '/login.html';
      return;
    }
    
    if (data.code === 200 || data.code === 201) {
      return { success: true, data: data.data };
    }
    
    return { success: false, message: data.message };
  } catch (error) {
    return { success: false, message: '网络错误' };
  }
}
```

---

## 🎯 关键要点

1. ✅ **Token管理**：登录保存，请求携带，登出清除
2. ✅ **心跳机制**：每2分钟发送一次，保持在线状态
3. ✅ **错误处理**：401状态码跳转到登录页
4. ✅ **搜索功能**：支持用户名模糊搜索和账号精确搜索（关键词≤20字符，每页≤50条）
5. ✅ **密码加密**：后端使用BCrypt，前端可直接传明文
6. ✅ **密码修改**：修改密码后所有旧Token自动失效，需重新登录
7. ✅ **好友系统**：支持好友列表、未读消息、聊天记录查询、好友申请流程、发送消息
8. ✅ **好友申请**：支持发起申请、同意/拒绝、查询收到/发出的申请
9. ✅ **删除好友**：支持删除好友并清理聊天记录，操作不可逆
10. ✅ **群组系统**：支持创建群聊、群列表、群详情、解散/退出
11. ✅ **WebSocket**：实时消息推送、好友上线/下线通知、消息已读回执、好友申请通知

---

## 📡 WebSocket 快速示例

```javascript
// 1. 建立 WebSocket 连接
const token = localStorage.getItem('chat_token');
const ws = new WebSocket(`ws://localhost:8080/ws/chat?token=${token}`);

// 2. 监听消息
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'PRIVATE_MESSAGE':
      console.log(`收到 ${msg.senderName} 的消息: ${msg.content}`);
      break;
    case 'FRIEND_ONLINE':
      console.log(`${msg.senderName} 上线了`);
      break;
    case 'FRIEND_OFFLINE':
      console.log(`${msg.senderName} 下线了`);
      break;
    case 'FRIEND_REQUEST':
      console.log(`${msg.senderName} 请求加你为好友: ${msg.requestMessage || ''}`);
      break;
    case 'FRIEND_REQUEST_RESULT':
      console.log(`${msg.senderName} ${msg.content === 'accepted' ? '同意了' : '拒绝了'}你的好友申请`);
      break;
    case 'GROUP_MESSAGE':
      console.log(`群聊 ${msg.groupId} - ${msg.senderName}: ${msg.content}`);
      break;
    case 'GROUP_MEMBER_JOIN':
      console.log(`${msg.senderName} 加入了群聊 ${msg.groupId}`);
      break;
    case 'GROUP_MEMBER_LEAVE':
      console.log(`${msg.senderName} 离开了群聊 ${msg.groupId}`);
      break;
  }
};

// 4. 发送群聊消息
ws.send(JSON.stringify({
  type: 'GROUP_MESSAGE',
  groupId: 1,
  content: '大家好'
}));

// 3. 发送消息
ws.send(JSON.stringify({
  type: 'PRIVATE_MESSAGE',
  receiverId: 2,
  content: '你好'
}));
```

> 详细文档：[WEBSOCKET_UPGRADE.md](./WEBSOCKET_UPGRADE.md)

---

## 📚 完整文档

详细文档请查看：[API_DOCUMENTATION.md](API_DOCUMENTATION.md)

包含：
- 所有接口的详细说明
- 完整的请求响应示例
- 错误码说明
- 开发环境配置
- 常见问题FAQ

---

**快速参考手册 v1.9** | 更新于 2026-06-17
