import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentUserServer } from "../auth.server";

function createProvisionedFacultyClient(): SupabaseClient {
  const rows = {
    user_accounts: {
      id: "faculty-1",
      email: "faculty@example.com",
      role: "FACULTY",
    },
    faculty_profiles: {
      user_id: "faculty-1",
      full_name: "Test Faculty",
      employee_number: null,
      department: null,
    },
  };

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "faculty-1", email: "faculty@example.com" } },
        error: null,
      }),
    },
    from: (table: keyof typeof rows) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: rows[table], error: null }),
        }),
      }),
    }),
  };

  return client as unknown as SupabaseClient;
}

describe("server authentication session continuity", () => {
  it("loads the provisioned account through the same client after sign-in", async () => {
    const client = createProvisionedFacultyClient();

    await expect(getCurrentUserServer(client)).resolves.toMatchObject({
      id: "faculty-1",
      role: "FACULTY",
      profile: { fullName: "Test Faculty" },
    });

    expect(client.auth.getUser).toHaveBeenCalledOnce();
  });
});
