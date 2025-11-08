# Implementation Plan

- [ ] 1. Database schema updates
  - [x] 1.1 Create password_reset_tokens table in Prisma schema



    - Add PasswordResetToken model with id, userId, token, expiresAt, usedAt, createdAt fields
    - Add relation to User model
    - Add indexes on userId and token


    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 1.2 Generate and run Prisma migration
    - Run `npx prisma migrate dev --name add-password-reset-tokens`


    - Verify migration creates table correctly
    - _Requirements: 6.1_


- [ ] 2. Backend password and token generation services
  - [ ] 2.1 Create password generator utility
    - Implement generateSecurePassword() function
    - Generate 12-16 character passwords with mixed case, numbers, special chars
    - _Requirements: 1.2_
  


  - [ ] 2.2 Create token generation and validation utilities
    - Implement generateResetToken() for 32-character tokens
    - Implement hashToken() using crypto
    - Implement validateToken() for comparison
    - _Requirements: 4.1, 4.2_


- [ ] 3. Update email templates with branding
  - [ ] 3.1 Create branded welcome email template
    - Design HTML template with 24Rx logo and blue theme
    - Include email and generated password

    - Add login CTA button
    - Make responsive for mobile
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 3.2 Create password reset request email template


    - Design HTML template with reset link
    - Include 1-hour expiration notice
    - Add security warning

    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 3.3 Create password changed confirmation email template
    - Design HTML template confirming password change
    - Include security notice and support contact
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_


- [ ] 4. Update registration flow
  - [ ] 4.1 Modify RegisterDto to remove password field
    - Remove password and confirmPassword from DTO
    - Update validation decorators
    - _Requirements: 1.1, 7.1_


  
  - [x] 4.2 Update registration service logic

    - Generate secure password using utility
    - Hash generated password
    - Store user with hashed password
    - Send welcome email with credentials
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  
  - [ ] 4.3 Update email service to send welcome email
    - Implement sendWelcomeEmail() method
    - Render template with user data and password
    - Handle email sending errors
    - _Requirements: 1.3, 1.4_

- [x] 5. Implement forgot password endpoint

  - [ ] 5.1 Create ForgotPasswordDto
    - Add email field with validation
    - _Requirements: 3.2_
  

  - [ ] 5.2 Implement forgot password controller endpoint
    - Create POST /auth/forgot-password endpoint
    - Validate email format
    - Return generic success message
    - _Requirements: 3.1, 3.2, 3.6_

  
  - [ ] 5.3 Implement forgot password service logic
    - Find user by email
    - Generate reset token
    - Hash and store token with 1-hour expiration
    - Invalidate any existing tokens for user
    - Send password reset email
    - _Requirements: 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.5_


- [ ] 6. Implement password reset endpoint
  - [ ] 6.1 Create ResetPasswordDto
    - Add token, newPassword, confirmPassword fields
    - Add validation decorators
    - _Requirements: 5.3_


  
  - [ ] 6.2 Implement reset password controller endpoint
    - Create POST /auth/reset-password endpoint
    - Validate passwords match
    - Validate password strength
    - _Requirements: 5.1, 5.3, 5.4_
  


  - [ ] 6.3 Implement reset password service logic
    - Validate token exists and not expired
    - Validate token not already used

    - Hash new password
    - Update user password
    - Mark token as used
    - Send confirmation email
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 4.4_


  
  - [ ] 6.4 Implement token validation endpoint
    - Create GET /auth/validate-reset-token/:token endpoint
    - Check token validity and expiration
    - Return validation status
    - _Requirements: 5.1_

- [x] 7. Add rate limiting for password reset

  - [ ] 7.1 Implement rate limiting middleware
    - Limit to 3 requests per hour per email
    - Use in-memory or Redis-based rate limiter
    - Return 429 status when limit exceeded
    - _Requirements: 8.2_

- [ ] 8. Update frontend registration form
  - [ ] 8.1 Remove password fields from registration form
    - Remove password and confirmPassword inputs


    - Update form validation
    - _Requirements: 7.1, 7.2_
  
  - [x] 8.2 Add email credential notice

    - Display message about credentials being sent via email
    - Update success message to check email
    - _Requirements: 7.2, 7.3_

- [ ] 9. Create forgot password page
  - [ ] 9.1 Create /auth/forgot-password page
    - Add email input field
    - Add submit button
    - Add link back to login
    - Handle form submission
    - Display success/error messages
    - _Requirements: 3.1, 3.2, 7.3_

- [ ] 10. Create reset password page
  - [ ] 10.1 Create /auth/reset-password page
    - Extract token from URL query parameter
    - Validate token on page load
    - Add new password and confirm password fields
    - Add password strength indicator
    - Handle form submission
    - Display success/error messages
    - Redirect to login on success
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Add forgot password link to login page
  - [ ] 11.1 Update login page UI
    - Add "Forgot Password?" link below login form
    - Link to /auth/forgot-password page
    - _Requirements: 3.1_

- [ ] 12. Error handling and logging
  - [ ] 12.1 Add comprehensive error handling
    - Handle email sending failures
    - Handle invalid tokens
    - Handle expired tokens
    - Handle rate limit errors
    - Log all password reset attempts
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 13. Testing and validation
  - [ ] 13.1 Test complete registration flow
    - Register new user
    - Verify email received
    - Login with generated password
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 13.2 Test password reset flow
    - Request password reset
    - Verify email received
    - Click reset link
    - Set new password
    - Login with new password
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 13.3 Test error scenarios
    - Test expired token
    - Test used token
    - Test invalid token
    - Test rate limiting
    - Test email sending failures
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
