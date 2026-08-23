export const colors = {
  background: {
    primary: "#F4F8FC",
    secondary: "#EDF4FB",
    elevated: "#FFFFFF",
    subtle: "#F7FAFF",
    information: "#EDF5FF",
  },

  text: {
    primary: "#0F172A",
    secondary: "#334155",
    muted: "#64748B",
    subtle: "#94A3B8",
    inverse: "#FFFFFF",
  },

  border: {
    default: "#DCE6F0",
    strong: "#C7D5E4",
    focus: "#2563EB",
  },

  brand: {
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    primaryStrong: "#1E40AF",
    primarySoft: "#EAF2FF",
  },

  gold: {
    primary: "#B88A2E",
    strong: "#8B651F",
    soft: "#FFF8E8",
  },

  success: {
    primary: "#16805C",
    soft: "#E9F8F2",
  },

  warning: {
    primary: "#B7791F",
    soft: "#FFF7E6",
  },

  danger: {
    primary: "#C2414B",
    soft: "#FFF0F2",
  },

  overlay: {
    subtle: "rgba(15, 23, 42, 0.04)",
    medium: "rgba(15, 23, 42, 0.08)",
    strong: "rgba(15, 23, 42, 0.16)",
  },
} as const;

export type Colors = typeof colors;