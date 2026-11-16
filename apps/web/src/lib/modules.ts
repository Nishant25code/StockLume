/**
 * Team module ownership — shown on placeholder pages so everyone knows who
 * builds what. Source of truth: docs/MODULES.md.
 */
export type ModuleKey = "auth" | "inventory" | "orders" | "analytics";

export interface TeamModule {
  member: string;
  name: string;
  branch: string;
}

export const TEAM_MODULES: Record<ModuleKey, TeamModule> = {
  auth: { member: "Member 1", name: "Authentication, Connections & Products", branch: "feature/auth-products" },
  inventory: { member: "Member 2", name: "Inventory & Stock Prediction", branch: "feature/inventory" },
  orders: { member: "Member 3", name: "Orders & Fulfillment", branch: "feature/orders" },
  analytics: { member: "Member 4", name: "Notifications & Analytics", branch: "feature/analytics" },
};
