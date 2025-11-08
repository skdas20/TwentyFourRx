# Design Document

## Overview

This design implements a secure email-based authentication system where users receive auto-generated passwords during registration and can reset passwords through email verification. The system ensures email ownership verification and provides a modern, branded email experience.

## Architecture

### High-Level Flow

```
Registration Flow:
User → Registration Form → Backend → Generate Password → Hash & Store → Send Email → User Receives Credentials

Password Reset Flow:
User → Forgot Password → Enter Email → Backend → Generate Token → Store Token → Send Email → User Clicks Link → Reset Form → Update Password → Confirmation Email
```

### Components

1. **Auth Controller** - Handles registration and password reset endpoints
2. **Email Service** - Manages email template rendering and sending
3. **Password Service** - Generates secure passwords and reset tokens
4. **Database Layer** - Stores users and password reset tokens
5. **Frontend Forms** - Registration, forgot password, and reset password pages

## Components and Interfaces

### Backend Components

#### 1. Password Reset Token Entity (Prisma Schema)

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique // Hashed token
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
  @@map("password_reset_tokens")
}
```

#### 2. Auth Controller Endpoints

```typescript
// New/Modified Endpoints
POST /api/v1/auth/register
  - Remove password from DTO
  - Generate password
  - Send welcome email with credentials

POST /api/v1/auth/forgot-password
  - Body: { email: string }
  - Generate reset token
  - Send reset email
  - Response: { message: "If email exists, reset link sent" }

POST /api/v1/auth/reset-password
  - Body: { token: string, newPassword: string, confirmPassword: string }
  - Validate token
  - Update password
  - Send confirmation email
  - Response: { message: "Password reset successful" }

GET /api/v1/auth/validate-reset-token/:token
  - Validate token is valid and not expired
  - Response: { valid: boolean }
```

#### 3. Password Generation Service

```typescript
interface PasswordGeneratorService {
  generateSecurePassword(): string;
  // Generates 12-16 character password with:
  // - Uppercase letters
  // - Lowercase letters
  // - Numbers
  // - Special characters (!@#$%^&*)
}
```

#### 4. Token Generation Service

```typescript
interface TokenService {
  generateResetToken(): string;
  // Generates cryptographically secure 32-character token
  
  hashToken(token: string): string;
  // Hashes token for database storage
  
  validateToken(token: string, hashedToken: string): boolean;
  // Validates token against hash
}
```

#### 5. Email Service Updates

```typescript
interface EmailService {
  sendWelcomeEmail(user: User, generatedPassword: string): Promise<void>;
  sendPasswordResetEmail(user: User, resetToken: string): Promise<void>;
  sendPasswordChangedEmail(user: User): Promise<void>;
}
```

### Frontend Components

#### 1. Updated Registration Form

```typescript
// Remove password fields
interface RegisterFormData {
  name: string;
  email: string;
  phone?: string;
  roleCode: string;
  // password removed
  // confirmPassword removed
}
```

#### 2. Forgot Password Page

```
/auth/forgot-password
- Email input field
- Submit button
- Link back to login
- Success message display
```

#### 3. Reset Password Page

```
/auth/reset-password?token=xxx
- New password field
- Confirm password field
- Submit button
- Password strength indicator
- Token validation on load
```

## Data Models

### Password Reset Token

```typescript
{
  id: string;
  userId: string;
  token: string; // Hashed
  expiresAt: Date; // Current time + 1 hour
  usedAt: Date | null;
  createdAt: Date;
}
```

### Updated User Registration

```typescript
// Registration request (no password)
{
  name: string;
  email: string;
  phone?: string;
  roleCode: string;
}

// Backend generates and stores hashed password
```

## Email Templates

### 1. Welcome Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to 24Rx</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold;">
                24<span style="color: #60a5fa;">Rx</span>
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">World's Only Med-Trade Platform</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Welcome to 24Rx!</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your account has been created successfully. Here are your login credentials:
              </p>
              
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px;"><strong>Email:</strong> {{email}}</p>
                    <p style="margin: 0; color: #1f2937; font-size: 14px;"><strong>Password:</strong> <code style="background-color: #dbeafe; padding: 4px 8px; border-radius: 4px; font-family: monospace;">{{password}}</code></p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                <strong>Important:</strong> Please change your password after your first login for security purposes.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{loginUrl}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Login to Your Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't create this account, please ignore this email or contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                © 2024 24Rx Exchange. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                World's Only Med-Trade Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### 2. Password Reset Email Template

Similar structure with:
- Reset link button
- Token expiration notice (1 hour)
- Security warning

### 3. Password Changed Confirmation Email

Similar structure with:
- Confirmation message
- Security notice
- Contact support if not initiated by user

## Error Handling

### Registration Errors

1. **Email Already Exists**: Return 400 with message "Email already registered"
2. **Email Send Failure**: Log error, return 500, queue retry
3. **Invalid Role Code**: Return 400 with message "Invalid role"

### Password Reset Errors

1. **Invalid Token**: Return 400 with message "Invalid or expired reset link"
2. **Token Expired**: Return 400 with message "Reset link has expired"
3. **Token Already Used**: Return 400 with message "Reset link already used"
4. **Password Mismatch**: Return 400 with message "Passwords do not match"
5. **Weak Password**: Return 400 with validation errors
6. **Rate Limit Exceeded**: Return 429 with message "Too many requests, try again later"

## Testing Strategy

### Unit Tests

1. Password generation produces valid passwords
2. Token generation produces unique tokens
3. Token hashing and validation works correctly
4. Email template rendering with correct variables
5. Token expiration logic

### Integration Tests

1. Complete registration flow with email sending
2. Password reset request creates token
3. Password reset with valid token updates password
4. Expired token rejection
5. Used token rejection
6. Rate limiting enforcement

### E2E Tests

1. User registers and receives email
2. User requests password reset
3. User clicks reset link and changes password
4. User logs in with new password
5. Old password no longer works

## Security Considerations

1. **Password Storage**: Use bcrypt with salt rounds of 10
2. **Token Storage**: Hash tokens before storing in database
3. **Token Expiration**: 1 hour maximum lifetime
4. **Rate Limiting**: 3 reset requests per hour per email
5. **HTTPS Only**: All reset links must use HTTPS
6. **Session Invalidation**: Clear all sessions on password reset
7. **Email Enumeration Prevention**: Generic messages for invalid emails
8. **CSRF Protection**: Include CSRF tokens in reset forms
9. **Audit Logging**: Log all password reset attempts

## Migration Strategy

1. Add `password_reset_tokens` table to database
2. Update User model to add relation
3. Deploy backend changes
4. Update frontend registration form
5. Add forgot password and reset password pages
6. Update email templates
7. Test thoroughly in staging
8. Deploy to production
9. Monitor email delivery and error rates

## Performance Considerations

1. **Email Queue**: Use Bull queue for async email sending
2. **Token Cleanup**: Scheduled job to delete expired tokens (runs daily)
3. **Database Indexes**: On userId and token fields for fast lookups
4. **Caching**: Cache email templates to reduce rendering time
5. **Rate Limiting**: Use Redis for distributed rate limiting
