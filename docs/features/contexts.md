```md
# AuthContext

**Status:** released (~100% complete) (~2026-09-14)

## What it does
The `AuthContext` provides a centralized access to user authentication state and functions for managing authentication, making it easy for other components to check if a user is authenticated and to log in or log out.

## Where it lives in the UI
N/A — consumed by `src/pages/api/auth/[...nextauth].ts` and other components for authentication purposes.

## Key flows
1. **Login:** A user logs in by providing a token and user details.
2. **Logout:** A user logs out by calling the `logout` function, which clears the authentication state.
3. **Check Authentication:** Components can check if the user is authenticated using the `useAuth` hook.

## Known limitations / in-progress
- Currently, there are no limitations or in-progress features.
```
