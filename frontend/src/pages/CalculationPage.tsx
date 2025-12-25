import { Container, Title } from "@mantine/core";

import { CalculationView } from "../features/calculation/CalculationView";

export function CalculationPage() {
  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="md">
        Link Budget Calculator
      </Title>
      <CalculationView />
    </Container>
  );
}
