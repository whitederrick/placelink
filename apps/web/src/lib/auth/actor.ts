export interface Actor {
  id: string;
  type: "HUMAN" | "AGENT";
  role: "USER" | "ADMIN";
  studioRole?: "SUPER_ADMIN" | "SUPPORT" | "CONTENT" | "ANALYST";
}
