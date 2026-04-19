# MNX Package Registry API Documentation

## Overview

The MNX Package Registry is a package management system built on Cloudflare Workers that provides package publishing, version management, and authentication services. This API allows users to manage packages, generate tokens for publishing, and access package metadata.

## Authentication

All API endpoints require authentication using Bearer tokens in the `Authorization` header.

```http
Authorization: Bearer <token>
```

## Base URL

```
https://your-worker-domain.com
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

**Request Body**:
```json
{
  "name": "token-name",
  "permissions": ["publish", "unpublish"],
  "scopes": ["scope1", "scope2"],
  "expirationTime": 1234567890
}
```

**Permissions**:
- `"publish"` - Can publish packages
- `"unpublish"` - Can unpublish packages

**Response**:
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
- `scope`: Package scope
- `name`: Package name

**Request Body**:
```json
{
  "readme": "Package description in markdown",
  "scope": "scope-name",
  "name": "package-name",
  "version": "1.0.0",
  "version_tag": "latest"
}
```

**Response**:
```json
{
  "code": 200,
  "data": {
    "sessionKey": "publish-session:user:scope:name"
  }
}
```

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

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -1 | Various error messages | Various error conditions |
| 200 | Success | Operation completed successfully |
| 400 | Bad Request | Invalid input or parameters |
| 401 | Unauthorized | Authentication required |
| 404 | Not Found | Resource not found |
| 423 | Locked | Package is currently being published |
| 500 | Internal Server Error | Server-side error |

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

## CORS Support

The API supports CORS for the following domains:

- `ruanhor.dpdns.org` and its subdomains
- `wei.qzz.io` and its subdomains

Allowed methods: GET, POST, PUT, DELETE, OPTIONS

Allowed headers: Content-Type, Authorization, X-Requested-With

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