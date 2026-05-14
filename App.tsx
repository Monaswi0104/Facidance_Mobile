import React from "react";
import { Provider } from "react-redux";
import { store } from "./src/store/store";
import RootNavigator from "./src/navigation/RootNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ThemeProvider } from "./src/theme/Theme";

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
      </ThemeProvider>
    </Provider>
  );
}