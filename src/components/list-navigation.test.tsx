import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {ListPagination} from "@/components/list-pagination";
import {PageHeader} from "@/components/page-header";

jest.mock("@astryxdesign/core/Pagination", () => ({
  Pagination: ({
    page,
    totalItems,
    pageSize,
    label,
    onChange,
  }: {
    page: number;
    totalItems: number;
    pageSize: number;
    label: string;
    onChange: (page: number) => void;
  }) => (
    <nav aria-label={label}>
      <span>
        {page} / {Math.ceil(totalItems / pageSize)}
      </span>
      <button onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  ),
}));

jest.mock("@astryxdesign/core/Stack", () => ({
  Stack: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));
jest.mock("@astryxdesign/core/HStack", () => ({
  HStack: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));
jest.mock("@astryxdesign/core/Text", () => ({
  Heading: ({
    children,
    level,
  }: {
    children: React.ReactNode;
    level: number;
  }) => {
    const Tag = `h${level}` as "h1" | "h2" | "h3";
    return <Tag>{children}</Tag>;
  },
  Text: ({children}: {children: React.ReactNode}) => <p>{children}</p>,
}));

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({push}),
  usePathname: () => "/dashboard/stock/lots",
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ListPagination", () => {
  it("renders nothing when the page fits every row", () => {
    const {container} = render(
      <ListPagination
        page={1}
        pageSize={25}
        total={25}
        searchParams={{}}
        label="Lots"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("preserves filters and only changes the page", async () => {
    const user = userEvent.setup();
    render(
      <ListPagination
        page={1}
        pageSize={25}
        total={80}
        searchParams={{search: "flour", includeEmpty: "true"}}
        label="Lots"
      />,
    );

    await user.click(screen.getByRole("button", {name: "Next"}));

    expect(push).toHaveBeenCalledWith(
      "/dashboard/stock/lots?search=flour&includeEmpty=true&page=2",
    );
  });

  it("builds a page-only query when there are no filters", async () => {
    const user = userEvent.setup();
    render(
      <ListPagination
        page={2}
        pageSize={10}
        total={30}
        searchParams={{}}
        label="Lots"
      />,
    );

    await user.click(screen.getByRole("button", {name: "Next"}));
    expect(push).toHaveBeenCalledWith("/dashboard/stock/lots?page=3");
  });
});

describe("PageHeader", () => {
  it("renders an h1 title, eyebrow and intro", () => {
    render(
      <PageHeader
        eyebrow="Stock"
        title="Lots"
        intro="Everything on hand"
      />,
    );

    expect(screen.getByRole("heading", {level: 1, name: "Lots"})).toBeVisible();
    expect(screen.getByText("Stock")).toBeVisible();
    expect(screen.getByText("Everything on hand")).toBeVisible();
  });

  it("omits the optional parts and keeps the actions", () => {
    render(<PageHeader title="Lots" actions={<a href="/new">New</a>} />);

    expect(screen.queryByText("Stock")).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name: "New"})).toBeVisible();
  });
});
