import {render} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import type {ReactElement} from "react";
import en from "../../messages/en.json";

/** Render a client component with the English catalogue. */
export function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}
