import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, daily, monthly] = await Promise.all([
      prisma.aIGeneration.aggregate({
        where: { userId },
        _count: true,
        _sum: { cost: true },
      }),
      prisma.aIGeneration.count({
        where: { userId, createdAt: { gte: startOfDay } },
      }),
      prisma.aIGeneration.count({
        where: { userId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return NextResponse.json({
      totalGenerations: total._count,
      totalCost: total._sum.cost ?? 0,
      dailyGenerations: daily,
      monthlyGenerations: monthly,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get usage";
    console.error("AI usage error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
