import {screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Children, type ReactElement, type ReactNode} from "react";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";
import {setLocaleAction} from "@/app/actions/locale.actions";
import {renderWithIntl} from "@/test-utils/intl";

jest.mock("@astryxdesign/core/SegmentedControl", () => ({
  SegmentedControl: ({
    label,
    onChange,
    children,
  }: {
    label: string;
    onChange: (value: string) => void;
    children: ReactNode;
  }) => (
    <div aria-label={label}>
      {Children.toArray(children).map((child) => {
        const props = (child as ReactElement<{value: string; label: string}>)
          .props;
        return (
          <button key={props.value} onClick={() => onChange(props.value)}>
            {props.label}
          </button>
        );
      })}
      <button onClick={() => onChange("sepia")}>Invalid</button>
    </div>
  ),
  SegmentedControlItem: () => null,
}));

jest.mock("@/app/actions/locale.actions", () => ({
  setLocaleAction: jest.fn(),
}));

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({refresh}),
}));

const setMode = jest.fn();
jest.mock("@/components/theme-mode-provider", () => ({
  useThemeMode: () => ({mode: "light", setMode}),
}));

const setLocale = setLocaleAction as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  setLocale.mockResolvedValue({ok: true});
});

describe("LocaleSwitcher", () => {
  it("persists a new locale and refreshes the route", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);

    await user.click(screen.getByRole("button", {name: "Français"}));

    await waitFor(() => expect(setLocale).toHaveBeenCalledWith("fr"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("ignores the active locale", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);

    await user.click(screen.getByRole("button", {name: "English"}));

    expect(setLocale).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not refresh when the action rejects the locale", async () => {
    const user = userEvent.setup();
    setLocale.mockResolvedValue({ok: false});
    renderWithIntl(<LocaleSwitcher />);

    await user.click(screen.getByRole("button", {name: "Français"}));

    await waitFor(() => expect(setLocale).toHaveBeenCalled());
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("ThemeSwitcher", () => {
  it("stores a supported theme mode", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ThemeSwitcher />);

    await user.click(screen.getByRole("button", {name: "Dark"}));

    expect(setMode).toHaveBeenCalledWith("dark");
  });

  it("ignores an unsupported value", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ThemeSwitcher />);

    await user.click(screen.getByRole("button", {name: "Invalid"}));

    expect(setMode).not.toHaveBeenCalled();
  });
});
