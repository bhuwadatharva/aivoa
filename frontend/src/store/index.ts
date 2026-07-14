import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import authReducer from './authSlice';
import hcpReducer from './hcpSlice';
import interactionReducer from './interactionSlice';
import chatReducer from './chatSlice';
import dashboardReducer from './dashboardSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    hcp: hcpReducer,
    interaction: interactionReducer,
    chat: chatReducer,
    dashboard: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
