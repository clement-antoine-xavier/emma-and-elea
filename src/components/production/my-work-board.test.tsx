import type {CSSProperties, PointerEventHandler, ReactNode} from "react";
import {forwardRef} from "react";
import {screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useRouter} from "next/navigation";
import {setTaskStatusAction} from "@/app/actions/task.actions";
import {MyWorkBoard} from "@/components/production/my-work-board";
import type {TaskRecord} from "@/lib/dto";
import {renderWithIntl} from "@/test-utils/intl";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/app/actions/task.actions", () => ({
  setTaskStatusAction: jest.fn(),
}));

jest.mock("@astryxdesign/core/Badge", () => ({
  Badge: ({label}: {label: ReactNode}) => <span>{label}</span>,
}));

jest.mock("@astryxdesign/core/Banner", () => ({
  Banner: ({title, description}: {title: string; description?: string}) => (
    <div role="alert">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

jest.mock("@astryxdesign/core/Card", () => ({
  Card: forwardRef<
    HTMLDivElement,
    {
      children?: ReactNode;
      style?: CSSProperties;
      onPointerDown?: PointerEventHandler<HTMLDivElement>;
      "data-column"?: string;
    }
  >(function CardMock({children, ...props}, ref) {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }),
}));

jest.mock("@astryxdesign/core/EmptyState", () => ({
  EmptyState: ({title}: {title: string}) => <p>{title}</p>,
}));

jest.mock("@astryxdesign/core/Grid", () => ({
  Grid: ({children}: {children?: ReactNode}) => <div>{children}</div>,
}));

jest.mock("@astryxdesign/core/Heading", () => ({
  Heading: ({children}: {children?: ReactNode}) => <h4>{children}</h4>,
}));

jest.mock("@astryxdesign/core/HStack", () => ({
  HStack: ({children}: {children?: ReactNode}) => <div>{children}</div>,
}));

jest.mock("@astryxdesign/core/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@astryxdesign/core/Layout", () => ({
  Layout: ({
    header,
    content,
  }: {
    header?: ReactNode;
    content?: ReactNode;
  }) => (
    <div>
      {header}
      {content}
    </div>
  ),
  LayoutHeader: ({children}: {children?: ReactNode}) => <div>{children}</div>,
  LayoutContent: ({children}: {children?: ReactNode}) => <div>{children}</div>,
}));

jest.mock("@astryxdesign/core/MoreMenu", () => ({
  MoreMenu: ({
    label,
    items,
    isDisabled,
  }: {
    label: string;
    items: Array<{label?: string; onClick?: () => void; type?: string}>;
    isDisabled?: boolean;
  }) => (
    <div aria-label={label}>
      {items
        .filter((item) => item.type !== "divider")
        .map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={isDisabled}
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ))}
    </div>
  ),
}));

jest.mock("@astryxdesign/core/StatusDot", () => ({
  StatusDot: ({label}: {label: string}) => <span aria-label={label} />,
}));

jest.mock("@astryxdesign/core/Text", () => ({
  Text: ({children}: {children?: ReactNode}) => <span>{children}</span>,
}));

jest.mock("@astryxdesign/core/VStack", () => ({
  VStack: ({children}: {children?: ReactNode}) => <div>{children}</div>,
}));

const useRouterMock = jest.mocked(useRouter);
const setStatusMock = jest.mocked(setTaskStatusAction);
const refresh = jest.fn();

function makeTask(
  id: string,
  overrides: Partial<TaskRecord> = {},
): TaskRecord {
  return {
    id,
    batchId: null,
    batchCode: null,
    recipeName: null,
    title: `Task ${id}`,
    description: null,
    status: "TODO",
    estimatedMinutes: null,
    plannedStartAt: null,
    plannedEndAt: null,
    requiredSkillId: null,
    requiredSkillName: null,
    employeeId: "employee-1",
    employeeName: "Ada",
    siteId: null,
    siteName: null,
    position: 0,
    ...overrides,
  };
}

function column(status: string): HTMLElement {
  const element = document.querySelector(`[data-column="${status}"]`);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Column ${status} not found`);
  }
  return element;
}

beforeEach(() => {
  refresh.mockReset();
  useRouterMock.mockReturnValue({
    refresh,
  } as unknown as ReturnType<typeof useRouter>);
  setStatusMock.mockReset();
  setStatusMock.mockResolvedValue({ok: true});
});

describe("MyWorkBoard", () => {
  it("groups tasks into the four status columns", () => {
    renderWithIntl(
      <MyWorkBoard
        canExecute
        tasks={[
          makeTask("todo"),
          makeTask("doing", {status: "IN_PROGRESS"}),
          makeTask("blocked", {status: "BLOCKED"}),
          makeTask("done", {status: "DONE"}),
        ]}
      />,
    );

    for (const label of ["To do", "In progress", "Blocked", "Done"]) {
      expect(
        screen.getByRole("heading", {name: label}),
      ).toBeInTheDocument();
    }

    expect(within(column("TODO")).getByText("Task todo")).toBeInTheDocument();
    expect(
      within(column("IN_PROGRESS")).getByText("Task doing"),
    ).toBeInTheDocument();
    expect(
      within(column("BLOCKED")).getByText("Task blocked"),
    ).toBeInTheDocument();
    expect(within(column("DONE")).getByText("Task done")).toBeInTheDocument();
  });

  it("moves a task through the card menu and refreshes the page", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MyWorkBoard canExecute tasks={[makeTask("todo")]} />);

    await user.click(screen.getByRole("button", {name: "Move to Done"}));

    await waitFor(() => {
      expect(setStatusMock).toHaveBeenCalledWith("todo", "DONE");
    });
    expect(refresh).toHaveBeenCalled();
    expect(within(column("DONE")).getByText("Task todo")).toBeInTheDocument();
  });

  it("reverts the move and shows the error when the action fails", async () => {
    const user = userEvent.setup();
    setStatusMock.mockResolvedValue({ok: false, error: "forbidden"});
    renderWithIntl(<MyWorkBoard canExecute tasks={[makeTask("todo")]} />);

    await user.click(screen.getByRole("button", {name: "Move to Done"}));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You are not allowed to do that.",
    );
    expect(within(column("TODO")).getByText("Task todo")).toBeInTheDocument();
    expect(within(column("DONE")).queryByText("Task todo")).toBeNull();
  });

  it("hides status movement when the member cannot execute tasks", () => {
    renderWithIntl(
      <MyWorkBoard canExecute={false} tasks={[makeTask("todo")]} />,
    );

    expect(screen.queryByRole("button", {name: /Move to/})).toBeNull();
  });

  it("shows the shared task empty state when nothing is assigned", () => {
    renderWithIntl(<MyWorkBoard canExecute tasks={[]} />);

    expect(screen.getByText("No tasks")).toBeInTheDocument();
    expect(screen.queryByRole("heading", {name: "To do"})).toBeNull();
  });
});
