import { Container, Title } from "@mantine/core";
import { useParams } from "react-router-dom";

import { CalculationView } from "../features/calculation/CalculationView";

export function CalculationPage() {
  const { scenarioId } = useParams<{ scenarioId?: string }>();
  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="md">
        Link Budget Calculator
      </Title>
      <CalculationView initialScenarioId={scenarioId} />
    </Container>
  );
}
