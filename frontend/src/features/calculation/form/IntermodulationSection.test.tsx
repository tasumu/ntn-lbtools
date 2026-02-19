import { screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import { IntermodulationSection } from "./IntermodulationSection";
import { renderWithProviders } from "../../../test/utils";
import type { CalculationRequest } from "../../../api/schemas";

function FormWrapper({
  children,
}: {
  children: (methods: ReturnType<typeof useForm<CalculationRequest>>) => ReactNode;
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
        intermodulation: {
          input_backoff_db: undefined,
          output_backoff_db: undefined,
          saturation_power_dbw: undefined,
          composite_carriers: undefined,
          reference_bandwidth_hz: undefined,
          applied: false,
        },
      },
    } as CalculationRequest,
  });
  return <FormProvider {...methods}>{children(methods)}</FormProvider>;
}

describe("IntermodulationSection", () => {
  it("renders intermodulation fields", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <IntermodulationSection
            control={methods.control}
            errors={methods.formState.errors}
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByLabelText(/Apply intermodulation/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Input back-off/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Output back-off/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Composite carriers/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reference bandwidth/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Saturation power/)).toBeInTheDocument();
  });
});
