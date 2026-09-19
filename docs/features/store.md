# Store

**Status:** released (~100%)

**Last updated:** 2026-09-19 — from commit 278fbc5

## What it does
The `store` module provides a Redux store that can be used by client components to access global state and dispatch actions.

## Where it lives in the UI
- Shared context in the client application

## Key flows
1. **User navigates to a client component.**
2. **Component accesses the store via the `StoreProvider` context.**
3. **Component can use `useAppDispatch` and `useAppSelector` hooks to dispatch actions and read state.**

## Known limitations / in-progress
- The `store` module is already configured and working. No further work is needed to implement new functionality.
