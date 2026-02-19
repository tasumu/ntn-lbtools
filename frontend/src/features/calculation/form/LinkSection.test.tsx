import { screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import { LinkSection } from "./LinkSection";
import { renderWithProviders } from "../../../test/utils";
import type { CalculationRequest } from "../../../api/schemas";

function FormWrapper({
  children,
}: {
  children: (
    methods: ReturnType<typeof useForm<CalculationRequest>>,
  ) => ReactNode;
}) {
  const methods = useForm<CalculationRequest>({
    defaultValues: {
      runtime: {
        uplink: {
          frequency_hz: 14.25e9,
          bandwidth_hz: 36e6,
          rain_rate_mm_per_hr: 10,
          ground_lat_deg: 0,
          ground_lon_deg: 0,
        },
        downlink: {
          frequency_hz: 12e9,
          bandwidth_hz: 36e6,
          rain_rate_mm_per_hr: 10,
          ground_lat_deg: 0,
          ground_lon_deg: 0,
        },
      },
    } as CalculationRequest,
  });
  return <FormProvider {...methods}>{children(methods)}</FormProvider>;
}

describe("LinkSection", () => {
  it("renders uplink section with correct label", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <LinkSection
            control={methods.control}
            errors={methods.formState.errors}
            direction="uplink"
            transponderType="TRANSPARENT"
            filteredModcodOptions={[]}
            modcodLoading={false}
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByText(/Uplink.*earth.*satellite/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Uplink frequency/)).toBeInTheDocument();
  });

  it("renders downlink section with correct label", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <LinkSection
            control={methods.control}
            errors={methods.formState.errors}
            direction="downlink"
            transponderType="TRANSPARENT"
            filteredModcodOptions={[]}
            modcodLoading={false}
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByText(/Downlink.*satellite.*earth/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Downlink frequency/)).toBeInTheDocument();
  });

  it("shows modcod and bandwidth selectors for REGENERATIVE", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <LinkSection
            control={methods.control}
            errors={methods.formState.errors}
            direction="uplink"
            transponderType="REGENERATIVE"
            filteredModcodOptions={[
              { value: "mc-001", label: "DVB_S2X v1.0.0" },
            ]}
            modcodLoading={false}
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByText(/Uplink ModCod Table/)).toBeInTheDocument();
    expect(screen.getByText(/Uplink bandwidth/)).toBeInTheDocument();
  });

  it("renders ground coordinate fields", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <LinkSection
            control={methods.control}
            errors={methods.formState.errors}
            direction="uplink"
            transponderType="TRANSPARENT"
            filteredModcodOptions={[]}
            modcodLoading={false}
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByLabelText(/Uplink ground latitude/)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Uplink ground longitude/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Uplink altitude/)).toBeInTheDocument();
  });
});
