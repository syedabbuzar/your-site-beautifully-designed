import { api, type Role } from "@/services/api";

export async function createStaffUser({ data }: { data: { email: string; password: string; full_name: string; role: Role } }) {
  return api.createUser(data);
}

export async function updateStaffUser({ data }: {
  data: { user_id: string; role?: Role; is_active?: boolean; password?: string };
}) {
  return api.updateUser(data);
}
