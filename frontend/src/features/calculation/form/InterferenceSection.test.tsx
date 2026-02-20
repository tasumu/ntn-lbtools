import { screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import { InterferenceSection } from "./InterferenceSection";
import { renderWithProviders } from "../../../test/utils";
import type { CalculationFormValues } from "./types";

function FormWrapper({
  children,
}: {
  children: (methods: ReturnType<typeof useForm<CalculationFormValues>>) => ReactNode;
}) {
  const methods = useForm<CalculationFormValues>({
    defaultValues: {
      _uplinkMitigationDb: undefined,
      _downlinkMitigationDb: undefined,
      runtime: {
        uplink: {
          frequency_hz: 14.25e9,
          bandwidth_hz: 36e6,
          rain_rate_mm_per_hr: 10,
          ground_lat_deg: 0,
          ground_lon_deg: 0,
          interference: {
            adjacent_sat_ci_db: undefined,
            cross_polar_ci_db: undefined,
            other_carrier_ci_db: undefined,
            applied: false,
          },
        },
        downlink: {
          frequency_hz: 12e9,
          bandwidth_hz: 36e6,
          rain_rate_mm_per_hr: 10,
          ground_lat_deg: 0,
          ground_lon_deg: 0,
          interference: {
            adjacent_sat_ci_db: undefined,
            cross_polar_ci_db: undefined,
            other_carrier_ci_db: undefined,
            applied: false,
          },
        },
      },
    } as CalculationFormValues,
  });
  return <FormProvider {...methods}>{children(methods)}</FormProvider>;
}

describe("InterferenceSection", () => {
  it("renders uplink interference fields", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <InterferenceSection
            control={methods.control}
            errors={methods.formState.errors}
            direction="uplink"
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByLabelText(/Apply uplink interference/)).toBeInTheDocument();
    expect(screen.getByText(/Adjacent Satellite C\/I/)).toBeInTheDocument();
    expect(screen.getByText(/Cross-Pol C\/I/)).toBeInTheDocument();
    expect(screen.getByText(/Other C\/I/)).toBeInTheDocument();
    expect(screen.getByLabelText("Info: adjacent_sat_ci")).toBeInTheDocument();
    expect(screen.getByLabelText("Info: cross_polar_ci")).toBeInTheDocument();
    expect(screen.getByLabelText("Info: other_carrier_ci")).toBeInTheDocument();
  });

  it("renders downlink interference fields", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <InterferenceSection
            control={methods.control}
            errors={methods.formState.errors}
            direction="downlink"
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByLabelText(/Apply downlink interference/)).toBeInTheDocument();
  });

  it("renders mitigation field", () => {
    renderWithProviders(
      <FormWrapper>
        {(methods) => (
          <InterferenceSection
            control={methods.control}
            errors={methods.formState.errors}
            direction="uplink"
          />
        )}
      </FormWrapper>,
    );
    expect(screen.getByLabelText(/Mitigation/)).toBeInTheDocument();
  });
});
