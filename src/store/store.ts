/**
 * Redux store configured with RTK Query middleware.
 *
 * Usage in App.tsx:
 *   import { Provider } from "react-redux";
 *   import { store } from "./src/store/store";
 *   <Provider store={store}> ... </Provider>
 */
import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { adminApi } from "./api/adminApi";

export const store = configureStore({
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializable check for RTK Query's internal actions
      serializableCheck: false,
    }).concat(adminApi.middleware),
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
