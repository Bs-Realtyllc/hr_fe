```md
# store

**Status:** released (~100% complete)

## What it does
The `store` module provides a Redux toolkit for managing application state.

## Where it lives in the UI
- Client-side: `StoreProvider` wraps the app's root component, making the Redux store available via `useStore`, `useAppDispatch`, and `useAppSelector` hooks.

## Key flows
1. **Creating a Store Instance:**
   - In `storeProvider.tsx`, the `StoreProvider` component wraps the app's root component, creating a new Redux store instance using `makeStore()`.
   - The `makeStore()` function returns an instance of `AppStore`, which is then stored in `storeRef.current`.

2. **Using the Store:**
   - Components that need access to the Redux store can use the `useStore` hook to get a reference to the store instance.
   - The `useAppDispatch` and `useAppSelector` hooks allow components to dispatch actions and read state, respectively.

## Known limitations / in-progress
- No specific limitations or in-progress features are noted for this module.
- The `useStore`, `useAppDispatch`, and `useAppSelector` hooks are generic and can be used in any component that requires access to the Redux store, whether it's for dispatching actions or reading state.

```
