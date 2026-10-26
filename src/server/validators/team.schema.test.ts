import {
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "@/server/validators/team.schema";

const t = (key: string) => key;

describe("inviteMemberSchema", () => {
  const schema = inviteMemberSchema(t);

  it("accepts an active role", () => {
    expect(
      schema.safeParse({email: "team@example.com", role: "staff"}).success,
    ).toBe(true);
  });

  it("rejects reserved roles and unknown roles", () => {
    for (const role of ["accountant", "auditor", "member", "superuser"]) {
      expect(
        schema.safeParse({email: "team@example.com", role}).success,
      ).toBe(false);
    }
  });

  it("rejects an invalid email", () => {
    expect(schema.safeParse({email: "nope", role: "staff"}).success).toBe(
      false,
    );
  });
});

describe("updateMemberRoleSchema", () => {
  const schema = updateMemberRoleSchema(t);

  it("requires a member id and an active role", () => {
    expect(schema.safeParse({memberId: "member_1", role: "admin"}).success).toBe(
      true,
    );
    expect(schema.safeParse({memberId: "", role: "admin"}).success).toBe(false);
    expect(
      schema.safeParse({memberId: "member_1", role: "accountant"}).success,
    ).toBe(false);
  });
});
