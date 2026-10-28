import {redirect} from "next/navigation";

export default function EquipmentRedirect() {
  redirect("/dashboard/settings?section=equipment");
}
