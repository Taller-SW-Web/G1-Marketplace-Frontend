import { proxyAccount } from "@/features/auth/account-server";
export const GET = (request: Request) => proxyAccount(request, "auth/capabilities");
