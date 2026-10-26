import { deleteE2EUsers } from "./db";

export default async function globalSetup() {
  await deleteE2EUsers();
}
