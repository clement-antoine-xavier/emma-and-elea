import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormTextInput } from "@/components/form-text-input";

jest.mock("@astryxdesign/core/TextInput", () => ({
  TextInput: ({
    label,
    value,
    onChange,
    status,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    status?: { type: "error" | "warning" | "success"; message?: string };
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {status?.message ? <span role="alert">{status.message}</span> : null}
    </label>
  ),
}));

const schema = z.object({
  email: z.string().min(1, "Email is required."),
});

function TestForm() {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  return (
    <form onSubmit={handleSubmit(() => {})}>
      <FormTextInput control={control} name="email" label="Email" />
      <button type="submit">Submit</button>
    </form>
  );
}

describe("FormTextInput", () => {
  it("maps a React Hook Form error to the Astryx status message", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email is required.",
    );
  });
});
