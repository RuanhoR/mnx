# MNX 包注册表 API 文档

## 概述

MNX 包注册表是一个基于 Cloudflare Workers 的 Minecraft Bedrock Edition (MCBE) 插件管理系统。它提供完整的包发布、版本管理和认证服务。此 API 允许用户管理 MCBE 插件、生成发布令牌以及访问包元数据。

### 主要特性

- **包管理**: MCBE 插件的完整生命周期管理
- **基于令牌的认证**: 具有细粒度权限的安全 API 访问
- **基于会话的发布**: 两步发布流程确保可靠性
- **多作用域支持**: 支持组织和个人作用域
- **Cloudflare 集成**: 基于 Cloudflare Workers 实现高性能

## 认证

所有 API 端点都需要在 `Authorization` 头部使用 Bearer 令牌进行认证。

```http
Authorization: Bearer <token>
```

## 基础 URL

```
https://d.pmnx.qzz.io / 你自己部署的地址
```

---

## 路由列表

### 账户管理

#### 1. GET/POST `/account/*`

**描述**: 账户相关操作

此路由通过令牌验证用户认证，并为后续操作设置用户上下文。

**认证**: 需要 Bearer 令牌

### 令牌管理

#### 2. POST `/account/publish/token/gen`

**描述**: 生成新的发布令牌

**请求体**:

```json
{
	"name": "token-name",
	"permissions": ["publish", "unpublish"],
	"scopes": ["scope1", "scope2"],
	"expirationTime": 1234567890
}
```

**权限**:

- `"publish"` - 可以发布包
- `"unpublish"` - 可以取消发布包

**响应**:

```json
{
	"code": 200,
	"message": "Token created successfully",
	"data": {
		"token": "generated-token",
		"id": "token-id",
		"name": "token-name",
		"scopes": ["scope1", "scope2"],
		"permissions": ["publish", "unpublish"],
		"expiresAt": 1234567890
	}
}
```

#### 3. DELETE `/account/publish/token/delete/:name`

**描述**: 根据名称删除令牌

**路径参数**:

- `name`: 要删除的令牌名称

**响应**:

```json
{
	"code": 200,
	"message": "Token deleted successfully"
}
```

#### 4. GET `/account/publish/token/list`

**描述**: 列出认证用户的所有令牌

**响应**:

```json
{
	"code": 200,
	"message": "Tokens retrieved successfully",
	"data": [
		{
			"id": "token-id",
			"name": "token-name",
			"scopes": ["scope1", "scope2"],
			"permissions": ["publish", "unpublish"],
			"createdAt": "2024-01-01T00:00:00Z",
			"expiresAt": 1234567890
		}
	]
}
```

### 包发布

#### 5. POST `/publish/session/:scope/:name/create`

**描述**: 创建发布会话用于上传包元数据

**认证**: 需要具有 "publish" 权限的 Bearer 令牌

**路径参数**:

- `scope`: 包作用域
- `name`: 包名称

**请求体**:

```json
{
	"readme": "Package description in markdown",
	"scope": "scope-name",
	"name": "package-name",
	"version": "1.0.0",
	"version_tag": "latest"
}
```

**响应**:

```json
{
	"code": 200,
	"data": {
		"sessionKey": "publish-session:user:scope:name"
	}
}
```

#### 6. POST `/publish/session/:scope/:name/upload`

**描述**: 上传包 zip 文件完成发布

**认证**: 需要具有 "publish" 权限的 Bearer 令牌

**路径参数**:

- `scope`: 包作用域
- `name`: 包名称

**请求格式**: multipart/form-data

**表单数据**:

- `file`: 包 zip 文件 (最大 40MB)

**要求**:

- 文件类型: application/zip 或 .zip 扩展名
- 最大大小: 40MB
- 文件不能为空

**响应**:

```json
{
	"code": 200,
	"data": "Package published successfully"
}
```

### 包管理

#### 7. POST `/unpublish/:scope/:name/:version`

**描述**: 取消发布特定的包版本

**认证**: 需要具有 "unpublish" 权限的 Bearer 令牌

**路径参数**:

- `scope`: 包作用域
- `name`: 包名称
- `version`: 要取消发布的包版本

**响应**:

```json
{
	"code": 200,
	"data": "Package unpublished successfully"
}
```

#### 8. POST `/account/publish/list`

**描述**: 列出认证用户拥有的包

**认证**: 需要 Bearer 令牌

**响应**:

```json
{
	"code": 200,
	"data": {
		"scope": "user-scope"
	}
}
```

---

## 错误码

| 代码 | 消息           | 描述           |
| ---- | -------------- | -------------- |
| -1   | 各种错误消息   | 各种错误情况   |
| 200  | 成功           | 操作成功完成   |
| 400  | 错误请求       | 无效输入或参数 |
| 401  | 未授权         | 需要认证       |
| 404  | 未找到         | 资源未找到     |
| 423  | 已锁定         | 包正在发布中   |
| 500  | 内部服务器错误 | 服务器端错误   |

## 响应格式

所有响应都遵循此格式：

```json
{
  "code": 200 | -1,
  "message": "Descriptive message",
  "data": {}
}
```

---

## 使用示例

### 示例 1: 生成发布令牌

```bash
curl -X POST https://your-worker-domain.com/account/publish/token/gen \
  -H "Authorization: Bearer your-user-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-publish-token",
    "permissions": ["publish"],
    "scopes": ["@myorg"],
    "expirationTime": 1735689600
  }'
```

### 示例 2: 发布包

```bash
# 步骤 1: 创建发布会话
curl -X POST https://your-worker-domain.com/publish/session/@myorg/mypackage/create \
  -H "Authorization: Bearer your-publish-token" \
  -H "Content-Type: application/json" \
  -d '{
    "readme": "# My Package\nThis is my awesome package.",
    "scope": "@myorg",
    "name": "mypackage",
    "version": "1.0.0",
    "version_tag": "latest"
  }'

# 步骤 2: 上传包文件
curl -X POST https://your-worker-domain.com/publish/session/@myorg/mypackage/upload \
  -H "Authorization: Bearer your-publish-token" \
  -F "file=@mypackage-1.0.0.zip"
```

### 示例 3: 取消发布包

```bash
curl -X POST https://your-worker-domain.com/unpublish/@myorg/mypackage/1.0.0 \
  -H "Authorization: Bearer your-unpublish-token"
```

---

## CORS 支持

API 支持以下域的 CORS：

- `ruanhor.dpdns.org` 及其子域名
- `wei.qzz.io` 及其子域名

允许的方法: GET, POST, PUT, DELETE, OPTIONS

允许的头部: Content-Type, Authorization, X-Requested-With

---

## 速率限制

当前未实现明确的速率限制。但 Cloudflare Workers 根据套餐有内置的速率限制。

---

## 数据模型

### 用户

```typescript
interface User {
	uid: number;
	name: string;
	mail: string;
	ctime: string;
	friends: number[];
	friends_request: number[];
	password: string;
	avatar_url?: string;
}
```

### 发布元数据

```typescript
interface PublishMetadata {
	readme: string;
	scope: string;
	name: string;
	version: string;
	version_tag: string;
}
```

### 包

```typescript
interface MNXPackageData {
	id: number;
	created_at: Date;
	update_at: Date;
	versions: Version[];
	name: string;
	create_user: number;
	scope: string;
	point: string;
	download: number;
}
```

---

## 安全说明

1. **令牌安全**: 发布令牌授予重要权限。安全存储，切勿提交到版本控制。

2. **作用域验证**: 令牌会针对特定作用域进行验证。谨慎使用通配符 `"*"` 作用域。

3. **文件上传限制**: Zip 文件限制为 40MB 以防止滥用。

4. **会话管理**: 发布会话在 5 分钟后过期以确保安全。
