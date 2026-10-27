import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {FormTextInput} from "@/components/form-text-input";
import {FormTextArea} from "@/components/form-text-area";
import {FormSelector} from "@/components/form-selector";
import {FormSwitch} from "@/components/form-switch";
import {FormDateInput} from "@/components/form-date-input";
import {FormTimeInput} from "@/components/form-time-input";
import {FormDateTimeInput} from "@/components/form-date-time-input";

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
    status?: {message?: string};
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

jest.mock("@astryxdesign/core/TextArea", () => ({
  TextArea: ({
    label,
    value,
    onChange,
    status,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    status?: {message?: string};
  }) => (
    <label>
      {label}
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {status?.message ? <span role="alert">{status.message}</span> : null}
    </label>
  ),
}));

jest.mock("@astryxdesign/core/Selector", () => ({
  Selector: ({
    label,
    value,
    onChange,
    options,
    status,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: {value: string; label: string}[];
    status?: {message?: string};
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {status?.message ? <span role="alert">{status.message}</span> : null}
    </label>
  ),
}));

jest.mock("@astryxdesign/core/Switch", () => ({
  Switch: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <label>
      <input
        type="checkbox"
        aria-label={label}
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  ),
}));

jest.mock("@astryxdesign/core/DateInput", () => ({
  DateInput: ({
    label,
    value,
    onChange,
    status,
  }: {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    status?: {message?: string};
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {status?.message ? <span role="alert">{status.message}</span> : null}
    </label>
  ),
}));

jest.mock("@astryxdesign/core/TimeInput", () => ({
  TimeInput: ({
    label,
    value,
    onChange,
    status,
  }: {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    status?: {message?: string};
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {status?.message ? <span role="alert">{status.message}</span> : null}
    </label>
  ),
}));

jest.mock("@astryxdesign/core/DateTimeInput", () => ({
  DateTimeInput: ({
    label,
    value,
    onChange,
    status,
  }: {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    status?: {message?: string};
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {status?.message ? <span role="alert">{status.message}</span> : null}
    </label>
  ),
}));

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  notes: z.string().min(1, "Notes are required"),
  choice: z.string().min(1, "Choice is required"),
  flag: z.boolean(),
  day: z.string().min(1, "Day is required"),
  time: z.string().min(1, "Time is required"),
  at: z.string().min(1, "Moment is required"),
});

type Values = z.infer<typeof schema>;

function Harness({onSubmit}: {onSubmit: (values: Values) => void}) {
  const {control, handleSubmit} = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      notes: "",
      choice: "",
      flag: false,
      day: "",
      time: "",
      at: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormTextInput control={control} name="name" label="Name" />
      <FormTextArea control={control} name="notes" label="Notes" />
      <FormSelector
        control={control}
        name="choice"
        label="Choice"
        options={[
          {value: "", label: "None"},
          {value: "a", label: "Option A"},
        ]}
      />
      <FormSwitch control={control} name="flag" label="Flag" />
      <FormDateInput control={control} name="day" label="Day" />
      <FormTimeInput control={control} name="time" label="Time" />
      <FormDateTimeInput control={control} name="at" label="Moment" />
      <button type="submit">Submit</button>
    </form>
  );
}

describe("form field wrappers", () => {
  it("maps every validation error to an Astryx status", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Notes are required")).toBeInTheDocument();
    expect(screen.getByText("Choice is required")).toBeInTheDocument();
    expect(screen.getByText("Day is required")).toBeInTheDocument();
    expect(screen.getByText("Time is required")).toBeInTheDocument();
    expect(screen.getByText("Moment is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("collects text, textarea, selector, switch and date values", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Notes"), "Bake at dawn");
    await user.selectOptions(screen.getByLabelText("Choice"), "a");
    await user.click(screen.getByLabelText("Flag"));
    await user.type(screen.getByLabelText("Day"), "2026-10-27");
    await user.type(screen.getByLabelText("Time"), "08:30");
    await user.type(screen.getByLabelText("Moment"), "2026-10-27T08:30");
    await user.click(screen.getByRole("button", {name: "Submit"}));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        name: "Ada",
        notes: "Bake at dawn",
        choice: "a",
        flag: true,
        day: "2026-10-27",
        time: "08:30",
        at: "2026-10-27T08:30",
      },
      expect.anything(),
    );
  });

  it("clears the typed errors after a valid submit", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.tab();

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
  });
});
