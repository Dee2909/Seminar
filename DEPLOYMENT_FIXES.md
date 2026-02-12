# Deployment Configuration Fixes

## Issues Found and Fixed

### 1. **Client Environment Variable** ❌ → ✅
**Problem**: Using wrong variable name `VITE_CLIENT_ORIGIN` instead of `VITE_API_BASE_URL`
**Fix**: Changed to `VITE_API_BASE_URL=https://seminar-17h6.onrender.com`

### 2. **Server Environment Variables** ❌ → ✅
**Problems**: 
- `CLIENT_ORIGIN` was pointing to `localhost` instead of production URL
- Missing `JWT_SECRET` environment variable

**Fixes**: 
- Updated `CLIENT_ORIGIN=https://seminar-17h6.onrender.com`
- Added `JWT_SECRET=your-production-secret-change-this` (you should change this to a strong random secret)

### 3. **Cookie Configuration** ❌ → ✅
**Problem**: Cookies were configured for localhost only (`secure: false`, `sameSite: 'lax'`)
- This prevents cookies from working across different domains (e.g., frontend on one domain, backend on another)
- HTTPS requires `secure: true` and `sameSite: 'none'` for cross-origin cookies

**Fixes**:
- Made cookie settings dynamic based on environment
- Production (HTTPS): `secure: true`, `sameSite: 'none'`
- Development: `secure: false`, `sameSite: 'lax'`
- Added automatic detection based on `CLIENT_ORIGIN` containing `https://`

### 4. **AuthContext API Base URL** ❌ → ✅
**Problem**: Using wrong environment variable name
**Fix**: Updated to use `VITE_API_BASE_URL` with fallback to localhost

## Next Steps

### For Render Deployment:

1. **Update Server Environment Variables on Render Dashboard**:
   - Go to your backend service on Render
   - Navigate to "Environment" section
   - Add/Update these variables:
     ```
     CLIENT_ORIGIN=https://seminar-17h6.onrender.com
     JWT_SECRET=<generate-a-strong-random-secret-here>
     NODE_ENV=production
     ```

2. **Generate a Strong JWT Secret**:
   You can generate one using this command:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Redeploy Your Services**:
   - Push the changes to your Git repository
   - Render will automatically redeploy
   - Or manually trigger a deploy from the Render dashboard

### For Local Development:

To switch back to local development, update these files:

**client/.env**:
```
VITE_API_BASE_URL=http://localhost:5001
```

**server/.env**:
```
CLIENT_ORIGIN=http://localhost:5174
```

## Why These Changes Fix the Issues

1. **401 Unauthorized Errors**: Fixed because cookies now work properly with HTTPS and cross-origin requests
2. **Login then logout on refresh**: Fixed because cookies are now properly set with the correct `sameSite` and `secure` flags
3. **CORS Issues**: Fixed because `CLIENT_ORIGIN` now matches your actual frontend URL

## Important Security Notes

⚠️ **CHANGE THE JWT_SECRET**: The placeholder value `your-production-secret-change-this` is NOT secure. Generate a strong random secret before deploying.

⚠️ **Environment Variables**: Make sure to update environment variables on Render dashboard, not just in local .env files. The .env files are for local development only.

## Testing

After deployment:
1. Clear your browser cookies and cache
2. Visit your deployed frontend URL
3. Try logging in as admin or team
4. Refresh the page - you should stay logged in
5. All API calls should now work without 401 errors
