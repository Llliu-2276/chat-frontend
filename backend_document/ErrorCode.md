# 错误码文档

> **文档版本**: v1.1  
> **更新日期**: 2026-06-01  
> **关联代码**: [ErrorCode.java](../src/main/java/org/example/liu/chatbackend/common/ErrorCode.java)

## 1. 请求成功 (2xx)

| 错误码 | 枚举常量 | 说明 | 使用场景 |
|-------|---------|------|----------|
| 200 | `SUCCESS` | 操作成功 | 请求获取资源、更新资源后返回更新后的数据、执行某些操作后返回结果 |
| 201 | `CREATED` | 创建成功 | 在POST请求创建新资源后返回 |
| 202 | `ACCEPTED` | 请求已接受 | 后台任务、批处理、消息推送等耗时操作 |
| 204 | `NO_CONTENT` | 操作成功，无返回内容 | DELETE删除资源、某些PUT/PATCH更新后无需返回数据 |
| 206 | `PARTIAL_CONTENT` | 返回部分内容 | 视频流、分页下载等 |

## 2. 客户端错误 (4xx)

| 错误码 | 枚举常量 | 说明 | 使用场景 |
|-------|---------|------|----------|
| 400 | `BAD_REQUEST` | 请求参数错误 | 必填项为空、格式错误、JSON解析失败 |
| 401 | `UNAUTHORIZED` | 未认证 | 未登录、Token过期或无效 |
| 403 | `FORBIDDEN` | 权限不足 | 已登录但无权访问该资源或执行操作 |
| 404 | `NOT_FOUND` | 资源不存在 | 查询的记录不存在、URL路径错误 |
| 405 | `METHOD_NOT_ALLOWED` | 请求方法不允许 | 请求方式错误(POST调成GET) |
| 409 | `CONFLICT` | 数据冲突 | 唯一键重复、乐观锁更新失败、重复提交 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 不支持的媒体类型 | Content-Type不是application/json |
| 429 | `TOO_MANY_REQUESTS` | 请求太频繁 | 接口限流触发 |

## 3. 服务器错误 (5xx)

| 错误码 | 枚举常量 | 说明 | 使用场景 |
|-------|---------|------|----------|
| 500 | `INTERNAL_SERVER_ERROR` | 系统内部错误 | 未捕获异常、空指针、数据库连接失败 |
| 502 | `BAD_GATEWAY` | 网关错误 | Nginx无法连接到应用服务器 |
| 503 | `SERVICE_UNAVAILABLE` | 服务不可用 | 应用正在重启、熔断器打开 |
| 504 | `GATEWAY_TIMEOUT` | 网关超时 | 上游服务响应超时 |

## 4. 使用示例

### 4.1 在Controller中使用

```java
// 成功响应
return new BaseResponse<>(ErrorCode.SUCCESS.getCode(), "操作成功", data);

// 未登录响应
if (userId == null) {
    return new BaseResponse<>(ErrorCode.UNAUTHORIZED.getCode(), "未登录或Token已过期", null);
}
```

### 4.2 在Service中使用

```java
// 资源不存在异常
UserInfo userInfo = userInfoRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException(
            ErrorCode.NOT_FOUND.getCode(), 
            "用户不存在"
        ));

// 参数错误异常
if (password == null || password.isEmpty()) {
    throw new InvalidRequestParameterException(
        ErrorCode.BAD_REQUEST.getCode(), 
        "密码不能为空"
    );
}
```

### 4.3 在ExceptionHandler中使用

```java
@ExceptionHandler(AuthenticationException.class)
public ResponseEntity<BaseResponse<Void>> authenticationExceptionHandler(AuthenticationException exception) {
    BaseResponse<Void> response = new BaseResponse<>(
        ErrorCode.UNAUTHORIZED.getCode(), 
        "认证失败：" + exception.getMessage(), 
        null
    );
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
}
```

## 5. 注意事项

1. **所有错误码必须使用ErrorCode枚举**，禁止硬编码数字
2. 错误消息应当**清晰、友好、具体**，帮助前端用户理解问题
3. 4xx错误应当提供**具体的错误原因**，便于调试
4. 5xx错误应当**隐藏敏感信息**，只返回通用提示
5. 新增错误码时，必须同时在ErrorCode.java和本文档中更新
