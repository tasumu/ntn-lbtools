import { useMutation } from "@tanstack/react-query";

import { request } from "../../api/client";
import type { CalculationRequest } from "../../api/schemas";
import type { SweepConfig, SweepResponse } from "./sweepTypes";

export type SweepRequestPayload = {
  base_request: CalculationRequest;
  sweep: SweepConfig;
  threshold_db: number | null;
};

function executeSweep(payload: SweepRequestPayload): Promise<SweepResponse> {
  return request<SweepResponse>({
    method: "POST",
    url: "/link-budgets/sweep",
    data: payload,
    timeout: 30000,
  });
}

export function useSweepMutation() {
  return useMutation<SweepResponse, unknown, SweepRequestPayload>({
    mutationFn: executeSweep,
  });
}
