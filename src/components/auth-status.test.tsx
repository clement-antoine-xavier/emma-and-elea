import {screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {AuthStatus} from "@/components/auth-status";
import {renderWithIntl} from "@/test-utils/intl";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: jest.fn(),
    signOut: jest.fn(),
  },
}));

jest.mock("@astryxdesign/core/Button", () => ({
  Button: ({
    href,
    label,
    onClick,
  }: {
    href?: string;
    label: string;
    onClick?: () => void;
  }) =>
    href ? (
      <a href={href}>{label}</a>
    ) : (
      <button onClick={onClick}>{label}</button>
    ),
}));
jest.mock("@astryxdesign/core/Link", () => ({
  Link: ({href, children}: {href: string; children: React.ReactNode}) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock("@astryxdesign/core/Text", () => ({
  Text: ({children}: {children: React.ReactNode}) => <span>{children}</span>,
}));
jest.mock("@astryxdesign/core/HStack", () => ({
  HStack: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({refresh}),
}));

const {authClient} = jest.requireMock("@/lib/auth-client") as {
  authClient: {useSession: jest.Mock; signOut: jest.Mock};
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AuthStatus", () => {
  it("shows a checking message while the session loads", () => {
    authClient.useSession.mockReturnValue({data: null, isPending: true});

    renderWithIntl(<AuthStatus />);

    expect(screen.getByText("Checking session…")).toBeVisible();
  });

  it("renders nothing while loading in CTA-only mode", () => {
    authClient.useSession.mockReturnValue({data: null, isPending: true});

    const {container} = renderWithIntl(<AuthStatus ctaOnly />);

    expect(container).toBeEmptyDOMElement();
  });

  it("offers sign-in and account links to a visitor", () => {
    authClient.useSession.mockReturnValue({data: null, isPending: false});

    renderWithIntl(<AuthStatus />);

    expect(screen.getByRole("link", {name: "Sign in"})).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("link", {name: "Create account"})).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("shows the primary CTA when requested", () => {
    authClient.useSession.mockReturnValue({data: null, isPending: false});

    renderWithIntl(<AuthStatus showPrimaryCta />);

    expect(screen.getByRole("link", {name: "Create account"})).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("collapses the visitor CTA to a single button", () => {
    authClient.useSession.mockReturnValue({data: null, isPending: false});

    renderWithIntl(<AuthStatus ctaOnly />);

    expect(screen.queryByRole("link", {name: "Sign in"})).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Create account"})).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("shows the signed-in name, workspace and sign-out", async () => {
    const user = userEvent.setup();
    authClient.useSession.mockReturnValue({
      data: {user: {name: "Ada", email: "ada@example.com"}},
      isPending: false,
    });
    authClient.signOut.mockResolvedValue(undefined);

    renderWithIntl(<AuthStatus />);

    expect(screen.getByText("Signed in as Ada")).toBeVisible();
    expect(screen.getByRole("link", {name: "Workspace"})).toHaveAttribute(
      "href",
      "/dashboard",
    );

    await user.click(screen.getByRole("button", {name: "Sign out"}));

    expect(authClient.signOut).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it("falls back to the email and shows only the workspace in CTA mode", () => {
    authClient.useSession.mockReturnValue({
      data: {user: {name: "", email: "ada@example.com"}},
      isPending: false,
    });

    renderWithIntl(<AuthStatus ctaOnly />);

    expect(screen.getByRole("link", {name: "Workspace"})).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
