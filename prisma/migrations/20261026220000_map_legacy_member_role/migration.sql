-- ADR-0011: organization roles are fixed. Better Auth used to create members
-- with the default "member" role, which is not part of the permission matrix
-- and now fails closed. Map it to the closest active role.
UPDATE "member" SET "role" = 'staff' WHERE "role" = 'member';
