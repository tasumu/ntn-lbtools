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
import "@mantine/notifications/styles.css";

import { Notifications } from "@mantine/notifications";

import { theme } from "./theme";
import { ApiProvider } from "./api/provider";

const CalculationPage = React.lazy(() =>
  import("./pages/CalculationPage").then((m) => ({
    default: m.CalculationPage,
  })),
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
  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/" || location.pathname.startsWith("/scenarios/")
      : location.pathname === path;
  const linkStyle = (path: string) => ({
    textDecoration: "none",
    fontWeight: isActive(path) ? 700 : 500,
    color: "inherit",
  });
  return (
    <nav aria-label="Main navigation">
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
    </nav>
  );
}

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="top-right" />
        <ApiProvider>
          <BrowserRouter>
            <a
              href="#main-content"
              style={{
                position: "absolute",
                left: "-9999px",
                top: "auto",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }}
              onFocus={(e) => {
                e.currentTarget.style.position = "static";
                e.currentTarget.style.width = "auto";
                e.currentTarget.style.height = "auto";
              }}
              onBlur={(e) => {
                e.currentTarget.style.position = "absolute";
                e.currentTarget.style.left = "-9999px";
                e.currentTarget.style.width = "1px";
                e.currentTarget.style.height = "1px";
              }}
            >
              Skip to main content
            </a>
            <NavBar />
            <main id="main-content">
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
                  path="/scenarios/:scenarioId"
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
            </main>
          </BrowserRouter>
        </ApiProvider>
      </MantineProvider>
    </React.StrictMode>,
  );
}
