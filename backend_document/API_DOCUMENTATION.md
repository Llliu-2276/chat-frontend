# 📘 ChatBackend 前后端对接文档

> **文档版本**: v2.8  
> **更新日期**: 2026-06-22  
> **适用对象**: 前端开发工程师  
> **后端技术栈**: Spring Boot 4.0.2 + JWT + Redis + MySQL

---

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 功能模块说明](#2-功能模块说明)
- [3. 已实现的API接口](#3-已实现的api接口)
- [4. 计划中的API接口](#4-计划中的api接口)
- [5. 技术架构](#5-技术架构)
- [6. 前后端交互规范](#6-前后端交互规范)
- [7. 数据模型说明](#7-数据模型说明)
- [8. 示例请求和响应](#8-示例请求和响应)
- [9. 错误码说明](#9-错误码说明)
- [10. 开发环境配置](#10-开发环境配置)
- [11. 测试工具推荐](#11-测试工具推荐)
- [12. 常见问题FAQ](#12-常见问题faq)

---

## 1. 项目概述

### 1.1 项目简介

**ChatBackend** 是一个基于 Spring Boot 的聊天系统后端服务，为前端应用提供完整的用户管理、身份认证、在线状态管理、用户搜索等核心功能。

### 1.2 项目目标

- ✅ 提供安全可靠的用户认证体系（JWT + Redis）
- ✅ 支持用户资料的完整管理
- ✅ 实现实时在线状态追踪（心跳机制）
- ✅ 提供用户搜索和发现功能
- ✅ 实现好友系统（好友列表、消息管理、聊天记录、撤回消息、消息搜索）
- ✅ WebSocket 实时通信（消息推送、在线状态通知、已读回执、消息撤回）
- ✅ 群组系统（群聊CRUD、成员管理、群主转让、踢人、入群审批、群通知）
- ✅ 用户拉黑系统
- ✅ 接口限流

### 1.3 基础信息

| 项目 | 说明 |
|-----|------|
| **项目名称** | Chat |
| **后端框架** | Spring Boot 4.0.2 |
| **Java版本** | JDK 17 |
| **API基础路径** | `http://localhost:8080/api` |
| **WebSocket 端点** | `ws://localhost:8080/ws/chat` |
| **数据库** | MySQL 8.0 |
| **缓存** | Redis 6.x |
| **认证方式** | JWT (JSON Web Token) |
| **跨域配置** | 已配置CORS，支持跨域请求 |
| **Swagger UI** | [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html) |
| **在线API查询** | [Swagger UI - auth-controller](http://localhost:8080/swagger-ui/index.html#/auth-controller/userRegister) |

---

## 2. 功能模块说明

### 2.1 已实现模块

#### 📦 模块1：用户认证模块

**功能描述**：处理用户注册、登录、登出及Token管理

**已实现功能**：
- ✅ 用户注册（生成8位数字账号）
- ✅ 用户登录（返回JWT Token）
- ✅ 用户登出（Token黑名单机制）
- ✅ Token版本控制（修改密码后旧Token自动失效）
- ✅ Token自动续期（心跳机制）
- ✅ 密码加密存储（BCrypt）
- ✅ WebSocket 握手安全校验（Token黑名单 + 心跳状态）
- ✅ 认证失败统一JSON响应

**前端配合要点**：
- 登录成功后保存Token到localStorage
- 所有需要认证的请求携带Token
- 登出时清除本地Token

---

#### 📦 模块2：用户资料管理

**功能描述**：用户个人信息的查看、修改和密码管理

**已实现功能**：
- ✅ 获取当前用户信息
- ✅ 根据用户ID查询用户信息
- ✅ 修改用户名
- ✅ 修改密码（需验证旧密码，修改后所有Token自动失效）

**前端配合要点**：
- 个人信息页面调用 `/api/user/profile/me`
- 修改信息后更新本地缓存
- 密码修改需输入旧密码和新密码
- **密码修改后需重新登录**（所有旧Token自动失效）

---

#### 📦 模块3：在线状态管理

**功能描述**：通过心跳机制管理用户在线状态

**已实现功能**：
- ✅ 心跳接口（定期发送保持在线）
- ✅ 在线用户数量统计
- ✅ 自动离线检测（5分钟无心跳）
- ✅ 登录/登出状态同步

**前端配合要点**：
- 登录后启动心跳定时器（建议2分钟一次）
- 页面关闭前发送登出信号
- 显示在线用户数量

---

#### 📦 模块4：用户搜索

**功能描述**：支持按用户名或账号搜索用户

**已实现功能**：
- ✅ 用户名模糊搜索
- ✅ 账号精确搜索（8位数字）
- ✅ 分页查询支持
- ✅ 搜索结果排序

**前端配合要点**：
- 搜索框支持实时搜索或点击搜索
- 展示分页结果
- 显示搜索到的用户卡片

---

#### 📦 模块5：好友系统

**功能描述**：好友关系管理、消息收发、聊天记录查询

**已实现功能**：
- ✅ 好友列表查询（含在线状态）
- ✅ 未读消息查询（自动标记已读）
- ✅ 聊天记录查询（分页支持）
- ✅ 好友在线状态实时获取
- ✅ 添加好友（防重复、防自加）
- ✅ 好友间发送消息（关系验证、内容校验）
- ✅ 好友申请双向确认机制（发起/处理/查询/取消）
- ✅ 好友申请 WebSocket 实时通知
- ✅ 删除好友（含聊天记录清理）
- ✅ 撤回私聊消息（2分钟内）
- ✅ 搜索私聊消息

#### 📦 模块6：群组系统

**功能描述**：群组创建、列表查询、详情查看、解散/退出

**已实现功能**：
- ✅ 创建群聊（自动生成8位群账号）
- ✅ 获取用户群聊列表
- ✅ 查看群聊详情（含成员列表）
- ✅ 群主解散群聊（清除成员和聊天记录）
- ✅ 成员退出群聊
- ✅ 发送群聊消息
- ✅ 群聊天记录查询（分页，含发送者信息）
- ✅ 群成员列表查询
- ✅ WebSocket 群聊消息实时广播
- ✅ 群成员变动 WebSocket 实时通知（加入/退出/踢出/群解散）
- ✅ 群主转让
- ✅ 邀请好友入群
- ✅ 加入群聊审批制（群主审批入群申请）
- ✅ 群聊通知历史（离线可查）
- ✅ 撤回群聊消息（2分钟内）
- ✅ 搜索群聊消息
- ✅ 编辑群聊信息

**前端配合要点**：
- 好友列表页面展示在线状态
- 定期轮询未读消息或WebSocket推送
- 聊天记录支持分页加载
- 搜索结果页支持添加好友按钮或发送申请按钮
- 好友申请管理页面（收到的申请、发出的申请）

---

## 3. 已实现的API接口

### 3.1 认证相关接口

#### 3.1.1 用户登录

```
POST /api/auth/login
```

**请求参数**（Body - JSON）：
```json
{
  "userAccount": "12345678",
  "password": "yourpassword"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "userAccount": "12345678",
    "userName": "测试用户",
    "createDate": "2024-01-01",
    "isOnline": true,
    "isAvailable": true,
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

**认证要求**：❌ 不需要Token

**前端处理**：
1. 保存 `data.token` 到 localStorage
2. 保存用户信息到 localStorage
3. 启动心跳定时器
4. 跳转到聊天页面

---

#### 3.1.2 用户注册

```
POST /api/auth/register
```

**请求参数**（Body - JSON）：
```json
{
  "userName": "新用户",
  "password": "yourpassword"
}
```

**响应数据**：
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "userId": 2,
    "userAccount": "87654321",
    "userName": "新用户"
  }
}
```

**认证要求**：❌ 不需要Token

**注意事项**：
- 用户名最多16个字符
- 密码最多32个字符
- 系统自动生成8位数字账号
- **注册成功后前端应展示系统生成的账号（`userAccount`），引导用户记录或直接用于登录**

---

#### 3.1.3 用户登出

```
POST /api/auth/logout
```

**请求参数**：无（从Token中获取用户信息）

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "登出成功",
  "data": null
}
```

**认证要求**：✅ 需要Token

**前端处理**：
1. 调用接口
2. 清除 localStorage 中的 Token
3. 跳转到登录页

---

### 3.2 用户资料接口

#### 3.2.1 获取当前用户信息

```
GET /api/user/profile/me
```

**请求参数**：无

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "userId": 1,
    "userAccount": "12345678",
    "userName": "测试用户",
    "createDate": "2024-01-01",
    "isOnline": true,
    "isAvailable": true
  }
}
```

**认证要求**：✅ 需要Token

**用途**：个人中心页面、头像显示、用户信息展示

---

#### 3.2.2 根据ID获取用户信息

```
GET /api/user/profile/info/{userId}
```

**路径参数**：
- `userId` (Long) - 用户ID

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "userId": 2,
    "userAccount": "87654321",
    "userName": "其他用户",
    "createDate": "2024-01-02",
    "isOnline": false,
    "isAvailable": true
  }
}
```

**认证要求**：✅ 需要Token

**用途**：查看其他用户信息、用户详情页

---

#### 3.2.3 修改用户名

```
PUT /api/user/profile/info
```

**请求参数**（Body - JSON）：
```json
{
  "userName": "新用户名"
}
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "userId": 1,
    "userAccount": "12345678",
    "userName": "新用户名",
    "createDate": "2024-01-01",
    "isOnline": true,
    "isAvailable": true
  }
}
```

**认证要求**：✅ 需要Token

**注意事项**：
- 用户名最多16个字符
- 只能修改自己的用户名

---

#### 3.2.4 修改密码

```
POST /api/user/profile/password/change
```

**请求参数**（Body - JSON）：
```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码"
}
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "密码修改成功，请重新登录",
  "data": null
}
```

**认证要求**：✅ 需要Token

**注意事项**：
- 必须正确输入旧密码
- 新密码最多32个字符
- **修改密码后，该用户所有已发放的Token将自动失效**（Token版本控制机制），需要重新登录
- 建议前端增加密码强度验证

---

### 3.3 用户搜索接口

#### 3.3.1 搜索用户

```
GET /api/user/search
```

**请求参数**（Query Parameters）：
- `keyword` (String, 必填) - 搜索关键词（1-20字符，不能为空）
- `page` (int, 可选, 默认1) - 页码（从1开始）
- `size` (int, 可选, 默认10) - 每页数量（1-50之间）

**请求头**：
```
Authorization: Bearer {token}
```

**请求示例**：
```
GET /api/user/search?keyword=测试&page=1&size=10
```

**响应数据**：
```json
{
  "code": 200,
  "message": "搜索成功",
  "data": {
    "content": [
      {
        "userId": 1,
        "userAccount": "12345678",
        "userName": "测试用户",
        "createDate": "2024-01-01",
        "isOnline": true,
        "isAvailable": true
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10
    },
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true
  }
}
```

**认证要求**：✅ 需要Token

**参数约束**：
- 搜索关键词不能为空，长度不超过20字符
- 每页大小必须在1-50之间
- 页码必须 ≥ 1

**搜索规则**：
1. 首先按用户名模糊搜索
2. 如果无结果且关键词为8位数字，则按账号精确搜索

**前端处理**：
- 展示分页控件
- 显示用户卡片列表
- 支持点击用户查看详情

---

#### 3.3.2 获取在线用户数量

```
GET /api/user/search/count
```

**请求参数**：无

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取成功",
  "data": 25
}
```

**认证要求**：❌ 不需要Token（公开接口）

**用途**：显示系统在线人数

---

### 3.4 心跳接口

#### 3.4.1 发送心跳

```
POST /api/user/heartbeat
```

**请求参数**：无

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "心跳更新成功",
  "data": null
}
```

**认证要求**：✅ 需要Token

**前端实现建议**：
```javascript
// 登录成功后启动心跳
const heartbeatInterval = setInterval(() => {
    fetch('http://localhost:8080/api/user/heartbeat', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
}, 2 * 60 * 1000); // 每2分钟发送一次

// 页面关闭前清理
window.addEventListener('beforeunload', () => {
    clearInterval(heartbeatInterval);
});
```

---

### 3.5 好友模块接口

#### 3.5.1 获取好友列表

```
GET /api/friends/list?page=1&size=20
```

**请求参数**：

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | int | ❌ | 1 | 页码 |
| size | int | ❌ | 20 | 每页大小（1-100） |

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**（分页）：
```json
{
  "code": 200,
  "message": "获取好友列表成功",
  "data": {
    "content": [
      {
        "userId": 2,
        "userAccount": "87654321",
        "userName": "张三",
        "isOnline": true,
        "isAvailable": true,
        "createDate": "2024-01-15",
        "lastMessage": "好的明天见",
        "lastMessageTime": "2026-06-18T10:30:00",
        "unreadCount": 3
      }
    ],
    "totalElements": 50,
    "totalPages": 3,
    "numberOfElements": 20
  }
}
```

**认证要求**：✅ 需要Token

**用途**：好友列表页面、联系人展示

**前端处理**：
- 展示好友卡片列表，含最后消息预览和未读计数
- 显示在线状态（绿色/灰色圆点）
- 支持点击好友查看聊天记录

**注意事项**：
- 在线状态从 Redis 实时获取
- 如果用户暂无好友，返回空数组 `[]`

---

#### 3.5.2 获取未读消息

```
GET /api/friends/messages/unread
```

**请求参数**：无

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取未读消息成功",
  "data": [
    {
      "recordId": 101,
      "senderId": 2,
      "senderName": "张三",
      "receiverId": 1,
      "content": "你好，在吗？",
      "sendTime": "2024-06-01T14:30:00",
      "readStatus": false,
      "friendRelationId": 10
    },
    {
      "recordId": 102,
      "senderId": 3,
      "senderName": "李四",
      "receiverId": 1,
      "content": "明天一起吃饭吗？",
      "sendTime": "2024-06-01T13:15:00",
      "readStatus": false,
      "friendRelationId": 11
    }
  ]
}
```

**认证要求**：✅ 需要Token

**用途**：消息通知、未读消息红点提示

**前端处理**：
1. 调用接口获取未读消息
2. 展示消息列表（按时间倒序）
3. 返回后后端自动标记为已读
4. 更新 UI 上的未读红点

**注意事项**：
- 消息按发送时间倒序排列
- 接口返回后自动标记所有未读消息为已读
- 如果暂无未读消息，返回空数组 `[]`

**实现建议**：
```javascript
// 定期轮询未读消息（每30秒）
setInterval(async () => {
  const response = await fetch('http://localhost:8080/api/friends/messages/unread', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  if (data.code === 200 && data.data.length > 0) {
    // 更新未读消息红点
    updateUnreadBadge(data.data.length);
    // 展示消息通知
    showMessageNotifications(data.data);
  }
}, 30 * 1000);
```

---

#### 3.5.3 获取聊天记录（分页）

```
GET /api/friends/chat-history/{friendId}
```

**路径参数**：
- `friendId` (Long) - 好友用户ID

**请求参数**（Query Parameters）：
- `page` (int, 可选, 默认1) - 页码（从1开始）
- `size` (int, 可选, 默认20) - 每页数量（最大100）

**请求头**：
```
Authorization: Bearer {token}
```

**请求示例**：
```
GET /api/friends/chat-history/2?page=1&size=20
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取聊天记录成功",
  "data": {
    "content": [
      {
        "recordId": 105,
        "senderId": 1,
        "senderName": "我",
        "receiverId": 2,
        "receiverName": "张三",
        "content": "好的，明天见！",
        "sendTime": "2024-06-01T15:45:00",
        "readStatus": true
      },
      {
        "recordId": 104,
        "senderId": 2,
        "senderName": "张三",
        "receiverId": 1,
        "receiverName": "我",
        "content": "明天下午3点怎么样？",
        "sendTime": "2024-06-01T15:30:00",
        "readStatus": true
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 20
    },
    "totalElements": 25,
    "totalPages": 2,
    "last": false,
    "first": true
  }
}
```

**认证要求**：✅ 需要Token

**用途**：聊天页面、历史消息加载

**前端处理**：
- 首次加载第1页消息
- 滚动到顶部时加载上一页
- 展示发送者/接收者标识（左/右对齐）
- 显示已读状态（双勾/单勾）

**注意事项**：
- 消息按发送时间倒序排列（最新的在前面）
- 必须先建立好友关系才能查询聊天记录
- 如果好友关系不存在，返回 404 错误

**分页处理示例**：
```javascript
let currentPage = 1;
const pageSize = 20;

async function loadChatHistory(friendId) {
  const response = await fetch(
    `http://localhost:8080/api/friends/chat-history/${friendId}?page=${currentPage}&size=${pageSize}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await response.json();
  
  if (data.code === 200) {
    const messages = data.data.content;
    const totalPages = data.data.totalPages;
    
    // 渲染消息列表
    renderMessages(messages);
    
    // 判断是否还有更多消息
    if (currentPage >= totalPages) {
      disableLoadMore();
    }
  }
}

// 滚动到顶部时加载上一页
chatContainer.addEventListener('scroll', (e) => {
  if (e.target.scrollTop === 0) {
    currentPage++;
    loadChatHistory(friendId);
  }
});
```

**错误响应示例**：
```json
{
  "code": 404,
  "message": "好友关系不存在",
  "data": null
}
```

---

#### 3.5.5 发送好友消息

```
POST /api/friends/send-message
```

**请求参数**（Body - JSON）：
```json
{
  "receiverId": 2,
  "content": "你好，在吗？"
}
```

**字段说明**：
- `receiverId` (Long, 必填) - 接收者的用户ID
- `content` (String, 必填) - 消息内容（最大2000字符）

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "code": 201,
  "message": "消息发送成功",
  "data": null
}
```

**认证要求**：✅ 需要Token

**用途**：聊天页面发送消息、私信功能

**前端处理**：
1. 在聊天输入框中输入消息内容
2. 点击发送按钮或按Enter键发送
3. 成功后将消息追加到聊天列表顶部
4. 接收者通过未读消息接口拉取新消息

**错误响应示例**：

消息内容为空：
```json
{
  "code": 400,
  "message": "消息内容不能为空",
  "data": null
}
```

接收者不存在：
```json
{
  "code": 404,
  "message": "接收者用户不存在",
  "data": null
}
```

非好友关系：
```json
{
  "code": 403,
  "message": "非好友关系，无法发送消息",
  "data": null
}
```

**注意事项**：
- 发送者和接收者必须已经是好友关系
- 消息默认状态为未读，接收者拉取后自动标记为已读
- 消息发送时间由数据库自动填充
- 消息内容前后空格会被自动去除

**前端请求示例**：
```javascript
async function sendMessage(receiverId, content) {
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
    // 将消息追加到聊天列表
    appendMessage({
      senderId: currentUserId,
      senderName: currentUser.userName,
      content: content,
      sendTime: new Date().toISOString(),
      readStatus: false
    });
    // 清空输入框
    clearInput();
  } else {
    alert(data.message);
  }
}
```

---

#### 3.5.6 发起好友申请

```
POST /api/friends/request
```

**请求参数**（Body - JSON）：
```json
{
  "receiverId": 2,
  "message": "你好，我是张三，希望加你为好友"
}
```

**字段说明**：
- `receiverId` (Long, 必填) - 目标用户ID
- `message` (String, 可选) - 申请留言（最大200字符）

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "code": 201,
  "message": "好友申请发送成功",
  "data": null
}
```

**认证要求**：✅ 需要Token

**用途**：搜索结果页发送好友申请、用户详情页申请加好友

**前端处理**：
1. 在搜索结果或用户详情页显示“发送好友申请”按钮
2. 弹出填写申请留言的对话框（可选）
3. 发送成功后按钮变为“申请已发送”
4. 被申请人通过 WebSocket 实时收到 `FRIEND_REQUEST` 通知

**错误响应示例**：

不能向自己发送申请：
```json
{
  "code": 400,
  "message": "不能向自己发送好友申请",
  "data": null
}
```

已是好友：
```json
{
  "code": 409,
  "message": "你们已经是好友，无需再次申请",
  "data": null
}
```

已有待处理申请：
```json
{
  "code": 409,
  "message": "已有待处理的好友申请，请勿重复发送",
  "data": null
}
```

**注意事项**：
- 申请留言前后空格会被自动去除
- 系统会通过 WebSocket 实时通知被申请人
- 好友添加必须通过申请-同意流程，不存在直接添加好友的接口
- 好友申请记录说明：
  - 待处理申请（status=0）有唯一约束，同一对用户之间只能存在一条待处理申请
  - 已处理的申请（status=1/2）会保留在数据库中用于历史记录查询
  - 系统每天凌晨2点自动清理超过30天的已处理记录，避免数据冗余
  - 解除好友关系后，可以重新发起好友申请（因为待处理申请的唯一约束只限制 status=0 的记录）

**前端请求示例**：
```javascript
async function sendFriendRequest(receiverId, message) {
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
    alert('好友申请已发送！');
    updateRequestButton(receiverId, '申请已发送');
  } else {
    alert(data.message);
  }
}
```

---

#### 3.5.7 处理好友申请（同意/拒绝）

```
POST /api/friends/request/handle
```

**请求参数**（Body - JSON）：
```json
{
  "requestId": 1,
  "accept": true
}
```

**字段说明**：
- `requestId` (Long, 必填) - 申请ID
- `accept` (Boolean, 必填) - true表示同意，false表示拒绝

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**（同意）：
```json
{
  "code": 200,
  "message": "已同意好友申请",
  "data": null
}
```

**成功响应**（拒绝）：
```json
{
  "code": 200,
  "message": "已拒绝好友申请",
  "data": null
}
```

**认证要求**：✅ 需要Token

**用途**：好友申请管理页面，处理收到的申请

**前端处理**：
1. 在收到的申请列表中显示“同意”和“拒绝”按钮
2. 同意后自动建立好友关系，更新UI
3. 申请人通过 WebSocket 实时收到 `FRIEND_REQUEST_RESULT` 通知

**错误响应示例**：

非接收方无权处理：
```json
{
  "code": 403,
  "message": "您不是该申请的接收方，无权处理",
  "data": null
}
```

申请已处理：
```json
{
  "code": 409,
  "message": "该申请已被处理，无法重复操作",
  "data": null
}
```

**注意事项**：
- 只有申请的接收方才有权处理
- 同意时自动创建 `friend_relation` 好友关系记录
- 处理结果通过 WebSocket 实时通知申请人

**前端请求示例**：
```javascript
async function handleFriendRequest(requestId, accept) {
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
    alert(accept ? '已同意好友申请' : '已拒绝好友申请');
    // 刷新申请列表
    refreshReceivedRequests();
    // 如果同意，刷新好友列表
    if (accept) refreshFriendList();
  } else {
    alert(data.message);
  }
}
```

---

#### 3.5.8 查询收到的好友申请

```
GET /api/friends/request/received
```

**请求参数**（Query Parameters）：
- `status` (Integer, 可选, 默认0) - 申请状态筛选（0-待处理, 1-已同意, 2-已拒绝）
- `page` (int, 可选, 默认1) - 页码（从1开始）
- `size` (int, 可选, 默认20) - 每页数量（最大100）

**请求头**：
```
Authorization: Bearer {token}
```

**请求示例**：
```
GET /api/friends/request/received?status=0&page=1&size=20
```

**响应数据**：
```json
{
  "code": 200,
  "message": "查询收到的好友申请成功",
  "data": {
    "content": [
      {
        "requestId": 1,
        "senderId": 3,
        "senderName": "李四",
        "senderAccount": "11223344",
        "receiverId": 1,
        "receiverName": "张三",
        "receiverAccount": "87654321",
        "message": "你好，我是李四",
        "status": 0,
        "statusDescription": "待处理",
        "createTime": "2026-06-10T10:30:00",
        "updateTime": "2026-06-10T10:30:00"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 20
    },
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true
  }
}
```

**认证要求**：✅ 需要Token

**用途**：好友申请管理页面 - “收到的申请”标签

**前端处理**：
- 默认展示待处理申请（status=0）
- 支持切换状态筛选（全部/待处理/已同意/已拒绝）
- 待处理的申请显示“同意”和“拒绝”按钮

**注意事项**：
- 申请按创建时间倒序排列（最新的在前）
- 返回数据包含发送方和接收方的用户名和账号信息

---

#### 3.5.9 查询发出的好友申请

```
GET /api/friends/request/sent
```

**请求参数**（Query Parameters）：
- `page` (int, 可选, 默认1) - 页码（从1开始）
- `size` (int, 可选, 默认20) - 每页数量（最大100）

**请求头**：
```
Authorization: Bearer {token}
```

**请求示例**：
```
GET /api/friends/request/sent?page=1&size=20
```

**响应数据**：
```json
{
  "code": 200,
  "message": "查询发出的好友申请成功",
  "data": {
    "content": [
      {
        "requestId": 2,
        "senderId": 1,
        "senderName": "张三",
        "senderAccount": "87654321",
        "receiverId": 5,
        "receiverName": "王五",
        "receiverAccount": "55667788",
        "message": "希望加你为好友",
        "status": 0,
        "statusDescription": "待处理",
        "createTime": "2026-06-10T11:00:00",
        "updateTime": "2026-06-10T11:00:00"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 20
    },
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true
  }
}
```

**认证要求**：✅ 需要Token

**用途**：好友申请管理页面 - “发出的申请”标签

**前端处理**：
- 展示已发出的所有申请
- 显示申请状态（待处理/已同意/已拒绝）

**注意事项**：
- 申请按创建时间倒序排列
- 包含接收方的用户名和账号信息
- 发出的申请不支持撤回，一旦发送无法取消

---

#### 3.5.10 删除好友

```
DELETE /api/friends/remove/{friendId}
```

**路径参数**：
- `friendId` (Long) - 要删除的好友用户ID

**请求头**：
```
Authorization: Bearer {token}
```

**请求示例**：
```
DELETE /api/friends/remove/2
```

**成功响应**：
```json
{
  "code": 200,
  "message": "删除好友成功",
  "data": null
}
```

**认证要求**：✅ 需要Token

**用途**：好友列表页删除好友、解除好友关系

**前端处理**：
1. 在好友列表或好友详情页显示"删除好友"按钮
2. 点击后弹出确认对话框
3. 确认后调用删除接口
4. 成功后刷新好友列表

**错误响应示例**：

好友ID为空：
```json
{
  "code": 400,
  "message": "好友ID不能为空",
  "data": null
}
```

不能删除自己：
```json
{
  "code": 400,
  "message": "不能删除自己",
  "data": null
}
```

好友关系不存在：
```json
{
  "code": 404,
  "message": "好友关系不存在",
  "data": null
}
```

**注意事项**：
- 删除好友会**同时清理双方的所有聊天记录**，操作不可逆
- 整个操作在事务中执行，任一步骤失败均回滚
- 解除好友关系后，可以重新发起好友申请
- 只能删除自己的好友，不能删除他人的好友关系

**前端请求示例**：
```javascript
async function removeFriend(friendId) {
  // 弹出确认对话框
  if (!confirm('确定要删除该好友吗？聊天记录将被清除且无法恢复。')) {
    return;
  }

  const response = await fetch(`http://localhost:8080/api/friends/remove/${friendId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();

  if (data.code === 200) {
    alert('好友已删除');
    // 刷新好友列表
    refreshFriendList();
  } else {
    alert(data.message);
  }
}
```

#### 3.5.11 撤回私聊消息

```
POST /api/friends/message/{recordId}/recall
```

**请求参数**（路径）:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| recordId | Long | ✅ | 消息记录ID |

**响应数据**：
```json
{
  "code": 200,
  "message": "消息已撤回",
  "data": null
}
```

**认证要求**: ✅  
**用途**: 撤回自己发送的私聊消息（2分钟内）

**注意事项**：
- 仅消息发送者可撤回，超过2分钟无法撤回
- 已撤回的消息不再出现在历史记录中

#### 3.5.12 搜索私聊消息

```
GET /api/friends/chat-history/{friendId}/search?keyword=你好&page=1&size=20
```

**请求参数**:

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| friendId | Long | ✅ | - | 好友用户ID（路径） |
| keyword | String | ✅ | - | 搜索关键词 |
| page | int | ❌ | 1 | 页码 |
| size | int | ❌ | 20 | 每页大小 |

**响应数据**：分页返回含关键词的聊天记录
**认证要求**: ✅

---

### 3.6 群组模块接口

#### 3.6.1 创建群聊

```
POST /api/group/create
```

**请求参数**（Body - JSON）：
```json
{
  "groupName": "我的群聊"
}
```

**字段说明**：
- `groupName` (String, 必填) - 群名称（最大16字符）

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 201,
  "message": "群聊创建成功",
  "data": {
    "groupId": 1,
    "account": "12345678",
    "groupName": "我的群聊",
    "ownerName": "张三",
    "memberCount": 1,
    "createDate": "2026-06-15",
    "isOwner": true
  }
}
```

**认证要求**：✅ 需要Token

**用途**：创建新群聊，创建者自动成为群主

**注意事项**：
- 群名称不能为空，不能超过16个字符
- 群账号由系统自动生成8位数字
- 创建者自动成为群主和第一个成员

---

#### 3.6.2 获取群聊列表

```
GET /api/group/list
```

**请求参数**：无

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取群聊列表成功",
  "data": [
    {
      "groupId": 1,
      "account": "12345678",
      "groupName": "我的群聊",
      "ownerName": "张三",
      "memberCount": 5,
      "createDate": "2026-06-15",
      "isOwner": true
    },
    {
      "groupId": 2,
      "account": "87654321",
      "groupName": "项目讨论组",
      "ownerName": "李四",
      "memberCount": 12,
      "createDate": "2026-06-10",
      "isOwner": false
    }
  ]
}
```

**认证要求**：✅ 需要Token

**用途**：群聊列表页面

**前端处理**：
- 展示群聊卡片列表
- 显示成员数量和群主名称
- 根据isOwner显示不同操作按钮（群主可解散，非群主可退出）

---

#### 3.6.3 获取群聊详情

```
GET /api/group/info/{groupId}
```

**路径参数**：
- `groupId` (Long) - 群组ID

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取群聊详情成功",
  "data": {
    "groupId": 1,
    "account": "12345678",
    "groupName": "我的群聊",
    "ownerId": 1,
    "ownerName": "张三",
    "memberCount": 2,
    "createDate": "2026-06-15",
    "memberList": [
      {
        "userId": 1,
        "userName": "张三",
        "userAccount": "11111111",
        "isOwner": true,
        "joinDate": "2026-06-15"
      },
      {
        "userId": 2,
        "userName": "李四",
        "userAccount": "22222222",
        "isOwner": false,
        "joinDate": "2026-06-15"
      }
    ]
  }
}
```

**认证要求**：✅ 需要Token

**用途**：群聊详情页面，展示群信息、成员列表

**权限规则**：
- 群成员可查看任何群详情
- 非成员仅可查看公开群（isVisible=true）
- 非公开群非成员访问返回 403

---

#### 3.6.4 解散或退出群聊

```
DELETE /api/group/{groupId}
```

**路径参数**：
- `groupId` (Long) - 群组ID

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应（群主解散）**：
```json
{
  "code": 200,
  "message": "群聊已解散",
  "data": null
}
```

**成功响应（成员退出）**：
```json
{
  "code": 200,
  "message": "已退出群聊",
  "data": null
}
```

**认证要求**：✅ 需要Token

**用途**：群聊设置页面的解散/退出按钮

**业务规则**：
- 群主操作：解散群聊（删除所有成员关系 + 清空聊天记录 + 删除群聊信息）
- 非群主操作：仅退出群聊（删除自己的成员关系）
- 整个操作具有事务性

**前端处理**：
```javascript
async function dissolveOrLeaveGroup(groupId, isOwner) {
  const actionText = isOwner ? '解散群聊' : '退出群聊';
  const warnText = isOwner
    ? '确定要解散该群聊吗？所有成员将被移除，聊天记录将被清除且无法恢复。'
    : '确定要退出该群聊吗？';

  if (!confirm(warnText)) return;

  const response = await fetch(`http://localhost:8080/api/group/${groupId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();

  if (data.code === 200) {
    alert(isOwner ? '群聊已解散' : '已退出群聊');
    // 刷新群聊列表
    refreshGroupList();
  } else {
    alert(data.message);
  }
}
```

**错误响应示例**：

群聊不存在：
```json
{
  "code": 404,
  "message": "群聊不存在",
  "data": null
}
```

非群成员：
```json
{
  "code": 403,
  "message": "您不是该群聊的成员",
  "data": null
}
```

#### 3.6.5 Edit group information

```
PUT /api/group/{groupId}
Body: { "groupName": "新群名称" }
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | ✅ | 群组ID（路径） |
| groupName | String | ✅ | 新群名称（≤16字符） |

**响应**：`{"code":200, "message":"群聊信息更新成功", "data":{群聊信息VO}}`
**认证要求**：✅（仅群主）
**用途**：群设置页编辑群名称

---

#### 3.6.6 发送群聊消息

```
POST /api/group/message
```

**请求参数**（Body - JSON）：
```json
{
  "groupId": 1,
  "content": "大家好！"
}
```

**字段说明**：
- `groupId` (Long, 必填) - 目标群组ID
- `content` (String, 必填) - 消息内容（最大2000字符）

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "code": 201,
  "message": "消息发送成功",
  "data": null
}
```

**认证要求**：✅ 需要Token

**错误响应示例**：

非群成员：
```json
{
  "code": 403,
  "message": "您不是该群聊的成员，无法发送消息",
  "data": null
}
```

**注意事项**：
- 发送者必须是群成员
- 消息默认为纯文本，不包含已读状态
- 消息内容前后空格会被自动去除

---

#### 3.6.7 获取群聊天记录

```
GET /api/group/history/{groupId}
```

**路径参数**：
- `groupId` (Long) - 群组ID

**请求参数**（Query Parameters）：
- `page` (int, 可选, 默认1) - 页码（从1开始）
- `size` (int, 可选, 默认20) - 每页数量（最大100）

**请求头**：
```
Authorization: Bearer {token}
```

**请求示例**：
```
GET /api/group/history/1?page=1&size=20
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取群聊记录成功",
  "data": {
    "content": [
      {
        "recordId": 1,
        "senderId": 1,
        "senderName": "张三",
        "groupId": 1,
        "content": "大家好！",
        "sendTime": "2026-06-15T14:30:00"
      },
      {
        "recordId": 2,
        "senderId": 2,
        "senderName": "李四",
        "groupId": 1,
        "content": "你好！",
        "sendTime": "2026-06-15T14:31:00"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 20
    },
    "totalElements": 25,
    "totalPages": 2,
    "last": false,
    "first": true
  }
}
```

**认证要求**：✅ 需要Token

**权限规则**：
- 群成员可查看聊天记录
- 非成员仅可查看公开群的聊天记录

---

#### 3.6.8 获取群成员列表

```
GET /api/group/members/{groupId}
```

**路径参数**：
- `groupId` (Long) - 群组ID

**请求头**：
```
Authorization: Bearer {token}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "获取群成员列表成功",
  "data": [
    {
      "userId": 1,
      "userName": "张三",
      "userAccount": "11111111",
      "isOwner": true,
      "joinDate": "2026-06-15"
    },
    {
      "userId": 2,
      "userName": "李四",
      "userAccount": "22222222",
      "isOwner": false,
      "joinDate": "2026-06-15"
    }
  ]
}
```

**认证要求**：✅ 需要Token

**权限规则**：
- 群成员可查看成员列表
- 非成员仅可查看公开群的成员列表

**前端处理**：
- 展示成员卡片列表
- 群主标记特殊显示
- 可用于群成员管理功能

---

#### 3.6.9 搜索群聊

**接口**：`GET /api/group/search?keyword={关键词}&page={页码}&size={每页大小}`

**功能描述**：根据群名或群账号模糊搜索群聊，支持分页。不区分大小写，群名和群号均可匹配。

**请求参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | String | 是 | - | 搜索关键词（最长20字符） |
| page | Integer | 否 | 1 | 页码（从1开始） |
| size | Integer | 否 | 10 | 每页大小（1-50） |

**成功响应**：
```json
{
    "code": 200,
    "message": "搜索群聊成功",
    "data": {
        "content": [
            {
                "groupId": 1,
                "account": "12345678",
                "groupName": "技术交流群",
                "ownerName": "张三",
                "memberCount": 25,
                "createDate": "2026-06-15",
                "isOwner": false
            }
        ],
        "totalElements": 1,
        "totalPages": 1,
        "number": 0,
        "size": 10
    }
}
```

**错误响应**：
| code | message | 说明 |
|------|---------|------|
| 400 | 搜索关键词不能为空 | keyword为空 |
| 400 | 搜索关键词不能超过20个字符 | keyword超长 |
| 400 | 每页大小必须在1-50之间 | size参数越界 |

---

#### 3.6.10 加入群聊

**接口**：`POST /api/group/join/{groupId}`

**功能描述**：通过群组ID加入群聊。成功后推送群成员加入通知给所有群成员。

**路径参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | 是 | 群组ID（从搜索接口获取） |

**成功响应**：
```json
{
    "code": 201,
    "message": "加入群聊成功",
    "data": {
        "groupId": 1,
        "account": "12345678",
        "groupName": "技术交流群",
        "ownerName": "张三",
        "memberCount": 26,
        "createDate": "2026-06-15",
        "isOwner": false
    }
}
```

**WebSocket推送**：加入成功后，服务端向群内所有成员推送 `GROUP_MEMBER_JOIN` 通知：
```json
{
    "type": "GROUP_MEMBER_JOIN",
    "groupId": 1,
    "senderId": 2,
    "senderName": "李四",
    "sendTime": "2026-06-17T10:30:00"
}
```

**错误响应**：
| code | message | 说明 |
|------|---------|------|
| 404 | 群聊不存在 | groupId无效 |
| 409 | 您已经是该群聊的成员，无需重复加入 | 重复加入 |

---

#### 3.6.11 标记群聊消息已读

**接口**：`POST /api/group/{groupId}/read/{recordId}`

**功能描述**：将群聊中指定消息及之前的所有消息标记为已读。采用"最后已读消息ID"方案，recordId及之前的所有消息视为已读，之后的视为未读。也可通过 WebSocket 发送 `GROUP_READ_RECEIPT` 消息实现同等效果。

**路径参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | 是 | 群组ID |
| recordId | Long | 是 | 已读到的消息记录ID |

**成功响应**：
```json
{
    "code": 200,
    "message": "已读标记成功",
    "data": null
}
```

**错误响应**：
| code | message | 说明 |
|------|---------|------|
| 404 | 群聊不存在 | groupId无效 |
| 403 | 您不是该群聊的成员 | 非群成员无权标记 |

---

#### 3.6.12 获取群未读消息数

**接口**：`GET /api/group/{groupId}/unread-count`

**功能描述**：获取当前用户在指定群聊中的未读消息数量。计算方式：统计 `recordId > last_read_record_id` 的消息条数。

**路径参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | 是 | 群组ID |

**成功响应**：
```json
{
    "code": 200,
    "message": "获取未读数成功",
    "data": 5
}
```

**错误响应**：
| code | message | 说明 |
|------|---------|------|
| 403 | 您不是该群聊的成员 | 非群成员无权查询 |

### 3.6.13 踢出群成员

```
DELETE /api/group/{groupId}/member/{targetUserId}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | ✅ | 群组ID（路径） |
| targetUserId | Long | ✅ | 被踢出用户ID（路径） |

**响应**：`{"code":200, "message":"已将该成员移出群聊"}`
**认证**：✅（仅群主）

### 3.6.14 转让群主

```
POST /api/group/{groupId}/transfer/{targetUserId}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | ✅ | 群组ID（路径） |
| targetUserId | Long | ✅ | 新群主用户ID（路径） |

**响应**：`{"code":200, "message":"群主转让成功"}`
**认证**：✅（仅群主）

### 3.6.15 邀请好友入群

```
POST /api/group/{groupId}/invite/{inviteeId}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | ✅ | 群组ID（路径） |
| inviteeId | Long | ✅ | 被邀请人用户ID（路径） |

**响应**：`{"code":201, "message":"邀请好友入群成功", "data":{群聊信息VO}}`
**认证**：✅（邀请人须是群成员且被邀请人须是好友）

### 3.6.16 申请加入群聊（需审批）

```
POST /api/group/join/{groupId}
Body: { "message": "我想加入这个群" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | ✅ | 群组ID（路径） |
| message | String | ❌ | 申请留言（请求体，可选，最大200字符） |

> ⚠️ **v2.1 变更**：加入群聊改为审批制，不再直接入群。好友邀请入群（3.6.14）不受影响，仍直接加入。  
> ⚠️ **v2.7 变更**：message 参数由 URL 查询参数改为请求体传递，避免特殊字符 URL 编码截断。

**响应**：`{"code":201, "message":"入群申请已发送，等待群主审批"}`
**流程**：用户申请 → 群主收到 WebSocket `JOIN_GROUP_REQUEST` 推送 → 群主审批

### 3.6.17 查看入群申请

```
GET /api/group/{groupId}/join-requests?page=1&size=20
```

**响应**：分页返回入群申请，每项含 applicantId/Name、message、status、statusDescription（待处理/已同意/已拒绝）、createTime  
**认证**：✅（群主查看该群所有入群申请，不限状态；非群主只可查看自己在该群的入群申请）

### 3.6.18 处理入群申请

```
POST /api/group/{groupId}/join-request/{requestId}/handle
Body: { "requestId": 1, "accept": true }
```

**响应**：`{"code":200, "message":"已同意入群申请"}` 或 `"...已拒绝入群申请"`  
**认证**：✅（仅群主）

### 3.6.19 撤回群聊消息

```
POST /api/group/{groupId}/message/{recordId}/recall
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | Long | ✅ | 群组ID（路径） |
| recordId | Long | ✅ | 消息记录ID（路径） |

**响应**：`{"code":200, "message":"消息已撤回"}`
**限制**：仅发送者可撤回，2分钟内

### 3.6.20 搜索群聊消息

```
GET /api/group/history/{groupId}/search?keyword=你好&page=1&size=20
```

**参数**：keyword（必需，≤50字符）、page、size  
**响应**：分页返回含关键词的群聊消息

### 3.6.21 群聊通知列表

```
GET /api/group/{groupId}/notifications?page=1&size=20
```

**响应**：分页返回群通知（成员加入/退出、群主转让等），每项含 senderId/Name、targetUserId/Name、type、typeDescription、content、createTime  
**认证**：✅（群成员查看该群所有通知；非群成员只可查看与自己相关的通知，即 senderId 或 targetUserId 等于自己的记录）

---

### 3.7 用户拉黑模块接口

#### 3.7.1 拉黑用户

```
POST /api/user/block
Body: { "blockedId": 123 }
```

**响应**：`{"code":200, "message":"已拉黑该用户"}`
**效果**：被拉黑者无法向拉黑者发消息/好友申请

#### 3.7.2 取消拉黑

```
DELETE /api/user/block/{blockedId}
```

**响应**：`{"code":200, "message":"已取消拉黑"}`

#### 3.7.3 黑名单列表

```
GET /api/user/blocked-list
```

**响应**：`{"code":200, "data":[{"userId":123, "userName":"张三", "userAccount":"00010001", "createTime":"..."}]}`

---

### 3.8 接口限流

所有 `/api/**` 路径均启用限流（排除 `/api/auth/**`、`/ws/**`）。  
默认 60次/60秒/用户/路径，超限返回 `{"code":429, "message":"请求太频繁"}`．  
配置项：`rate-limit.max-requests=60`、`rate-limit.window-seconds=60`。

---

## 4. 计划中的API接口

> **v2.1 更新**：以下大部分功能已实现，剩余为第三优先级/低优先级计划。

以下接口计划在未来实现：

### 4.1 用户状态管理（管理员功能）

| 接口路径 | 方法 | 功能 | 优先级 |
|---------|------|------|-------|
| `PATCH /api/user/status/{userId}/enable` | PATCH | 启用用户账户 | 低 |
| `PATCH /api/user/status/{userId}/disable` | PATCH | 禁用用户账户 | 低 |
| `POST /api/user/status/force-offline` | POST | 强制用户离线 | 低 |

### 4.2 用户列表接口

| 接口路径 | 方法 | 功能 | 优先级 |
|---------|------|------|-------|
| `GET /api/user/list` | GET | 获取用户列表（分页和过滤） | 中 |

### 4.3 用户权限管理

| 接口路径 | 方法 | 功能 | 优先级 |
|---------|------|------|-------|
| `GET /api/user/roles` | GET | 获取当前用户角色和权限 | 低 |

### 4.4 安全相关接口

| 接口路径 | 方法 | 功能 | 优先级 |
|---------|------|------|-------|
| `POST /api/user/email/bind` | POST | 绑定邮箱 | 低 |
| `POST /api/user/phone/bind` | POST | 绑定手机 | 低 |

### 4.5 好友系统接口

| 接口路径 | 方法 | 功能 | 状态 |
|---------|------|------|------|
| `GET /api/friends/list` | GET | 获取好友列表（分页） | ✅ 已实现 |
| `GET /api/friends/messages/unread` | GET | 获取未读消息 | ✅ 已实现 |
| `GET /api/friends/chat-history/{friendId}` | GET | 获取聊天记录（分页） | ✅ 已实现 |
| `POST /api/friends/send-message` | POST | 发送好友消息 | ✅ 已实现 |
| `POST /api/friends/request` | POST | 发起好友申请 | ✅ 已实现 |
| `POST /api/friends/request/handle` | POST | 处理好友申请（同意/拒绝） | ✅ 已实现 |
| `GET /api/friends/request/received` | GET | 查询收到的好友申请 | ✅ 已实现 |
| `GET /api/friends/request/sent` | GET | 查询发出的好友申请 | ✅ 已实现 |
| `DELETE /api/friends/remove/{friendId}` | DELETE | 删除好友（含聊天记录清理） | ✅ 已实现 |
| `POST /api/friends/message/{recordId}/recall` | POST | 撤回私聊消息（2分钟内） | ✅ 已实现 |
| `GET /api/friends/chat-history/{friendId}/search` | GET | 搜索私聊消息 | ✅ 已实现 |

### 4.6 用户拉黑接口

| 接口路径 | 方法 | 功能 | 状态 |
|---------|------|------|------|
| `POST /api/user/block` | POST | 拉黑用户 | ✅ 已实现 |
| `DELETE /api/user/block/{blockedId}` | DELETE | 取消拉黑 | ✅ 已实现 |
| `GET /api/user/blocked-list` | GET | 获取黑名单列表 | ✅ 已实现 |

### 4.7 群组系统接口（续）

| 接口路径 | 方法 | 功能 | 状态 |
|---------|------|------|------|
| `PUT /api/group/{groupId}` | PUT | 编辑群聊信息（仅群主） | ✅ 已实现 |
| `POST /api/group/create` | POST | 创建群组 | ✅ 已实现 |
| `GET /api/group/list` | GET | 获取用户的群组列表 | ✅ 已实现 |
| `GET /api/group/info/{groupId}` | GET | 获取群组详情（含成员列表） | ✅ 已实现 |
| `DELETE /api/group/{groupId}` | DELETE | 解散/退出群组 | ✅ 已实现 |
| `POST /api/group/message` | POST | 发送群聊消息 | ✅ 已实现 |
| `GET /api/group/history/{groupId}` | GET | 获取群聊天记录（分页） | ✅ 已实现 |
| `GET /api/group/members/{groupId}` | GET | 获取群成员列表 | ✅ 已实现 |
| `GET /api/group/search` | GET | 搜索群聊 | ✅ 已实现 |
| `POST /api/group/join/{groupId}` | POST | 申请加入群聊（需审批） | ✅ 已实现 |
| `POST /api/group/{groupId}/read/{recordId}` | POST | 标记群消息已读 | ✅ 已实现 |
| `GET /api/group/{groupId}/unread-count` | GET | 群未读消息数 | ✅ 已实现 |
| `DELETE /api/group/{groupId}/member/{targetUserId}` | DELETE | 踢出群成员（仅群主） | ✅ 已实现 |
| `POST /api/group/{groupId}/transfer/{targetUserId}` | POST | 转让群主 | ✅ 已实现 |
| `POST /api/group/{groupId}/invite/{inviteeId}` | POST | 邀请好友入群 | ✅ 已实现 |
| `GET /api/group/{groupId}/join-requests` | GET | 查看入群申请（群主看全部，用户看自己的） | ✅ 已实现 |
| `POST /api/group/{groupId}/join-request/{requestId}/handle` | POST | 处理入群申请 | ✅ 已实现 |
| `POST /api/group/{groupId}/message/{recordId}/recall` | POST | 撤回群聊消息（2分钟内） | ✅ 已实现 |
| `GET /api/group/history/{groupId}/search` | GET | 搜索群聊消息 | ✅ 已实现 |
| `GET /api/group/{groupId}/notifications` | GET | 群聊通知列表（成员看全部，非成员看相关） | ✅ 已实现 |

### 4.8 用户档案接口

| 接口路径 | 方法 | 功能 | 优先级 |
|---------|------|------|-------|
| `GET /api/user/profile/{userId}` | GET | 获取用户完整档案 | 中 |

#### 📦 模块6：WebSocket 实时通信

**功能描述**：基于原生 WebSocket 的实时消息推送和在线状态通知

**已实现功能**：
- ✅ WebSocket 连接认证（JWT Token 验证 + Token黑名单校验 + 心跳状态校验）
- ✅ 私聊消息实时推送（点对点）
- ✅ 好友上线/下线自动广播
- ✅ 消息已读回执
- ✅ WebSocket 心跳保活
- ✅ 连接断开自动重连（前端指数退避）
- ✅ 好友申请实时通知（`FRIEND_REQUEST`）
- ✅ 好友申请结果通知（`FRIEND_REQUEST_RESULT`）
- ✅ 群聊消息实时推送（`GROUP_MESSAGE`）
- ✅ 群成员变动通知（`GROUP_MEMBER_JOIN` / `GROUP_MEMBER_LEAVE`）
- ✅ 群聊消息已读回执（`GROUP_READ_RECEIPT` — 客户端上报已读位置）
- ✅ 消息撤回通知（`MESSAGE_RECALL`）
- ✅ 群主转让通知（`GROUP_OWNER_TRANSFERRED`）
- ✅ 群聊解散通知（`GROUP_DISBANDED`）
- ✅ 入群申请通知（`JOIN_GROUP_REQUEST` — 推送给群主）

**前端配合要点**：
- 登录成功后建立 WebSocket 连接（`ws://localhost:8080/ws/chat?token=xxx`）
- 监听 `FRIEND_ONLINE` / `FRIEND_OFFLINE` 更新好友在线状态
- 监听 `FRIEND_REQUEST` 收到新申请时弹出通知
- 监听 `FRIEND_REQUEST_RESULT` 收到申请处理结果时更新UI
- 通过 WebSocket 发送消息，收到回传确认发送成功
- 页面关闭时主动断开连接

---

## 5. 技术架构

### 5.1 后端技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Spring Boot** | 4.0.2 | 核心框架 |
| **Spring Security** | 内置 | 安全框架 |
| **Spring Data JPA** | 内置 | 数据访问层 |
| **JWT (JJWT)** | 0.12.3 | 身份认证 |
| **Redis** | 6.x | 缓存和会话管理 |
| **MySQL** | 8.0 | 关系型数据库 |
| **Jackson** | 内置 | JSON序列化 |
| **Spring WebSocket** | 内置 | WebSocket 实时通信 |
| **Lombok** | 1.18.30 | 简化代码 |

### 5.2 系统架构图

```
┌─────────────────────────────────────────────┐
│             前端应用 (Web/Mobile)            │
│  ┌──────────────┐          ┌──────────────┐ │
│  │  WebSocket   │          │  HTTP REST   │ │
│  │  /ws/chat    │          │  /api/**     │ │
│  └──────────────┘          └──────────────┘ │
└─────────────────────────────────────────────┘
               │                      │
               ▼                      ▼
┌─────────────────────────────────────────────┐
│    JWT Authentication Filter (REST)        │
│    WebSocketAuthInterceptor (WS Handshake)  │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│         Controller 层                       │
│  AuthController / UserProfileController    │
│  UserSearchController / UserHeartbeatCtrl   │
│  FriendController / GroupController         │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│    ChatWebSocketHandler (WebSocket)         │
│    消息分发 / 在线状态广播 / 已读回执         │
└────────────────────┬────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
┌─────────────┐          ┌─────────────────┐
│  Service 层 │          │ UserSessionMgr  │
│ (业务逻辑)  │          │ (Session 管理)  │
└──────┬──────┘          └─────────────────┘
       │
       ▼
┌─────────────┐        ┌─────────────┐
│   MySQL     │        │    Redis    │
│  (持久化)   │        │ (缓存/会话)  │
└─────────────┘        └─────────────┘
```

### 5.3 认证流程

```
1. 用户登录
   ↓
2. 验证账号密码
   ↓
3. 生成JWT Token（有效期7天）
   ↓
4. 存储用户信息到Redis（7天）
   ↓
5. 更新在线状态为true
   ↓
6. 返回Token给前端
   ↓
7. 前端保存Token到localStorage
   ↓
8. 后续请求携带Token
   ↓
9. JWT Filter验证Token
    ↓
10. 检查Token黑名单（用户登出/密码修改）
    ↓
11. 检查心跳状态（5分钟超时）
    ↓
12. 检查Token版本号（密码修改后旧Token失效）
    ↓
13. 验证通过，处理请求
```

---

## 6. 前后端交互规范

### 6.1 统一响应格式

所有接口均返回以下格式的JSON：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

**字段说明**：
- `code` (int): 业务状态码（200成功，401未授权，500服务器错误等）
- `message` (String): 提示信息
- `data` (Object/Array/null): 返回的数据

### 6.2 请求头设置

#### 需要认证的请求

```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```

#### 不需要认证的请求

```javascript
headers: {
  'Content-Type': 'application/json'
}
```

### 6.3 Token管理规范

#### Token存储

```javascript
// 登录成功后保存
localStorage.setItem('chat_token', token);
localStorage.setItem('chat_user_info', JSON.stringify(userInfo));
```

#### Token使用

```javascript
// 获取Token
const token = localStorage.getItem('chat_token');

// 在请求中使用
fetch('/api/user/profile/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### Token清除

```javascript
// 登出或Token过期时
localStorage.removeItem('chat_token');
localStorage.removeItem('chat_user_info');
```

### 6.4 错误处理规范

#### HTTP状态码

| 状态码 | 说明 | 前端处理 |
|-------|------|---------|
| 200 | 成功 | 正常处理响应数据 |
| 201 | 创建成功 | 正常处理响应数据 |
| 400 | 请求参数错误 | 显示错误提示 |
| 401 | 未授权/Token无效 | 跳转到登录页 |
| 403 | 权限不足 | 显示权限不足提示 |
| 404 | 资源不存在 | 显示资源不存在 |
| 500 | 服务器错误 | 显示系统繁忙提示 |

#### 错误响应示例

```json
{
  "code": 401,
  "message": "未登录或Token已过期",
  "data": null
}
```

#### 前端错误处理示例

```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (data.code === 200 || data.code === 201) {
      return { success: true, data: data.data };
    } else if (data.code === 401) {
      // Token过期，跳转到登录页
      localStorage.clear();
      window.location.href = '/login.html';
      return { success: false, message: '登录已过期' };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: '网络错误，请稍后重试' };
  }
}
```

### 6.5 跨域配置

后端已配置CORS，支持：
- ✅ 所有来源（`*`）
- ✅ 所有常用HTTP方法（GET, POST, PUT, DELETE, OPTIONS, PATCH）
- ✅ 自定义请求头（Authorization, Content-Type等）
- ✅ 携带凭证（cookies）

**前端无需额外配置跨域**。

---

## 7. 数据模型说明

### 7.1 UserInfo（用户信息）

**数据库表**：`user_info`

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `userId` | Long | 用户ID（主键，自增） | 1 |
| `userAccount` | String | 账号（8位数字） | "12345678" |
| `userName` | String | 用户名（最多16字符） | "测试用户" |
| `password` | String | 密码（BCrypt加密） | "$2a$10$..." |

> **注意**：`password` 字段**不会**在任何API响应中返回，仅在数据库内部存储。所有用户查询接口返回的是 `UserInfoVO`，不包含密码字段。
| `createDate` | LocalDate | 创建日期 | "2024-01-01" |
| `isOnline` | Boolean | 是否在线 | true |
| `isAvailable` | Boolean | 是否可用 | true |

### 7.2 响应VO对象

#### UserInfoVO（用户信息视图对象）

```typescript
interface UserInfoVO {
  userId: number;           // 用户ID
  userAccount: string;      // 账号
  userName: string;         // 用户名
  createDate: string;       // 创建日期 (YYYY-MM-DD)
  isOnline: boolean;        // 是否在线
  isAvailable: boolean;     // 是否可用
}
```

#### UserLoginWithTokenVO（登录响应）

```typescript
interface UserLoginWithTokenVO extends UserInfoVO {
  token: string;            // JWT Token
}
```

#### UserRegisterVO（注册响应）

```typescript
interface UserRegisterVO {
  userId: number;           // 用户ID
  userAccount: string;      // 系统自动生成的8位数字账号
  userName: string;         // 用户名
}
```

### 7.3 请求DTO对象

#### UserLoginQueryDTO（登录请求）

```typescript
interface UserLoginQueryDTO {
  userAccount: string;      // 账号（8位数字）
  password: string;         // 密码
}
```

#### UserRegisterQueryDTO（注册请求）

```typescript
interface UserRegisterQueryDTO {
  userName: string;         // 用户名（最多16字符）
  password: string;         // 密码
}
```

#### UserUpdateDTO（更新用户信息）

```typescript
interface UserUpdateDTO {
  userName: string;         // 新用户名
}
```

#### PasswordChangeDTO（修改密码）

```typescript
interface PasswordChangeDTO {
  oldPassword: string;      // 旧密码
  newPassword: string;      // 新密码
}
```

#### FriendInfoVO（好友信息）

```typescript
interface FriendInfoVO {
  userId: number;           // 好友用户ID
  userAccount: string;      // 好友账号（8位数字）
  userName: string;         // 好友用户名
  isOnline: boolean;        // 好友是否在线（Redis实时获取）
  isAvailable: boolean;     // 好友是否可用
  createDate: string;       // 好友创建日期 (YYYY-MM-DD)
}
```

#### FriendMessageVO（好友消息）

```typescript
interface FriendMessageVO {
  recordId: number;         // 消息记录ID
  senderId: number;         // 发送者用户ID
  senderName: string;       // 发送者用户名
  receiverId: number;       // 接收者用户ID
  content: string;          // 消息内容
  sendTime: string;         // 发送时间 (YYYY-MM-DDTHH:mm:ss)
  readStatus: boolean;      // 是否已读
  friendRelationId: number; // 好友关系ID
}
```

#### ChatRecordVO（聊天记录）

```typescript
interface ChatRecordVO {
  recordId: number;         // 消息记录ID
  senderId: number;         // 发送者用户ID
  senderName: string;       // 发送者用户名
  receiverId: number;       // 接收者用户ID
  receiverName: string;     // 接收者用户名
  content: string;          // 消息内容
  sendTime: string;         // 发送时间 (YYYY-MM-DDTHH:mm:ss)
  readStatus: boolean;      // 是否已读
}
```

---

## 8. 示例请求和响应

### 8.1 完整登录流程示例

#### 步骤1：用户登录

**请求**：
```javascript
const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userAccount: '12345678',
    password: 'mypassword123'
  })
});

const loginData = await loginResponse.json();
```

**响应**：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "userAccount": "12345678",
    "userName": "张三",
    "createDate": "2024-01-15",
    "isOnline": true,
    "isAvailable": true,
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsInVzZXJBY2NvdW50IjoiMTIzNDU2NzgiLCJ1c2VyTmFtZSI6IuW8oOS4iSIsImlhdCI6MTcxNTc4OTIwMCwiZXhwIjoxNzE2Mzk0MDAwfQ.abc123def456"
  }
}
```

**前端处理**：
```javascript
if (loginData.code === 200) {
  // 保存Token
  localStorage.setItem('chat_token', loginData.data.token);
  localStorage.setItem('chat_user_info', JSON.stringify({
    userId: loginData.data.userId,
    userAccount: loginData.data.userAccount,
    userName: loginData.data.userName
  }));
  
  // 启动心跳
  startHeartbeat(loginData.data.token);
  
  // 跳转到聊天页
  window.location.href = '/chat.html';
}
```

---

#### 步骤2：获取当前用户信息

**请求**：
```javascript
const token = localStorage.getItem('chat_token');

const profileResponse = await fetch('http://localhost:8080/api/user/profile/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const profileData = await profileResponse.json();
```

**响应**：
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "userId": 1,
    "userAccount": "12345678",
    "userName": "张三",
    "createDate": "2024-01-15",
    "isOnline": true,
    "isAvailable": true
  }
}
```

---

#### 步骤3：搜索用户

**请求**：
```javascript
const searchResponse = await fetch(
  'http://localhost:8080/api/user/search?keyword=张&page=1&size=10', 
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const searchData = await searchResponse.json();
```

**响应**：
```json
{
  "code": 200,
  "message": "搜索成功",
  "data": {
    "content": [
      {
        "userId": 1,
        "userAccount": "12345678",
        "userName": "张三",
        "createDate": "2024-01-15",
        "isOnline": true,
        "isAvailable": true
      },
      {
        "userId": 5,
        "userAccount": "87654321",
        "userName": "张小二",
        "createDate": "2024-02-10",
        "isOnline": false,
        "isAvailable": true
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10
    },
    "totalElements": 2,
    "totalPages": 1,
    "last": true,
    "first": true
  }
}
```

---

#### 步骤4：发送心跳

**请求**：
```javascript
const heartbeatResponse = await fetch('http://localhost:8080/api/user/heartbeat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const heartbeatData = await heartbeatResponse.json();
```

**响应**：
```json
{
  "code": 200,
  "message": "心跳更新成功",
  "data": null
}
```

---

#### 步骤5：用户登出

**请求**：
```javascript
const logoutResponse = await fetch('http://localhost:8080/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const logoutData = await logoutResponse.json();
```

**响应**：
```json
{
  "code": 200,
  "message": "登出成功",
  "data": null
}
```

**前端处理**：
```javascript
if (logoutData.code === 200) {
  // 清除本地存储
  localStorage.removeItem('chat_token');
  localStorage.removeItem('chat_user_info');
  
  // 停止心跳
  stopHeartbeat();
  
  // 跳转到登录页
  window.location.href = '/login.html';
}
```

---

## 9. 错误码说明

### 9.1 业务状态码

| 状态码 | 说明 | 常见场景 |
|-------|------|---------|
| 200 | 成功 | 正常操作成功 |
| 201 | 创建成功 | 注册成功 |
| 400 | 请求参数错误 | 参数为空、格式错误 |
| 401 | 未授权 | Token无效、未登录、Token过期 |
| 403 | 权限不足 | 访问无权访问的资源 |
| 404 | 资源不存在 | 用户不存在 |
| 500 | 服务器错误 | 系统异常、数据库错误 |

### 9.2 常见错误消息

| 错误消息 | 原因 | 解决方案 |
|---------|------|---------|
| "用户账号不能为空" | 登录时未传账号 | 检查表单数据 |
| "用户密码不能为空" | 登录时未传密码 | 检查表单数据 |
| "用户账号不规范(长度不符)" | 账号不是8位 | 提示用户输入8位数字 |
| "账号或密码错误" | 账号不存在或密码错误 | 提示用户重新输入 |
| "未登录或Token已过期" | Token无效或过期 | 跳转到登录页 |
| "用户不存在" | 查询的用户ID不存在 | 检查用户ID |
| "旧密码错误" | 修改密码时旧密码错误 | 提示用户重新输入 |
| "用户名称不规范(长度不符)" | 用户名超过16字符 | 限制输入长度 |
| "用户名称不能为空" | 修改用户名时未传值 | 检查表单数据 |
| "搜索关键词不能为空" | 搜索时未传关键词 | 检查查询参数 |
| "每页大小必须在1-50之间" | 搜索分页参数超限 | 调整size参数 |
| "未登录或Token已过期，请重新登录" | Token无效/过期/密码已修改 | 跳转到登录页 |

---

## 10. 开发环境配置

### 10.1 后端服务地址

| 环境 | 地址 | 说明 |
|-----|------|------|
| 本地开发 | `http://localhost:8080` | 默认开发环境 |
| 测试环境 | 待配置 | 测试服务器 |
| 生产环境 | 待配置 | 生产服务器 |

### 10.2 前端配置示例

#### JavaScript/TypeScript

```typescript
// config.ts
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api',
  TIMEOUT: 10000,
  ENDPOINTS: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    PROFILE_ME: '/user/profile/me',
    PROFILE_INFO: '/user/profile/info',
    SEARCH: '/user/search',
    HEARTBEAT: '/user/heartbeat'
  }
};
```

#### Vue.js (axios配置)

```javascript
// src/utils/request.js
import axios from 'axios';

const service = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000
});

// 请求拦截器
service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('chat_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data;
    if (res.code === 401) {
      // Token过期，跳转到登录页
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(new Error('登录已过期'));
    }
    return res;
  },
  error => {
    return Promise.reject(error);
  }
);

export default service;
```

#### React (fetch封装)

```javascript
// src/utils/api.js
const API_BASE = 'http://localhost:8080/api';

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('chat_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    
    const data = await response.json();
    
    if (data.code === 401) {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('登录已过期');
    }
    
    return data;
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
}

export default apiCall;
```

---

## 11. 测试工具推荐

### 11.1 Swagger UI（推荐）

**在线API文档与测试工具**：

访问地址：[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

- ✅ 自动生成：基于 springdoc-openapi，与代码实时同步
- ✅ 在线测试：可直接在页面上输入参数并发送请求
- ✅ 接口分组：按 Controller 分类（auth-controller、user-profile-controller、friend-controller、group-controller 等）
- ✅ Schema 展示：自动展示 DTO/VO 的字段结构

**认证配置**：在 Swagger UI 页面点击右上角 "Authorize" 按钮，输入 `Bearer {your_token}` 即可测试需要认证的接口。

### 11.2 Postman

**导入集合**：
1. 创建新Collection：`ChatBackend API`
2. 添加所有接口
3. 设置环境变量：`baseUrl = http://localhost:8080`
4. 使用环境变量：`{{baseUrl}}/api/auth/login`

### 11.3 Apifox/ApiPost

国产API调试工具，支持：
- ✅ 接口文档管理
- ✅ 自动化测试
- ✅ Mock数据
- ✅ 团队协作

### 11.3 浏览器开发者工具

**Network面板**：
- 查看请求和响应
- 检查请求头
- 分析响应数据

**Console面板**：
- 调试JavaScript
- 查看日志输出

---

## 12. 常见问题FAQ

### Q1: Token过期如何处理？

**A**: 
```javascript
// 方法1：后端返回401时处理
if (response.code === 401) {
  localStorage.clear();
  window.location.href = '/login.html';
}

// 方法2：前端主动检查Token有效期
// 注意：JWT有效期为7天，建议定期刷新
```

### Q2: 心跳机制如何实现？

**A**:
```javascript
// 登录成功后启动心跳
let heartbeatTimer = null;

function startHeartbeat(token) {
  // 立即发送一次
  sendHeartbeat(token);
  
  // 每2分钟发送一次
  heartbeatTimer = setInterval(() => {
    sendHeartbeat(token);
  }, 2 * 60 * 1000);
}

async function sendHeartbeat(token) {
  try {
    await fetch('http://localhost:8080/api/user/heartbeat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error('心跳发送失败:', error);
  }
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// 页面关闭前停止心跳
window.addEventListener('beforeunload', () => {
  stopHeartbeat();
});
```

### Q3: 如何处理并发请求？

**A**: 
```javascript
// 使用Promise.all并发请求
const [profileData, onlineCountData] = await Promise.all([
  fetch('/api/user/profile/me', { headers }).then(r => r.json()),
  fetch('/api/user/search/count', { headers }).then(r => r.json())
]);
```

### Q4: 搜索功能支持哪些搜索方式？

**A**:
1. **用户名模糊搜索**：输入"张"可以搜索到"张三"、"张小二"
2. **账号精确搜索**：输入8位数字"12345678"精确匹配账号
3. **自动切换**：如果用户名搜索无结果且输入为8位数字，自动尝试账号搜索

### Q5: 分页如何处理？

**A**:
```javascript
// 搜索第2页，每页10条
const response = await fetch(
  '/api/user/search?keyword=测试&page=2&size=10'
);

const data = await response.json();

// 分页信息
const currentPage = data.data.pageable.pageNumber + 1; // 后端从0开始
const pageSize = data.data.pageable.pageSize;
const totalElements = data.data.totalElements;
const totalPages = data.data.totalPages;

// 用户列表
const users = data.data.content;
```

### Q6: 如何处理网络错误？

**A**:
```javascript
async function safeApiCall(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      timeout: 10000 // 10秒超时
    });
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, message: '请求超时' };
    }
    return { success: false, message: '网络错误，请检查网络连接' };
  }
}
```

### Q7: 密码有什么要求？

**A**:
- 长度：最多32个字符
- 建议：至少6个字符，包含字母和数字
- 加密：后端使用BCrypt加密存储
- 传输：建议前端也进行MD5加密后传输（可选）

### Q8: 如何调试接口？

**A**:
1. **使用Postman**：手动构造请求查看响应
2. **浏览器控制台**：查看Network面板的请求详情
3. **后端日志**：查看控制台输出的日志信息
4. **前端测试页面**：使用 Postman 或其他 HTTP 客户端测试接口

---

## 📞 联系与支持

如有问题，请：
1. 查阅本文档
2. 查看后端日志
3. 使用测试工具验证接口
4. 联系后端开发团队

---

## 📝 文档更新记录

| 版本 | 日期 | 更新内容 | 更新人 |
|-----|------|---------|-------|
| v1.0 | 2026-05-26 | 初始版本，包含所有已实现接口 | 后端团队 |
| v1.1 | 2026-06-01 | 新增好友模块3个接口：好友列表、未读消息、聊天记录 | 后端团队 |
| v1.2 | 2026-06-10 | 新增好友申请功能（5个接口 + WebSocket通知） | 后端团队 |
| v1.3 | 2026-06-15 | 安全加固：修改密码Token失效、搜索参数约束、搜索响应去除password、认证失败统一JSON响应、WebSocket握手安全校验 | 后端团队 |
| v1.4 | 2026-06-15 | 新增删除好友接口（DELETE /api/friends/remove/{friendId}），含聊天记录清理 | 后端团队 |
| v1.5 | 2026-06-15 | 实现群组模块4个接口：创建群聊、群列表、群详情、解散/退出 | 后端团队 |
| v1.6 | 2026-06-15 | 新增群聊消息3个接口：发送消息、聊天记录（分页）、成员列表 | 后端团队 |
| v1.7 | 2026-06-15 | 实现 WebSocket 群聊实时通信：GROUP_MESSAGE 广播 + 成员变动通知 | 后端团队 |
| v1.8 | 2026-06-17 | 新增群聊搜索（按群名/群号）、加入群聊接口；实现群聊消息已读功能（last_read_record_id方案 + GROUP_READ_RECEIPT）；群聊表新增member_count字段 | 后端团队 |
| v1.9 | 2026-06-17 | REST发送消息补充WebSocket实时推送；修复未读消息误清零（getUnreadMessages不再修改已读状态）；好友列表返回最后消息预览+未读数；群列表返回最后消息预览+未读数 | 后端团队 |
| v2.0 | 2026-06-18 | 第二优先级功能：踢人出群、撤回消息(软删除2分钟)、群主转让、邀请好友入群、接口限流(429)、用户拉黑(blocked_user)、消息搜索；群聊消息补充WebSocket推送；新增chat_group_notification/blocked_user表 | 后端团队 |
| v2.1 | 2026-06-18 | 加入群聊改为审批制（搜索入群需群主同意）；新增入群申请/审批接口、群通知列表接口；新增group_join_request表 | 后端团队 |
| v2.2 | 2026-06-18 | 代码优化：登录失败返回401(原404)；ObjectMapper统一注入为Spring Bean；好友列表加分页(支持page/size)；移除handleFriendRequest冗余updateRequestStatus | 后端团队 |
| v2.3 | 2026-06-18 | 补充Javadoc(17个类)和日志(14处)；修复GroupJoinRequest.status列类型；group_join_request表补录入数据库文档 | 后端团队 |
| v2.4 | 2026-06-21 | JOIN_GROUP_REQUEST纳入MessageType枚举；ChatMessage.joinGroupRequest()工厂方法；POST /join/{groupId}支持message留言；WebSocket消息类型文档补齐 | 后端团队 |
| v2.5 | 2026-06-21 | 编辑群聊信息(PUT /group/{groupId})；GROUP_DISBANDED消息类型区分群解散/退出；集成Swagger(springdoc-openapi) | 后端团队 |
| v2.6 | 2026-06-22 | Swagger UI 401拦截修复(SecurityConfig+JwtAuthenticationFilter放行)；文档汇总表与在线文档对齐(补录14个接口、删除1个、新增拉黑模块表) | 后端团队 |
| v2.7 | 2026-06-23 | 入群留言改为请求体传递(JoinGroupDTO)；入群申请查询放宽(群主看全部/非群主看自己的)；群通知查询放宽(成员看全部/非成员看相关的) | 后端团队 |
| v2.8 | 2026-06-23 | 群主查看入群申请不限状态(待处理/已同意/已拒绝)；新增WS消息类型JOIN_GROUP_REQUEST_RESULT(审批后推送给申请人) | 后端团队 |

---

**文档结束** 🎉

祝前端开发顺利！如有任何疑问，请随时沟通。
