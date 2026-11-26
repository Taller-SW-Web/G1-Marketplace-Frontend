import { proxyAccount } from "@/features/auth/account-server";
export const POST = (request: Request) => proxyAccount(request, "password/restablecer");
