import type { Control, FieldErrors } from "react-hook-form";
import type { CalculationRequest } from "../../../api/schemas";

export type FormSectionProps = {
  control: Control<CalculationRequest>;
  errors: FieldErrors<CalculationRequest>;
};
