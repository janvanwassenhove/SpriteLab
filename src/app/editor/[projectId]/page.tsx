"use client";

import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { EditorLayout } from "@/components/editor/EditorLayout";

function EditorContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const width = parseInt(searchParams.get("w") ?? "64");
  const height = parseInt(searchParams.get("h") ?? "64");
  const name = searchParams.get("name") ?? "Untitled";

  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const initProject = useProjectStore((s) => s.initProject);

  useEffect(() => {
    setCanvasSize(width, height);
    initProject(projectId, name, width, height);
  }, [projectId, width, height, name, setCanvasSize, initProject]);

  return <EditorLayout />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-background flex items-center justify-center text-zinc-500">Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
