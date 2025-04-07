import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret, raw: true }); // Get RAW token string

  if (token) {
    return NextResponse.json({ jwt: token }, { status: 200 });
  } else {
    // Not Signed in
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}