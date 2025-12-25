import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, Container, Group } from "@mantine/core";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";

import "@mantine/core/styles.css";

import { CalculationPage } from "./pages/CalculationPage";
import { AssetsPage } from "./pages/AssetsPage";
import { ApiProvider } from "./api/provider";

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
      <Group gap="md">
        <Link to="/" style={linkStyle("/")}>
          Calculate
        </Link>
        <Link to="/assets" style={linkStyle("/assets")}>
          Assets
        </Link>
      </Group>
    </Container>
  );
}

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <MantineProvider>
        <ApiProvider>
          <BrowserRouter>
            <NavBar />
            <Routes>
              <Route path="/" element={<CalculationPage />} />
              <Route path="/assets" element={<AssetsPage />} />
            </Routes>
          </BrowserRouter>
        </ApiProvider>
      </MantineProvider>
    </React.StrictMode>,
  );
}
