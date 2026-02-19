import { screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import { AssetSummaryCard } from "./AssetSummaryCard";
import type { CalculationRequest } from "../../../api/schemas";
import { mockSatellite, mockEarthStation } from "../../../test/handlers";
import { theme } from "../../../theme";

function Wrapper({
  children,
  defaultValues,
}: {
  children: (control: ReturnType<typeof useForm<CalculationRequest>>["control"]) => ReactNode;
  defaultValues: Partial<CalculationRequest>;
}) {
  const methods = useForm<CalculationRequest>({
    defaultValues: defaultValues as CalculationRequest,
  });
  return (
    <MantineProvider theme={theme}>
      <FormProvider {...methods}>{children(methods.control)}</FormProvider>
    </MantineProvider>
  );
}

describe("AssetSummaryCard", () => {
  it("renders nothing when no assets are selected", () => {
    const { container } = render(
      <Wrapper defaultValues={{ satellite_id: "", earth_station_tx_id: "", earth_station_rx_id: "" }}>
        {(control) => (
          <AssetSummaryCard
            control={control}
            errors={{}}
            satellites={[mockSatellite]}
            earthStations={[mockEarthStation]}
          />
        )}
      </Wrapper>,
    );
    expect(container.querySelector("[class*='Paper']")).toBeNull();
  });

  it("renders satellite info when satellite is selected", () => {
    render(
      <Wrapper defaultValues={{ satellite_id: "sat-001" }}>
        {(control) => (
          <AssetSummaryCard
            control={control}
            errors={{}}
            satellites={[mockSatellite]}
            earthStations={[mockEarthStation]}
          />
        )}
      </Wrapper>,
    );
    expect(screen.getByText("Satellite")).toBeInTheDocument();
    expect(screen.getByText("Test Satellite")).toBeInTheDocument();
  });

  it("renders earth station info when TX is selected", () => {
    render(
      <Wrapper defaultValues={{ earth_station_tx_id: "es-001" }}>
        {(control) => (
          <AssetSummaryCard
            control={control}
            errors={{}}
            satellites={[mockSatellite]}
            earthStations={[mockEarthStation]}
          />
        )}
      </Wrapper>,
    );
    expect(screen.getByText("Earth Station (TX)")).toBeInTheDocument();
    expect(screen.getByText("Test Earth Station")).toBeInTheDocument();
  });
});
