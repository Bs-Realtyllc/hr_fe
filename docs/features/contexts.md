# AuthContext

**Status:** released (~100% complete)
**Last updated:** 2026-09-19 — from commit 278fbc5

## What it does
Provides a context for managing authentication state in a client-side React application, allowing components to access and update authentication information such as the user and token, and to handle login and logout actions.

## Where it lives in the UI
N/A

## Key flows
1. **Login**: When a user clicks the "Login" button, the `login` function in the `AuthProvider` component is called with the user's credentials. The `useAuth` hook in the consuming component then receives the updated state, including the new user and token.
2. **Logout**: When a user clicks the "Logout" button, the `logout` function in the `AuthProvider` component is called. The `useAuth` hook in the consuming component receives the updated state, setting the user and token to null.

## Known limitations / in-progress
- The context does not provide a way to check if the token is expired or not.
- The context does not provide a way to retrieve the expiration time of the token.
