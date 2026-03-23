import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      include: {
        sprites: true,
        animations: {
          include: {
            frames: {
              include: { sprite: true },
              orderBy: { order: "asc" },
            },
          },
        },
        fighterPacks: {
          include: { animations: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get project";
    console.error("Project GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, canvasWidth, canvasHeight, paletteId, settings } = body;

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).slice(0, 200) }),
        ...(canvasWidth !== undefined && { canvasWidth }),
        ...(canvasHeight !== undefined && { canvasHeight }),
        ...(paletteId !== undefined && { paletteId }),
        ...(settings !== undefined && { settings }),
      },
    });

    return NextResponse.json({ project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update project";
    console.error("Project PUT error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    console.error("Project DELETE error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
