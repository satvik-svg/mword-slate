export const PERSONAL_TENANT_PREFIX = "personal:";

export function isPersonalTenant(tenantId: string): boolean {
  return tenantId.startsWith(PERSONAL_TENANT_PREFIX);
}

export function tenantFromIdentity(input: {
  biId?: string;
  email?: string;
  citizenId?: string;
}): string {
  const biId = input.biId?.trim() ?? "";
  if (biId) return biId;
  const email = input.email?.trim().toLowerCase() ?? "";
  if (email) return `${PERSONAL_TENANT_PREFIX}${email}`;
  const citizenId = input.citizenId?.trim() ?? "";
  if (citizenId) return `${PERSONAL_TENANT_PREFIX}${citizenId}`;
  return "";
}

export function workspaceLabel(tenantId: string): string {
  return isPersonalTenant(tenantId) ? "Personal Studio" : "Team Workspace";
}
