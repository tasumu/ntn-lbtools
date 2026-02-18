import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Alert, Button, Center, Container, Loader, Stack } from "@mantine/core";
import { MantineProvider } from "@mantine/core";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import "@mantine/core/styles.css";

import { theme } from "./theme";
import { ApiProvider } from "./api/provider";

const CalculationPage = React.lazy(() =>
  import("./pages/CalculationPage").then((m) => ({ default: m.CalculationPage })),
);
const AssetsPage = React.lazy(() =>
  import("./pages/AssetsPage").then((m) => ({ default: m.AssetsPage })),
);

function PageLoader() {
  return (
    <Center py="xl">
      <Loader size="lg" />
    </Center>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return (
    <Container size="sm" py="xl">
      <Alert color="red" title="Something went wrong">
        <Stack gap="sm">
          <div>{message}</div>
          <Button variant="outline" color="red" onClick={resetErrorBoundary}>
            Try again
          </Button>
        </Stack>
      </Alert>
    </Container>
  );
}

function NavBar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const linkStyle = (path: string) => ({
    textDecoration: "none",
    fontWeight: isActive(path) ? 700 : 500,
    color: "inherit",
  });
  return (
    <Container size="lg" py="sm">
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Link to="/" style={linkStyle("/")}>
          Calculate
        </Link>
        <Link to="/assets" style={linkStyle("/assets")}>
          Assets
        </Link>
      </div>
    </Container>
  );
}

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <ApiProvider>
          <BrowserRouter>
            <NavBar />
            <Routes>
              <Route
                path="/"
                element={
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Suspense fallback={<PageLoader />}>
                      <CalculationPage />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="/assets"
                element={
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Suspense fallback={<PageLoader />}>
                      <AssetsPage />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
            </Routes>
          </BrowserRouter>
        </ApiProvider>
      </MantineProvider>
    </React.StrictMode>,
  );
}
