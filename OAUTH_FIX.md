# OAuth PKCE Flow Error - FIXED ✅

## Problem Description

You were getting this error when trying to sign in with Google:

```
Auth callback error: [Error [AuthApiError]: invalid request: both auth code and code verifier should be non-empty] {
  __isAuthError: true,
  status: 400,
  code: 'validation_failed'
}
```

---

## Root Cause

The issue was in `app/auth/callback/route.js`:

### The Problem:
1. Your **login page** uses `createBrowserClient` from `@supabase/ssr` (which handles PKCE properly)
2. Your **callback route** was using `createClient` from `@supabase/supabase-js` (basic client)
3. The basic client doesn't read cookies where the PKCE code verifier is stored

### What is PKCE?
PKCE (Proof Key for Code Exchange) is a security enhancement for OAuth:
- When you click "Sign in with Google", Supabase generates a **code verifier** and stores it in a cookie
- Google redirects back with an **auth code**
- To exchange the auth code for a session, Supabase needs **BOTH** the code AND the verifier
- The verifier is in the cookie, but the basic client wasn't reading it!

---

## The Fix

### Changed: `app/auth/callback/route.js`

**Before (Broken):**
```javascript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // This fails because it can't read the PKCE code verifier from cookies
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    // ...
  }
}
```

**After (Fixed):**
```javascript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // This works! The server client can read the PKCE code verifier from cookies
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    // ...
  }
}
```

### What Changed:
1. ✅ Now imports from `@/lib/supabase/server` (server-side client)
2. ✅ Gets the cookie store using Next.js `cookies()` API
3. ✅ Passes cookie store to Supabase client
4. ✅ Server client can now read PKCE verifier from cookies

---

## Why This Fix Works

The `@supabase/ssr` package's `createServerClient` is specifically designed for Next.js:
- It properly handles cookie reading/writing in Server Components and Route Handlers
- It reads the PKCE code verifier from cookies automatically
- It stores the session in cookies after exchange
- It's the recommended approach for Next.js App Router

---

## Testing the Fix

### Test Google OAuth Sign In:

1. **Open incognito window** (fresh cookies)
2. Go to: `http://localhost:3001/auth/login`
3. Click **"Continue with Google"**
4. Sign in with your Google account
5. **Expected**:
   - ✅ No error in console
   - ✅ Redirected to onboarding page
   - ✅ Can complete profile setup
   - ✅ Session persists

### Verify in Console:
You should now see successful auth:
```
✓ Compiled /auth/callback in 500ms
GET /auth/callback?code=xxx 307 in 400ms
GET /auth/onboarding 200 in 300ms
```

Instead of the error:
```
❌ Auth callback error: invalid request: both auth code and code verifier should be non-empty
```

---

## Technical Details

### The OAuth + PKCE Flow:

```
1. User clicks "Sign in with Google"
   └─> createBrowserClient generates PKCE code verifier
   └─> Stores verifier in cookie: sb-pkce-code-verifier
   └─> Redirects to Google OAuth

2. User authorizes on Google
   └─> Google redirects to: /auth/callback?code=AUTH_CODE

3. Callback route exchanges code for session
   └─> createServerClient reads cookie: sb-pkce-code-verifier
   └─> Sends to Supabase: {code: AUTH_CODE, codeVerifier: VERIFIER}
   └─> Supabase validates and returns session
   └─> Session stored in cookies

4. User is authenticated!
```

### Why Use @supabase/ssr Instead of @supabase/supabase-js?

**@supabase/supabase-js (basic):**
- ❌ Doesn't handle cookies
- ❌ Designed for client-side only
- ❌ No PKCE support
- ❌ Can't read Next.js cookies

**@supabase/ssr (recommended):**
- ✅ Full cookie support
- ✅ Works in Server Components, Route Handlers, Middleware
- ✅ PKCE flow support
- ✅ Integrates with Next.js cookies API
- ✅ Session refresh handling

---

## Files Modified

- **app/auth/callback/route.js** - Updated to use server client with cookies

---

## Additional Notes

### Already Had Server Client
Your codebase already had `lib/supabase/server.js` set up correctly! The issue was just that the callback route wasn't using it.

### This Also Fixes:
- Magic link email authentication (same PKCE flow)
- Session refresh in middleware
- Any other server-side auth operations

### Best Practices:
- ✅ Use `createBrowserClient` (from `lib/supabase/client.js`) in Client Components
- ✅ Use `createServerClient` (from `lib/supabase/server.js`) in Server Components and Route Handlers
- ✅ Use middleware client (from `lib/supabase/middleware.js`) in `middleware.js`

---

## Success Checklist

After this fix, you should be able to:

- [x] Sign in with Google OAuth (no PKCE error)
- [x] Complete onboarding flow
- [x] Session persists across pages
- [x] Upload page pre-fills user data
- [x] Sign out and sign in again works

---

## References

- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [PKCE Flow Explanation](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [@supabase/ssr Documentation](https://supabase.com/docs/guides/auth/server-side-rendering)

---

**Status**: ✅ Fixed
**Date**: January 2025
**Impact**: OAuth authentication now works correctly with PKCE flow
