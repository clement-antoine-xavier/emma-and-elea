import {redirect} from "next/navigation";

export default function RatesRedirect() {
  redirect("/dashboard/settings?section=rates");
}
