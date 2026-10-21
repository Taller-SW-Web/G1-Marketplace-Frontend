import { RegistrationForm } from "@/features/auth/RegistrationForm";

function documentUrl(value: string | undefined) {
  if (!value) return "";
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}

export default function RegisterPage() {
  return <RegistrationForm termsUrl={documentUrl(process.env.G1_TERMS_URL)} privacyUrl={documentUrl(process.env.G1_PRIVACY_URL)} />;
}
