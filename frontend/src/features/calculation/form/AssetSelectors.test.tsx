import { screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import { AssetSelectors } from "./AssetSelectors";
import { renderWithProviders } from "../../../test/utils";
import type { CalculationRequest } from "../../../api/schemas";

function FormWrapper({
  children,
}: {
  children: (methods: ReturnType<typeof useForm<CalculationRequest>>) => ReactNode;
}) {
  const methods = useForm<CalculationRequest>({
    defaultValues: {
      waveform_strategy: "DVB_S2X",
      transponder_type: "TRANSPARENT",
      satellite_id: "",
    } as CalculationRequest,
  });
  return <FormProvider {...methods}>{children(methods)}</FormProvider>;
}

describe("AssetSelectors", () => {
  it("renders waveform and transponder selectors", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <AssetSelectors
            control={methods.control}
            errors={methods.formState.errors}
            transponderType="TRANSPARENT"
            waveformOptions={[{ value: "DVB_S2X", label: "DVB-S2X" }]}
            filteredModcodOptions={[
              { value: "mc-001", label: "DVB_S2X v1.0.0" },
            ]}
            satelliteOptions={[
              { value: "sat-001", label: "Test Satellite" },
            ]}
            earthStationOptions={[
              { value: "es-001", label: "Test ES" },
            ]}
            modcodLoading={false}
            satelliteLoading={false}
            earthStationLoading={false}
            satellites={[]}
            earthStations={[]}
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByText("Waveform")).toBeInTheDocument();
    expect(screen.getByText("Transponder")).toBeInTheDocument();
    expect(screen.getByText("Satellite")).toBeInTheDocument();
    expect(screen.getByLabelText("Info: waveform")).toBeInTheDocument();
    expect(screen.getByLabelText("Info: transponder_type")).toBeInTheDocument();
  });

  it("renders ModCod Table selector for TRANSPARENT mode", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <AssetSelectors
            control={methods.control}
            errors={methods.formState.errors}
            transponderType="TRANSPARENT"
            waveformOptions={[]}
            filteredModcodOptions={[
              { value: "mc-001", label: "DVB_S2X v1.0.0" },
            ]}
            satelliteOptions={[]}
            earthStationOptions={[]}
            modcodLoading={false}
            satelliteLoading={false}
            earthStationLoading={false}
            satellites={[]}
            earthStations={[]}
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByText("ModCod Table")).toBeInTheDocument();
  });

  it("renders Earth Station TX and RX selectors", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <AssetSelectors
            control={methods.control}
            errors={methods.formState.errors}
            transponderType="TRANSPARENT"
            waveformOptions={[]}
            filteredModcodOptions={[]}
            satelliteOptions={[]}
            earthStationOptions={[
              { value: "es-001", label: "Test ES" },
            ]}
            modcodLoading={false}
            satelliteLoading={false}
            earthStationLoading={false}
            satellites={[]}
            earthStations={[]}
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByText("Earth Station (TX)")).toBeInTheDocument();
    expect(screen.getByText("Earth Station (RX)")).toBeInTheDocument();
    expect(screen.getByLabelText("Info: earth_station_tx")).toBeInTheDocument();
    expect(screen.getByLabelText("Info: earth_station_rx")).toBeInTheDocument();
  });
});
