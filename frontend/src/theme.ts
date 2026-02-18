import { createTheme, MantineColorsTuple } from "@mantine/core";

const uplink: MantineColorsTuple = [
  "#e6fcf5", "#c3fae8", "#96f2d7", "#63e6be", "#38d9a9",
  "#20c997", "#12b886", "#0ca678", "#099268", "#087f5b",
];

const downlink: MantineColorsTuple = [
  "#e7f5ff", "#d0ebff", "#a5d8ff", "#74c0fc", "#4dabf7",
  "#339af0", "#228be6", "#1c7ed6", "#1971c2", "#1864ab",
];

const signal: MantineColorsTuple = [
  "#e3fafc", "#c5f6fa", "#99e9f2", "#66d9e8", "#3bc9db",
  "#22b8cf", "#15aabf", "#1098ad", "#0c8599", "#0b7285",
];

export const theme = createTheme({
  primaryColor: "signal",
  colors: {
    uplink,
    downlink,
    signal,
    dark: [
      "#C1C2C5", "#A6A7AB", "#909296", "#5c5f66", "#373A40",
      "#2C2E33", "#1A1B1E", "#141517", "#101113", "#0a0e1a",
    ],
  },
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', 'Fira Code', monospace",
  headings: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  defaultRadius: "md",
  components: {
    Card: {
      defaultProps: {
        shadow: "sm",
      },
    },
  },
});
