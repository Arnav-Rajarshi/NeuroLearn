"use client"

import { useState } from "react"
import { KnowledgeTree } from "@/components/KnowledgeTree"
import { KnowledgeNode } from "@/components/KnowledgeNode"
import { AIPanel } from "@/components/AIPanel"
import TopicInput from "@/components/TopicInput"

export default function Page() {

  const [topic, setTopic] = useState<string>("")

  return (
    <main className="h-screen w-full flex bg-slate-50">

      {/* LEFT PANEL */}
      <div className="w-1/5 min-w-max border-r border-gray-200">
        <KnowledgeTree />
      </div>

      {/* CENTER PANEL */}
      <div className="w-3/5 p-6 overflow-y-auto">

        <h1 className="text-2xl font-bold mb-4">
          {topic || "Adaptive Academic Intelligence Engine"}
        </h1>

        <TopicInput setTopic={setTopic} />

        <div className="mt-6">
          <KnowledgeNode />
        </div>

      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/5 border-l border-gray-200">
        <AIPanel />
      </div>

    </main>
  )
}