# Store

**Status:** released (~100% complete)
**Last updated:** 2026-09-19 — from commit cf1441e

## What it does
The `store` module provides a Redux store for the application, including a sidebar slice that manages the visibility of an off-canvas drawer on mobile devices.

## Where it lives in the UI
N/A

## Key flows
1. To manage the visibility of the sidebar, developers can use the `useAppDispatch` and `useAppSelector` hooks to call the `toggleSidebar` and `setSidebarOpen` actions respectively.

2. The `StoreProvider` component is used to provide the Redux store to the application's client-side components. This component is typically used as a root component in the application’s client-side code.

## Known limitations / in-progress
- No specific limitations are noted in the provided code.
- No ongoing work is indicated in the provided code.
