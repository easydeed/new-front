// Hard redirect all traffic to the 5-step Grant Deed wizard
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/create-deed/grant-deed");
}
