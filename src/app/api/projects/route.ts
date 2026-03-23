import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        canvasWidth: true,
        canvasHeight: true,
        paletteId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { sprites: true, animations: true, fighterPacks: true } },
      },
    });

    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list projects";
    console.error("Projects GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, canvasWidth, canvasHeight, paletteId } = body;

    if (!name || typeof name !== "string" || name.length > 200) {
      return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        canvasWidth: canvasWidth ?? 64,
        canvasHeight: canvasHeight ?? 64,
        paletteId: paletteId ?? null,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create project";
    console.error("Projects POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
