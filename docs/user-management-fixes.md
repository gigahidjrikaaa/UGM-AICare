# User Management Fixes for UGM-AICare Admin Dashboard

## Overview
This document outlines the fixes applied to the user management functions in the admin dashboard. The fixes address authentication issues, missing database fields, and lack of proper user management capabilities.

## Issues Fixed

### 1. **Missing User Role and Status Fields**
- **Problem**: The User model was missing essential fields like `role`, `is_active`, `created_at`, etc.
- **Solution**: Added new fields to the User model in `backend/app/models.py`

### 2. **Weak Admin Authentication**
- **Problem**: Admin authentication was not properly checking user roles
- **Solution**: Enhanced `get_admin_user` function in `backend/app/routes/admin.py` to properly validate admin/therapist roles

### 3. **Frontend Authentication Issues**
- **Problem**: Frontend was using localStorage for auth tokens instead of proper session management
- **Solution**: Created `adminApi.ts` utility to use NextAuth sessions for API calls

### 4. **Limited User Management Functions**
- **Problem**: Admin dashboard only had basic user listing and email checkin toggle
- **Solution**: Added comprehensive user management functions including:
  - User status toggle (activate/deactivate)
  - Role management (user/admin/therapist)
  - User deletion (soft/hard delete)
  - Password reset functionality

## Files Modified

### Backend Changes
1. **`backend/app/models.py`**
   - Added `role`, `is_active`, `created_at`, `updated_at`, `last_login` fields
   - Added `password_hash`, `email_verified` for future email/password auth

2. **`backend/app/routes/admin.py`**
   - Enhanced admin authentication with proper role checking
   - Added new endpoints:
     - `PUT /users/{user_id}/status` - Toggle user active status
     - `PUT /users/{user_id}/role` - Update user role
     - `DELETE /users/{user_id}` - Delete/deactivate user
     - `POST /users/{user_id}/reset-password` - Generate password reset
   - Updated response models to include new fields

### Frontend Changes
1. **`frontend/src/utils/adminApi.ts`** (NEW)
   - Authentication helper using NextAuth sessions
   - Proper error handling for API responses

2. **`frontend/src/app/admin/(protected)/users/page.tsx`**
   - Updated User interface to include new fields
   - Replaced localStorage auth with session-based auth
   - Added new user management functions
   - Enhanced UI with role badges and action dropdowns

### Database Migration
1. **`backend/migrations/add_user_management_fields.py`** (NEW)
   - SQL script to add new fields to existing users table
   - Includes indexes for performance
   - Updates existing users with default values

## Installation Instructions

### 1. Apply Database Migration
```bash
cd backend
python migrations/add_user_management_fields.py
```

### 2. Update Environment Variables
Make sure your backend has proper database connection settings.

### 3. Restart Backend Server
```bash
cd backend
# Stop existing server
# Start server with updated models
python -m uvicorn app.main:app --reload
```

### 4. Test Admin Functionality
1. Log in to admin dashboard at `/admin`
2. Navigate to Users page at `/admin/users`
3. Test new functions:
   - View user details
   - Toggle user status
   - Change user roles
   - Reset passwords
   - Delete users

## Security Considerations

### 1. **Role-Based Access Control**
- Only users with "admin" or "therapist" roles can access admin endpoints
- Only "admin" users can change roles or delete users
- Users cannot modify their own admin status

### 2. **Authentication**
- Frontend now uses proper NextAuth sessions instead of localStorage
- Backend validates JWT tokens and user roles on every request
- Proper error handling for authentication failures

### 3. **Data Protection**
- Soft delete option preserves user data while deactivating accounts
- Password reset generates secure tokens (would be emailed in production)
- User emails remain encrypted in database

## API Endpoints Reference

### User Management
- `GET /api/v1/admin/users` - List users with filtering and pagination
- `GET /api/v1/admin/users/{user_id}` - Get detailed user information
- `PUT /api/v1/admin/users/{user_id}/email-checkins` - Toggle email checkins
- `PUT /api/v1/admin/users/{user_id}/status` - Toggle user active status
- `PUT /api/v1/admin/users/{user_id}/role` - Update user role
- `DELETE /api/v1/admin/users/{user_id}` - Delete or deactivate user
- `POST /api/v1/admin/users/{user_id}/reset-password` - Generate password reset

### Authentication Requirements
All admin endpoints require:
- Valid NextAuth session
- Bearer token in Authorization header
- User with "admin" or "therapist" role
- Active user account

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Admin login works with proper role checking
- [ ] User list loads with new fields displayed
- [ ] User status can be toggled (active/inactive)
- [ ] User roles can be changed (user/admin/therapist)
- [ ] Password reset generates token
- [ ] User deletion works (both soft and hard delete)
- [ ] Non-admin users cannot access admin functions
- [ ] Error handling works for authentication failures

## Future Enhancements

1. **Email Integration**: Send actual password reset emails instead of displaying tokens
2. **Audit Logging**: Track all admin actions for compliance
3. **Bulk Operations**: Allow selecting and modifying multiple users
4. **Advanced Filtering**: Add date ranges, role filters, etc.
5. **User Impersonation**: Allow admins to view platform as specific users
6. **Export Functionality**: CSV/Excel export of user data

## Notes

- The migration script includes error handling for cases where fields already exist
- All new API endpoints include proper validation and error handling
- Frontend maintains backwards compatibility with existing functionality
- Database indexes are added for performance on commonly filtered fields
