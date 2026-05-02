import React from "react";
import RootNavigator from "./src/navigation/RootNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ThemeProvider } from "./src/theme/Theme";

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </ThemeProvider>
  );
}