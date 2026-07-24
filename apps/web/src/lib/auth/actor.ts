export interface Actor {
  id: string;
  type: "HUMAN" | "AGENT";
  role: "USER" | "ADMIN";
}
