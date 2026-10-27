import {screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {AcceptInvitationButton} from "@/components/accept-invitation-button";
import {acceptInvitationAction} from "@/app/actions/invitation.actions";
import {renderWithIntl} from "@/test-utils/intl";

jest.mock("@/app/actions/invitation.actions", () => ({
  acceptInvitationAction: jest.fn(),
}));

jest.mock("@astryxdesign/core/Banner", () => ({
  Banner: ({
    title,
    description,
    onDismiss,
  }: {
    title: string;
    description: string;
    onDismiss: () => void;
  }) => (
    <div role="alert">
      <strong>{title}</strong> <span>{description}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));
jest.mock("@astryxdesign/core/Button", () => ({
  Button: ({
    label,
    onClick,
    isLoading,
  }: {
    label: string;
    onClick: () => void;
    isLoading: boolean;
  }) => (
    <button onClick={onClick} disabled={isLoading}>
      {label}
    </button>
  ),
}));
jest.mock("@astryxdesign/core/Stack", () => ({
  Stack: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

const push = jest.fn();
const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({push, refresh}),
}));

const accept = acceptInvitationAction as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AcceptInvitationButton", () => {
  it("accepts the invitation and opens the workspace", async () => {
    const user = userEvent.setup();
    accept.mockResolvedValue({ok: true, organizationId: "org_1"});

    renderWithIntl(<AcceptInvitationButton invitationId="inv_1" />);
    await user.click(screen.getByRole("button", {name: "Accept invitation"}));

    expect(accept).toHaveBeenCalledWith({invitationId: "inv_1"});
    expect(push).toHaveBeenCalledWith("/dashboard");
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ["expired", "This invitation has expired."],
    ["unavailable", "This invitation is no longer available."],
    [
      "wrongAccount",
      "Sign in with the email address that received the invitation.",
    ],
    ["generic", "Could not accept the invitation."],
    ["forbidden", "Could not accept the invitation."],
    ["unauthenticated", "Could not accept the invitation."],
  ])("shows the %s error", async (error, message) => {
    const user = userEvent.setup();
    accept.mockResolvedValue({ok: false, error});

    renderWithIntl(<AcceptInvitationButton invitationId="inv_1" />);
    await user.click(screen.getByRole("button", {name: "Accept invitation"}));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(push).not.toHaveBeenCalled();
  });

  it("dismisses the error banner", async () => {
    const user = userEvent.setup();
    accept.mockResolvedValue({ok: false, error: "expired"});

    renderWithIntl(<AcceptInvitationButton invitationId="inv_1" />);
    await user.click(screen.getByRole("button", {name: "Accept invitation"}));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Dismiss"}));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
