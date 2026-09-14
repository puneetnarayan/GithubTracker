// Central place for environment-driven configuration.
// Never expose secrets through NEXT_PUBLIC_* variables.

export const config = {
  mockMode: process.env.MOCK_MODE === "true" || !process.env.GITHUB_CLIENT_ID,
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  },
  nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

/**
 * Mock mode is enabled automatically when GitHub OAuth credentials are not
 * configured, so the UI can be developed and demoed without a live GitHub
 * connection. Set MOCK_MODE=false explicitly once real credentials are in
 * place to force a live connection even in local development.
 */
export function isMockMode(): boolean {
  if (process.env.MOCK_MODE === "false") return false;
  return config.mockMode;
}
