# Requirements Document

## Introduction

This feature enhances the authentication system to improve security and user experience by implementing email verification during registration and a password reset mechanism. Instead of users choosing their own passwords during registration, the system will generate secure passwords and send them via email, ensuring email ownership verification. Users can then reset their password through a secure email-based flow.

## Glossary

- **System**: The 24Rx authentication and email service
- **User**: Any person registering or using the platform (Seller, Trader, Admin)
- **Registration Email**: Automated email sent upon user registration containing credentials
- **Password Reset Token**: Time-limited unique token for password reset verification
- **Email Template**: Branded HTML email following 24Rx design system

## Requirements

### Requirement 1: Email Verification During Registration

**User Story:** As a new user, I want to receive my login credentials via email so that my email ownership is verified and I can securely access the platform.

#### Acceptance Criteria

1. WHEN a user submits the registration form, THE System SHALL NOT require a password field in the form
2. WHEN a user registers, THE System SHALL generate a secure random password (minimum 12 characters with uppercase, lowercase, numbers, and special characters)
3. WHEN registration is successful, THE System SHALL send an email containing the generated password to the user's email address
4. WHEN the email is sent, THE System SHALL use a branded HTML template with the 24Rx logo and theme colors (blue #2563eb)
5. THE System SHALL hash and store the generated password securely in the database

### Requirement 2: Branded Email Templates

**User Story:** As a user, I want to receive professional, branded emails so that I can trust the communication is from 24Rx.

#### Acceptance Criteria

1. THE System SHALL include the 24Rx logo (24Rx with blue 'x') in all email templates
2. THE System SHALL use consistent branding colors (blue: #2563eb, gray: #1f2937) in email templates
3. THE System SHALL include a clear call-to-action button in registration emails
4. THE System SHALL include footer information with platform name and support contact
5. THE System SHALL ensure emails are responsive and display correctly on mobile devices

### Requirement 3: Password Reset Request

**User Story:** As a user who forgot my password, I want to request a password reset link via email so that I can regain access to my account.

#### Acceptance Criteria

1. THE System SHALL provide a "Forgot Password" link on the login page
2. WHEN a user clicks "Forgot Password", THE System SHALL display a form requesting email address
3. WHEN a user submits a valid email, THE System SHALL generate a unique password reset token
4. THE System SHALL store the reset token with an expiration time of 1 hour in the database
5. THE System SHALL send a password reset email with a secure link containing the token
6. WHEN a user submits an invalid email, THE System SHALL display a generic message to prevent email enumeration

### Requirement 4: Password Reset Token Management

**User Story:** As the system, I need to securely manage password reset tokens so that unauthorized password changes are prevented.

#### Acceptance Criteria

1. THE System SHALL generate cryptographically secure random tokens (minimum 32 characters)
2. THE System SHALL store tokens with userId, token hash, expiration timestamp, and used status
3. THE System SHALL expire tokens after 1 hour from creation
4. THE System SHALL mark tokens as used after successful password reset
5. THE System SHALL allow only one active reset token per user at a time

### Requirement 5: Password Reset Completion

**User Story:** As a user with a reset link, I want to set a new password so that I can access my account again.

#### Acceptance Criteria

1. WHEN a user clicks the reset link, THE System SHALL validate the token is not expired and not used
2. WHEN the token is valid, THE System SHALL display a password reset form
3. THE System SHALL require password confirmation (enter password twice)
4. THE System SHALL enforce password strength requirements (minimum 8 characters, uppercase, lowercase, number)
5. WHEN password is successfully reset, THE System SHALL mark the token as used and send a confirmation email

### Requirement 6: Database Schema Updates

**User Story:** As the system, I need to store password reset tokens so that the reset flow can be tracked and secured.

#### Acceptance Criteria

1. THE System SHALL create a `password_reset_tokens` table with fields: id, userId, token (hashed), expiresAt, usedAt, createdAt
2. THE System SHALL add an index on userId for efficient token lookup
3. THE System SHALL add an index on token for validation queries
4. THE System SHALL implement cascade delete when user is deleted
5. THE System SHALL automatically clean up expired tokens older than 24 hours

### Requirement 7: Frontend Registration Form Update

**User Story:** As a new user, I want a simple registration form without password fields so that registration is easier and more secure.

#### Acceptance Criteria

1. THE System SHALL remove password and confirm password fields from the registration form
2. THE System SHALL display a message informing users that credentials will be sent via email
3. WHEN registration is successful, THE System SHALL display a success message directing users to check their email
4. THE System SHALL provide a link to resend the registration email if not received
5. THE System SHALL validate email format before submission

### Requirement 8: Security and Error Handling

**User Story:** As the system, I need to handle errors securely so that user data and system integrity are protected.

#### Acceptance Criteria

1. THE System SHALL log all password reset attempts for security monitoring
2. THE System SHALL rate-limit password reset requests (maximum 3 per hour per email)
3. WHEN email sending fails, THE System SHALL log the error and notify administrators
4. THE System SHALL not reveal whether an email exists in the system during password reset
5. THE System SHALL invalidate all existing sessions when password is reset
