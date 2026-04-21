# MNX Package Registry API Documentation

## Overview

The MNX Package Registry is a Minecraft Bedrock Edition (MCBE) addon management system built on Cloudflare Workers. It provides comprehensive package publishing, version management, and authentication services. This API allows users to manage MCBE addons, generate tokens for publishing, and access package metadata.

### Key Features
- **Package Management**: Complete lifecycle management for MCBE addons
- **Token-Based Authentication**: Secure API access with granular permissions
- **Session-Based Publishing**: Two-step publish workflow for reliability
- **Multi-Scope Support**: Support for organization and personal scopes
- **Cloudflare Integration**: Built on Cloudflare Workers for high performance

## Authentication

All API endpoints require authentication using Bearer tokens in the `Authorization` header.

```http
Authorization: Bearer <token>
```

### Token Types
- **User Tokens**: For account management and token generation
- **Publish Tokens**: For package publishing operations (require specific permissions)

## Base URL

```
https://your-worker-domain.com
```

## Headers

All requests should include appropriate headers:

**For JSON requests:**
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**For file uploads:**
```http
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

---

## Routes

### Account Management

#### 1. GET/POST `/account/*`
**Description**: Account-related operations

This route validates user authentication via token and sets user context for subsequent operations.

**Authentication**: Bearer Token required

### Token Management

#### 2. POST `/account/publish/token/gen`
**Description**: Generate a new publish token

**Authentication**: Bearer Token (User Token)

**Request Body**:
```json
{
  "name": "token-name",
  "permissions": ["publish", "unpublish"],
  "scopes": ["@myscope", "@anotherscope"],
  "expirationTime": 1735689600
}
```

**Parameters**:
- `name` (string, required): Token identifier (must be unique per user)
- `permissions` (array, required): Array of permissions - "publish" and/or "unpublish"
- `scopes` (array, required): Package scopes this token can access (use "*" for all scopes)
- `expirationTime` (number, optional): Unix timestamp when token expires (default: 30 days)

**Permissions**:
- `"publish"` - Can publish packages to specified scopes
- `"unpublish"` - Can unpublish packages from specified scopes

**Response**:
```json
{
  "code": 200,
  "message": "Token created successfully",
  "data": {
    "token": "generated-token",
    "id": "token-id",
    "name": "token-name",
    "scopes": ["@myscope", "@anotherscope"],
    "permissions": ["publish", "unpublish"],
    "expiresAt": 1735689600,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid parameters or missing required fields
- `409 Conflict`: Token name already exists

#### 3. DELETE `/account/publish/token/delete/:name`
**Description**: Delete a token by name

**Path Parameters**:
- `name`: Token name to delete

**Response**:
```json
{
  "code": 200,
  "message": "Token deleted successfully"
}
```

#### 4. GET `/account/publish/token/list`
**Description**: List all tokens for the authenticated user

**Response**:
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

### Package Publishing

#### 5. POST `/publish/session/:scope/:name/create`
**Description**: Create a publish session for uploading package metadata

**Authentication**: Bearer Token with "publish" permission

**Path Parameters**:
- `scope` (string): Package scope (must match token scope)
- `name` (string): Package name (alphanumeric and hyphens only)

**Request Body**:
```json
{
  "readme": "Package description in markdown",
  "scope": "@myscope",
  "name": "my-package",
  "version": "1.0.0",
  "version_tag": "latest"
}
```

**Parameters**:
- `readme` (string, required): Package description in Markdown format
- `scope` (string, required): Package scope (must match path parameter)
- `name` (string, required): Package name (must match path parameter)
- `version` (string, required): Semantic version (e.g., "1.0.0")
- `version_tag` (string, optional): Version tag like "latest", "beta", "alpha" (default: "latest")

**Response**:
```json
{
  "code": 200,
  "message": "Publish session created",
  "data": {
    "sessionKey": "publish-session:user:scope:name",
    "expiresIn": 300
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid package metadata
- `401 Unauthorized`: Token lacks publish permission for this scope
- `409 Conflict`: Package version already exists
- `423 Locked`: Package is currently being published

#### 6. POST `/publish/session/:scope/:name/upload`
**Description**: Upload package zip file to complete publishing

**Authentication**: Bearer Token with "publish" permission

**Path Parameters**:
- `scope`: Package scope
- `name`: Package name

**Request Format**: multipart/form-data

**Form Data**:
- `file`: Package zip file (max 40MB)

**Requirements**:
- File type: application/zip or .zip extension
- Max size: 40MB
- Non-empty file

**Response**:
```json
{
  "code": 200,
  "data": "Package published successfully"
}
```

### Package Management

#### 7. POST `/unpublish/:scope/:name/:version`
**Description**: Unpublish a specific package version

**Authentication**: Bearer Token with "unpublish" permission

**Path Parameters**:
- `scope`: Package scope
- `name`: Package name
- `version`: Package version to unpublish

**Response**:
```json
{
  "code": 200,
  "data": "Package unpublished successfully"
}
```

#### 8. POST `/account/publish/list`
**Description**: List packages owned by the authenticated user

**Authentication**: Bearer Token required

**Response**:
```json
{
  "code": 200,
  "data": {
    "scope": "user-scope"
  }
}
```

---

## Error Codes and Handling

### Standard HTTP Codes

| Code | Message | Description |
|------|---------|-------------|
| 200 | Success | Operation completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input or parameters |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 413 | Payload Too Large | File exceeds size limit (40MB) |
| 415 | Unsupported Media Type | Invalid file format |
| 423 | Locked | Package is currently being published |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Custom Error Codes (-1)

When `code` is `-1`, check `data` field for specific error message:

```json
{
  "code": -1,
  "message": "Operation failed",
  "data": "Token verification failed: insufficient permissions"
}
```

**Common -1 Error Scenarios**:
- Token validation failures
- Package format validation errors
- Database constraint violations
- Session timeout errors

## Response Format

All responses follow this format:

```json
{
  "code": 200 | -1,
  "message": "Descriptive message",
  "data": {}
}
```

---

## Usage Examples

### Example 1: Generate a Publish Token

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

### Example 2: Publish a Package

```bash
# Step 1: Create publish session
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

# Step 2: Upload package file
curl -X POST https://your-worker-domain.com/publish/session/@myorg/mypackage/upload \
  -H "Authorization: Bearer your-publish-token" \
  -F "file=@mypackage-1.0.0.zip"
```

### Example 3: Unpublish a Package

```bash
curl -X POST https://your-worker-domain.com/unpublish/@myorg/mypackage/1.0.0 \
  -H "Authorization: Bearer your-unpublish-token"
```

---

## Technical Specifications

### CORS Support

The API supports CORS for the following domains:

- `ruanhor.dpdns.org` and its subdomains
- `wei.qzz.io` and its subdomains

Allowed methods: GET, POST, PUT, DELETE, OPTIONS

Allowed headers: Content-Type, Authorization, X-Requested-With

### Package Naming Conventions

**Scope Format**:
- Must start with @ symbol (e.g., `@myscope`)
- Alphanumeric characters, hyphens, underscores
- Maximum length: 50 characters

**Package Name Format**:
- Alphanumeric characters, hyphens, underscores
- Must not start or end with hyphen
- Maximum length: 50 characters

**Version Format**:
- Semantic versioning (MAJOR.MINOR.PATCH)
- Optional prerelease tags (e.g., `1.0.0-beta.1`)
- Maximum length: 20 characters

### File Format Requirements

**Package Archives**:
- Format: ZIP only
- Maximum size: 40MB
- Must contain valid Minecraft addon manifest
- Required files: `manifest.json`, package content

**Validation**:
- Files are validated for correct Minecraft addon structure
- Malware scanning performed automatically
- Invalid packages are rejected

---

## Rate Limiting

Currently no explicit rate limiting is implemented. However, Cloudflare Workers have built-in rate limiting based on the plan.

---

## Data Models

### User
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

### Publish Metadata
```typescript
interface PublishMetadata {
  readme: string;
  scope: string;
  name: string;
  version: string;
  version_tag: string;
}
```

### Package
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

## Security Notes

1. **Token Security**: Publish tokens grant significant permissions. Store them securely and never commit them to version control.

2. **Scope Validation**: Tokens are validated against specific scopes. Use wildcard `"*"` scope with caution.

3. **File Upload Limits**: Zip files are limited to 40MB to prevent abuse.

4. **Session Management**: Publish sessions expire after 5 minutes for security.