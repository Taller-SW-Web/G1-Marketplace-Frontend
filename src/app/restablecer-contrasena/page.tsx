import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";
export const metadata: Metadata = { title: "Restablecer contraseña", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function ResetPage() { return <ResetPasswordForm />; }
