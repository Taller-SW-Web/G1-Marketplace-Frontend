import { proxyAuth } from "@/features/auth/server";
export const POST = (request: Request) => proxyAuth(request, "otp/solicitar");
