"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GenerationPanel } from "@/components/ai/GenerationPanel";
import { FighterPackPanel } from "@/components/fighter-pack/FighterPackPanel";
import { HitboxPanel } from "./HitboxPanel";
import { ConsistencyPanel } from "./ConsistencyPanel";

export function RightPanel() {
  const [tab, setTab] = useState("ai");

  return (
    <div className="flex flex-col h-full min-h-0 border-l border-border bg-surface">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full min-h-0">
        <TabsList className="mx-2 mt-2 shrink-0">
          <TabsTrigger value="ai">Character Concept</TabsTrigger>
          <TabsTrigger value="pack">Packs</TabsTrigger>
          <TabsTrigger value="consistency">Consistency</TabsTrigger>
          <TabsTrigger value="hitbox">Hitbox</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="flex-1 overflow-y-auto p-3">
          <GenerationPanel />
        </TabsContent>

        <TabsContent value="pack" className="flex-1 overflow-y-auto p-3">
          <FighterPackPanel />
        </TabsContent>

        <TabsContent value="consistency" className="flex-1 overflow-y-auto p-3">
          <ConsistencyPanel />
        </TabsContent>

        <TabsContent value="hitbox" className="flex-1 overflow-y-auto p-3">
          <HitboxPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
