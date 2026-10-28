import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {ListToolbar} from "@/components/list/list-toolbar";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({push: mockPush}),
  usePathname: () => "/dashboard/items",
}));

jest.mock("@astryxdesign/core/HStack", () => ({
  HStack: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

jest.mock("@astryxdesign/core/Text", () => ({
  Text: ({children}: {children: React.ReactNode}) => <span>{children}</span>,
}));

jest.mock("@astryxdesign/core/TextInput", () => ({
  TextInput: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  ),
}));

jest.mock("@astryxdesign/core/SegmentedControl", () => ({
  SegmentedControl: ({
    label,
    onChange,
    children,
  }: {
    label: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
  }) => {
    const items = Array.isArray(children) ? children : [children];
    return (
      <div role="radiogroup" aria-label={label}>
        {items.map((child) => {
          const item = child as {props: {label: string; value: string}};
          return (
            <button
              key={item.props.value}
              type="button"
              role="radio"
              aria-checked={false}
              aria-label={item.props.label}
              onClick={() => onChange(item.props.value)}
            />
          );
        })}
      </div>
    );
  },
  SegmentedControlItem: () => null,
}));

jest.mock("@astryxdesign/core/Selector", () => ({
  Selector: ({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: {value: string; label: string}[];
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
    </label>
  ),
}));

describe("ListToolbar", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("pushes the query on submit and resets pagination", async () => {
    const user = userEvent.setup();
    render(
      <ListToolbar
        search={{value: "", label: "Search", placeholder: "Name"}}
        preserve={{status: "ACTIVE"}}
      />,
    );

    await user.type(screen.getByLabelText("Search"), "flour{Enter}");

    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/items?status=ACTIVE&search=flour",
    );
  });

  it("pushes the selected scope and drops page", async () => {
    const user = userEvent.setup();
    render(
      <ListToolbar
        search={{value: "", label: "Search"}}
        scope={{
          key: "scope",
          label: "Show",
          value: "",
          options: [
            {value: "", label: "Active"},
            {value: "all", label: "All"},
          ],
        }}
      />,
    );

    await user.click(screen.getByRole("radio", {name: "All"}));

    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/items?scope=all",
    );
  });

  it("pushes a selected filter value", async () => {
    const user = userEvent.setup();
    render(
      <ListToolbar
        search={{value: "", label: "Search"}}
        filters={[
          {
            key: "type",
            label: "Type",
            value: "",
            allLabel: "All types",
            options: [
              {value: "RAW", label: "Raw material"},
              {value: "PACK", label: "Packaging"},
            ],
          },
        ]}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Type"), "PACK");

    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/items?type=PACK",
    );
  });

  it("renders the summary", () => {
    render(
      <ListToolbar
        search={{value: "", label: "Search"}}
        summary="12 items"
      />,
    );

    expect(screen.getByText("12 items")).toBeInTheDocument();
  });
});
