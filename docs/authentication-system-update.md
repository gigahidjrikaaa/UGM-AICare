# Authentication System Updates for UGM-AICare

## Overview

This document outlines the new authentication system that supports multiple user types with different sign-in methods and enhanced security practices.

## Authentication Routes

### User-Facing Routes

- `/signin` - Regular email/password authentication for general users
- `/signin-ugm` - Google OAuth specifically for UGM students  
- `/signup` - New user registration with email/password
- `/forgot-password` - Password reset flow
- `/admin` - Admin dashboard login

## Authentication Providers

### 1. Regular Credentials

Provider ID: "credentials"
Endpoint: /api/v1/auth/user/login
Use case: General users with email/password

```typescript
signIn("credentials", { email, password })
```

### 2. Google OAuth

Provider ID: "google"
Endpoint: Google OAuth + backend sync
Use case: UGM students with @ugm.ac.id emails

```typescript
signIn("google", { callbackUrl: "/aika" })
```

### 3. Admin Credentials

Provider ID: "admin-login"
Endpoint: /api/v1/auth/login
Use case: Admin panel access

```typescript
signIn("admin-login", { email, password })
```

## Security Enhancements

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character (@$!%*?&)

### Input Validation

- Email format validation using regex
- Real-time client-side validation
- Server-side validation in backend
- CSRF protection via NextAuth
- Secure cookie settings

### Form Security Features

- Password visibility toggle
- Loading states to prevent double submission
- Comprehensive error handling  
- Rate limiting (backend implementation needed)
- Account lockout protection (backend implementation needed)

## Backend Integration Requirements

### New Endpoints Needed

#### 1. User Registration

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com", 
  "password": "SecureP@ss123"
}

Response: 201 Created
{
  "message": "User created successfully",
  "user_id": 123
}
```

#### 2. User Login

```bash
POST /api/v1/auth/user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}

Response: 200 OK
{
  "id": "123",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user"
}
```

#### 3. Password Reset

```bash
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: 200 OK
{
  "message": "Password reset email sent"
}
```

### Database Schema Updates

#### Users Table Enhancement

```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;

-- Add indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### Password Reset Tokens Table

```sql
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
```

## Frontend Implementation Details

### Sign-In Page Features

- Responsive glassmorphism design
- Progressive enhancement
- Accessibility compliance (ARIA labels, keyboard navigation)
- Loading states and error handling
- Cross-linking between auth pages

### Form Validation

```typescript
// Client-side validation patterns
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
```

### Error Handling

```typescript
// Comprehensive error mapping
if (result?.error === "CredentialsSignin") {
  setError("Invalid email or password. Please try again.");
} else if (result?.error === "AccessDenied") {
  setError("Access denied. Please check your credentials.");
}
```

## Middleware Updates

### Route Protection

```typescript
// Updated middleware patterns
if (pathname.startsWith('/admin/dashboard')) {
  // Admin-only routes
}

if ((pathname.startsWith('/signin') || pathname.startsWith('/signin-ugm')) && session) {
  // Redirect authenticated users away from login pages
}

if (pathname.startsWith('/aika') && !session) {
  // Protect authenticated routes
}
```

## Testing Checklist

### Authentication Flow Testing

- [ ] Regular user registration
- [ ] Regular user login
- [ ] UGM student Google OAuth
- [ ] Admin panel access
- [ ] Password reset flow
- [ ] Form validation (client & server)
- [ ] Error handling scenarios
- [ ] Route protection middleware
- [ ] Session persistence
- [ ] Logout functionality

### Security Testing

- [ ] SQL injection protection
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Password hashing verification
- [ ] Rate limiting (when implemented)
- [ ] Session timeout handling

## Migration Guide

### For Existing Users

1. Existing UGM users continue using Google OAuth at `/signin-ugm`
2. New route `/signin` becomes the default entry point
3. Admin users continue using `/admin` login
4. Update all internal links to point to appropriate sign-in methods

### For Developers

1. Update authentication-related imports
2. Test all authentication flows
3. Update documentation and API references
4. Configure environment variables for new endpoints

## Environment Variables

### Required New Variables

```env
# Email service for password reset (if using external service)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@ugm-aicare.com
SMTP_PASS=your_smtp_password

# Password reset settings
RESET_TOKEN_EXPIRY=3600  # 1 hour in seconds
FRONTEND_URL=https://aicare.ugm.ac.id
```

This authentication system provides a comprehensive, secure, and user-friendly experience while maintaining the existing Google OAuth flow for UGM students.
