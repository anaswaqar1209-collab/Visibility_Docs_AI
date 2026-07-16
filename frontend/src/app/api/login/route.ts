import { NextRequest, NextResponse } from "next/server";
import { getServerApiBase } from "@/lib/serverApiBase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const apiBase = getServerApiBase();
        const res = await fetch(`${apiBase}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: body.email || body.identifier || body.username,
                password: body.password,
            }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                { error: data.message || data.error || "Login failed" },
                { status: res.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        const msg = error?.message || "Login failed";
        const hint =
            msg.includes("ECONNREFUSED") || msg.includes("fetch failed")
                ? " API gateway (port 5100) is not running."
                : "";
        return NextResponse.json(
            { error: `${msg}${hint}` },
            { status: 500 }
        );
    }
}
