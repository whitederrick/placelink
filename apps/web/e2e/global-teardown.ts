import { seedDatabase } from "./seed-database";

export default function globalTeardown() {
  seedDatabase();
}
