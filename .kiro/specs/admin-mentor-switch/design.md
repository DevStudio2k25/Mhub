# Design Document

## Overview

The Admin ↔ Mentor Quick Account Switch System enables seamless role switching for users who have both admin and mentor responsibilities. The system maintains separate Firebase Authentication accounts for security while providing a secure linking mechanism that allows instant switching without password re-entry.

The design leverages Firebase Custom Tokens for secure authentication switching, Firestore for link management, and integrates with the existing role-based access control system.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    SA[Super Admin] --> LAM[Link Admin-Mentor Accounts]
    LAM --> FS[(Firestore linkedAccounts)]
    
    A[Admin User] --> AD[Admin Dashboard]
    AD --> CS{Check Switch Option}
    CS -->|Linked| SB[Show Switch Button]
    CS -->|Not Linked| NS[No Switch Option]
    
    SB --> API[/api/switch-account]
    API --> VAL[Validate Link]
    VAL --> CT[Create Custom Token]
    CT --> MA[Mentor Authentication]
    MA --> MD[Mentor Dashboard]
    
    MD --> RB[Return Button]
    RB --> API2[/api/switch-back]
    API2 --> AA[Admin Authentication]
    AA --> AD
```

### System Components

1. **Account Linking Service**: Manages admin-mentor account relationships
2. **Switch Authentication Service**: Handles secure token-based account switching  
3. **Link Management Interface**: Super admin tools for creating/managing links
4. **Switch UI Components**: Dashboard elements for initiating switches
5. **Security Layer**: Firestore rules and validation for linked account access

## Components and Interfaces

### 1. Firestore Collections

#### linkedAccounts Collection
```typescript
interface LinkedAccount {
  adminUID: string           // Firebase UID of admin account
  mentorUID: string         // Firebase UID of mentor account  
  linkedBy: string          // UID of super admin who created link
  linkedOn: Timestamp       // When link was created
  isActive: boolean         // Whether link is currently active
  lastUsed?: Timestamp      // Last time switch was used
}
```

#### switchSessions Collection (temporary)
```typescript
interface SwitchSession {
  originalUID: string       // UID of account user originally logged in with
  currentUID: string        // UID of account user is currently using
  sessionId: string         // Unique session identifier
  createdAt: Timestamp      // When switch session started
  expiresAt: Timestamp      // When session expires (24 hours)
}
```

### 2. API Endpoints

#### POST /api/link-accounts
- **Purpose**: Create admin-mentor account link
- **Access**: Super admin only
- **Input**: `{ adminUID: string, mentorUID: string }`
- **Output**: `{ success: boolean, linkId: string }`

#### POST /api/switch-account  
- **Purpose**: Switch from admin to linked mentor account
- **Access**: Linked admin accounts only
- **Input**: `{ targetRole: 'mentor' | 'admin' }`
- **Output**: `{ customToken: string, sessionId: string }`

#### POST /api/switch-back
- **Purpose**: Return to original account
- **Access**: Users in switch session only  
- **Input**: `{ sessionId: string }`
- **Output**: `{ customToken: string }`

#### GET /api/linked-accounts
- **Purpose**: Get linked account info for current user
- **Access**: Authenticated users only
- **Output**: `{ linkedAccount?: LinkedAccount, canSwitch: boolean }`

#### DELETE /api/unlink-accounts/:linkId
- **Purpose**: Remove admin-mentor account link
- **Access**: Super admin only
- **Output**: `{ success: boolean }`

### 3. Frontend Components

#### AccountSwitcher Component
```typescript
interface AccountSwitcherProps {
  currentRole: 'admin' | 'mentor'
  linkedAccount?: LinkedAccount
  onSwitch: (targetRole: string) => Promise<void>
}
```

#### LinkAccountsDialog Component  
```typescript
interface LinkAccountsDialogProps {
  admins: AdminUser[]
  mentors: MentorUser[]
  onLink: (adminUID: string, mentorUID: string) => Promise<void>
}
```

#### LinkedAccountsManager Component
```typescript
interface LinkedAccountsManagerProps {
  linkedAccounts: LinkedAccount[]
  onUnlink: (linkId: string) => Promise<void>
  onViewUsage: (linkId: string) => void
}
```

### 4. Service Classes

#### AccountLinkingService
```typescript
class AccountLinkingService {
  async createLink(adminUID: string, mentorUID: string): Promise<string>
  async removeLink(linkId: string): Promise<void>
  async getLinkedAccount(userUID: string): Promise<LinkedAccount | null>
  async validateLink(adminUID: string, mentorUID: string): Promise<boolean>
}
```

#### SwitchAuthService  
```typescript
class SwitchAuthService {
  async switchToAccount(targetUID: string): Promise<string>
  async createSwitchSession(originalUID: string, targetUID: string): Promise<string>
  async returnToOriginal(sessionId: string): Promise<string>
  async validateSwitchPermission(fromUID: string, toUID: string): Promise<boolean>
}
```

## Data Models

### Extended User Data Models

#### Admin User (Extended)
```typescript
interface AdminUser extends BaseUser {
  role: 'admin'
  linkedMentorUID?: string    // UID of linked mentor account
  canSwitchToMentor: boolean  // Whether switching is enabled
}
```

#### Mentor User (Extended)  
```typescript
interface MentorUser extends BaseUser {
  role: 'mentor'
  linkedAdminUID?: string     // UID of linked admin account
  canSwitchToAdmin: boolean   // Whether switching is enabled
}
```

### Switch Session Model
```typescript
interface SwitchSession {
  sessionId: string
  originalUID: string
  currentUID: string
  originalRole: 'admin' | 'mentor'
  currentRole: 'admin' | 'mentor'
  createdAt: Date
  expiresAt: Date
  isActive: boolean
}
```

## Error Handling

### Error Types
```typescript
enum SwitchError {
  ACCOUNT_NOT_LINKED = 'ACCOUNT_NOT_LINKED',
  INVALID_PERMISSIONS = 'INVALID_PERMISSIONS', 
  TOKEN_GENERATION_FAILED = 'TOKEN_GENERATION_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  LINK_NOT_FOUND = 'LINK_NOT_FOUND',
  DUPLICATE_LINK = 'DUPLICATE_LINK'
}
```

### Error Handling Strategy
1. **Client-side validation** before API calls
2. **Server-side validation** with detailed error responses
3. **Graceful fallbacks** to manual login if switching fails
4. **User-friendly error messages** with actionable guidance
5. **Audit logging** for security-related failures

### Fallback Mechanisms
- If custom token fails, redirect to login page with pre-filled email
- If session expires, automatically return to original account
- If link is removed while user is switched, allow current session to continue but prevent future switches

## Testing Strategy

### Unit Tests
1. **AccountLinkingService** - Link creation, validation, removal
2. **SwitchAuthService** - Token generation, session management
3. **API endpoints** - Input validation, authorization, error handling
4. **React components** - UI interactions, state management

### Integration Tests  
1. **End-to-end switch flow** - Admin to mentor and back
2. **Super admin link management** - Create, view, remove links
3. **Security validation** - Unauthorized access attempts
4. **Session expiration** - Automatic cleanup and fallbacks

### Security Tests
1. **Token validation** - Ensure tokens are properly scoped
2. **Permission checks** - Verify role-based access controls
3. **Link validation** - Prevent unauthorized account linking
4. **Session hijacking** - Validate session security measures

### Test Data Setup
```typescript
// Test accounts for different scenarios
const testAccounts = {
  superAdmin: { uid: 'super-1', role: 'super-admin' },
  linkedAdmin: { uid: 'admin-1', role: 'admin', linkedMentorUID: 'mentor-1' },
  linkedMentor: { uid: 'mentor-1', role: 'mentor', linkedAdminUID: 'admin-1' },
  unlinkedAdmin: { uid: 'admin-2', role: 'admin' },
  unlinkedMentor: { uid: 'mentor-2', role: 'mentor' }
}
```

### Performance Considerations
1. **Token caching** - Cache custom tokens for short periods to reduce Firebase Admin SDK calls
2. **Link lookup optimization** - Index linkedAccounts collection by both adminUID and mentorUID
3. **Session cleanup** - Automated cleanup of expired switch sessions
4. **Rate limiting** - Prevent abuse of switch functionality

### Security Considerations
1. **Token expiration** - Custom tokens expire after 1 hour
2. **Session limits** - Maximum 24-hour switch sessions
3. **Audit trail** - Log all switch activities with timestamps
4. **Permission validation** - Double-check permissions on every switch
5. **Link verification** - Validate links exist and are active before switching