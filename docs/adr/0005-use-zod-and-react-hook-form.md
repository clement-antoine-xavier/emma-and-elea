# 0005. Use Zod and React Hook Form for forms

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The sign-in and sign-up forms need validation, field state, submission state,
and mapping of server errors to Astryx inputs. Hand-rolled `useState` validation
does not scale to future organization and admin forms. How should data input be
validated and managed?

## Decision Drivers

- Type-safe validation rules that can be reused on the server
- Consistent field and submission state
- Integration with Astryx controlled inputs
- Clear separation between validation errors and server errors

## Considered Options

- Zod schemas with React Hook Form
- Hand-rolled `useState` and validation functions
- Formik with Yup
- Server-only validation

## Decision Outcome

Chosen option: "Zod schemas with React Hook Form", because Zod provides reusable
typed schemas and React Hook Form handles field state, submission state, and
resolver integration.

The implementation uses:

- schemas in `src/lib/validation/auth.ts`
- `useForm` with `zodResolver` from `@hookform/resolvers/zod`
- `Controller` through the reusable `FormTextInput` wrapper
- Astryx `status={{ type: "error", message }}` for field errors
- `setError("root", ...)` and an Astryx `Banner` for server errors
- `@hookform/resolvers` pinned to 5.x while Prisma 7 depends on `effect@3`

### Positive Consequences

- Validation rules are explicit, typed, and testable without rendering a form.
- Field errors and server errors have separate, predictable UI paths.
- The same patterns can be reused for future admin and organization forms.

### Negative Consequences

- `@hookform/resolvers` 6.x cannot be used while Prisma 7 pulls `effect@3`.
- Astryx is ESM, so component tests mock its inputs instead of loading the real
  package.
- The form component uses a mode-aware schema factory to stay type-safe across
  sign-in and sign-up.

## Pros and Cons of the Options

### Zod schemas with React Hook Form

- Good, because schemas are reusable and type inference is automatic.
- Good, because React Hook Form avoids re-rendering the whole form on each input.
- Bad, because the resolver package is constrained by a transitive peer.

### Hand-rolled `useState` and validation functions

- Good, because there are no additional dependencies.
- Bad, because validation, touched state, and submission state are repeated.

### Formik with Yup

- Good, because it is a mature form stack.
- Bad, because it would add a second validation library and differ from the
  project's Zod-based schemas.

### Server-only validation

- Good, because it is the security boundary for persisted data.
- Bad, because client-side field feedback would still need a client solution.

## Links

- [Auth schemas](../../src/lib/validation/auth.ts)
- [Auth form](../../src/components/auth-form.tsx)
- [FormTextInput wrapper](../../src/components/form-text-input.tsx)
- [Zod documentation](https://zod.dev)
- [React Hook Form documentation](https://react-hook-form.com/docs)
