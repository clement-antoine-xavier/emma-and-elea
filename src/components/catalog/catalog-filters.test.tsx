import {screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {CatalogFilters} from "@/components/catalog/catalog-filters";
import type {CategoryRecord} from "@/lib/dto";
import {renderWithIntl} from "@/test-utils/intl";

jest.mock("@astryxdesign/core/Card", () => ({
  Card: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));
jest.mock("@astryxdesign/core/Stack", () => ({
  Stack: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));
jest.mock("@astryxdesign/core/HStack", () => ({
  HStack: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));
jest.mock("@astryxdesign/core/Button", () => ({
  Button: ({label, type}: {label: string; type?: "submit"}) => (
    <button type={type}>{label}</button>
  ),
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

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({push}),
  usePathname: () => "/dashboard/catalog",
}));

const categories: CategoryRecord[] = [
  {
    id: "cat_bread",
    name: "Bread",
    parentId: null,
    parentName: null,
    sortOrder: 1,
    itemCount: 0,
    childCount: 0,
    isArchived: false,
  },
  {
    id: "cat_baguette",
    name: "Baguette",
    parentId: "cat_bread",
    parentName: "Bread",
    sortOrder: 1,
    itemCount: 0,
    childCount: 0,
    isArchived: false,
  },
  {
    id: "cat_old",
    name: "Archived",
    parentId: null,
    parentName: null,
    sortOrder: 2,
    itemCount: 0,
    childCount: 0,
    isArchived: true,
  },
];

function filters(overrides: Partial<React.ComponentProps<typeof CatalogFilters>> = {}) {
  return (
    <CatalogFilters
      initialSearch=""
      initialType={null}
      initialCategoryId={null}
      initialIncludeArchived={false}
      categories={categories}
      {...overrides}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CatalogFilters", () => {
  it("applies a trimmed search with type, category and archived", async () => {
    const user = userEvent.setup();
    renderWithIntl(filters());

    await user.type(screen.getByLabelText("Search"), "  flour  ");
    await user.selectOptions(screen.getByLabelText("Type"), "RAW_MATERIAL");
    await user.selectOptions(screen.getByLabelText("Category"), "cat_baguette");
    await user.click(screen.getByLabelText("Include archived"));
    await user.click(screen.getByRole("button", {name: "Apply filters"}));

    expect(push).toHaveBeenCalledWith(
      "/dashboard/catalog?search=flour&type=RAW_MATERIAL&categoryId=cat_baguette&includeArchived=true",
    );
  });

  it("builds a clean URL when every filter is empty", async () => {
    const user = userEvent.setup();
    renderWithIntl(filters());

    await user.click(screen.getByRole("button", {name: "Apply filters"}));

    expect(push).toHaveBeenCalledWith("/dashboard/catalog");
  });

  it("hides archived categories and labels children by parent", () => {
    renderWithIntl(filters());

    expect(
      screen.getByRole("option", {name: "Bread · Baguette"}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", {name: "Archived"}),
    ).not.toBeInTheDocument();
  });

  it("starts from the initial values and keeps them on submit", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      filters({
        initialSearch: "rye",
        initialType: "RAW_MATERIAL",
        initialCategoryId: "cat_bread",
        initialIncludeArchived: true,
      }),
    );

    expect(screen.getByLabelText("Search")).toHaveValue("rye");
    expect(screen.getByLabelText("Include archived")).toBeChecked();

    await user.click(screen.getByRole("button", {name: "Apply filters"}));
    expect(push).toHaveBeenCalledWith(
      "/dashboard/catalog?search=rye&type=RAW_MATERIAL&categoryId=cat_bread&includeArchived=true",
    );
  });
});
