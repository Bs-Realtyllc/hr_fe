# AuthContext

**Status:** released (~100% complete)
**Last updated:** 2026-09-19 — from commit cf1441e

## What it does
The `AuthContext` provides access to authentication-related data and methods, including user information, authentication status, and methods for logging in and logging out.

## Where it lives in the UI
N/A — used within the `AuthProvider` component to provide the context to its children.

## Known limitations / in-progress
- The context is reactive and can be used in any React component to fetch and dispatch authentication-related actions.
- The `useAuth` hook is part of the context and ensures that the context's provider is used within the `AuthProvider` for proper context propagation.
- The `AuthProvider` uses a utility function `getUser()` and `getToken()` from the `@/lib/auth` module to fetch user information and authentication token respectively.
- The `login` method requires a token and user object to log in a user.
- The `logout` method clears the authentication state and sets the user to null.
- The context is initialized with `getUser()` and `getToken()` calls within the `useEffect` hook.
