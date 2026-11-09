import { ProfileSettings } from "@/components/account/account-views";
import { googleConfigured } from "@/lib/server/google";
import { phoneSignInAvailable } from "@/lib/server/phone-code";

export const metadata = { title: "Profile & Security" };

export default function ProfilePage() {
  return <ProfileSettings google={googleConfigured() || process.env.NODE_ENV !== "production"} phone={phoneSignInAvailable()} />;
}
