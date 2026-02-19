import type { Control, FieldErrors } from "react-hook-form";
import type { CalculationRequest } from "../../../api/schemas";

export type CalculationFormValues = CalculationRequest & {
  _uplinkMitigationDb?: number;
  _downlinkMitigationDb?: number;
};

export type FormSectionProps = {
  control: Control<CalculationFormValues>;
  errors: FieldErrors<CalculationFormValues>;
};
