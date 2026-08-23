    export const layout = {
  container: {
    maxWidth: 1280,

    padding: 24,
  },

  sidebar: {
    width: 280,
  },

  header: {
    height: 72,
  },

  chat: {
    maxWidth: 900,
  },
} as const;

export type Layout = typeof layout;