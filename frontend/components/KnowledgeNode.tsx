'use client'

import { useBoardStore } from '@/store/useBoardStore'

export function KnowledgeNode() {

  const nodes = useBoardStore((state) => state.nodes)
  const selectedNodeId = useBoardStore((state) => state.selectedNodeId)

  const node = nodes.find((n) => n.id === selectedNodeId)

  if (!node) {
    return (
      <div className="p-6 text-gray-400">
        Select a topic to begin learning.
      </div>
    )
  }

  const content = node.content

  // ---------- Format AI Response ----------
  const formatText = (value: any) => {

    if (!value) return ""

    // If AI returns object like { data_structure: "...", algorithm: "..." }
    if (typeof value === "object") {

      return Object.entries(value)
        .map(([key, val]) => {

          const label = key.replace(/_/g, " ").toUpperCase()

          return `${label}\n${val}`
        })
        .join("\n\n")
    }

    return value
  }

  return (
    <div className="space-y-6">

      {/* Title */}
      <h2 className="text-2xl font-bold text-slate-900">
        {String(node.title)}
      </h2>

      {/* Definition */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">DEFINITION</h3>
        <p className="text-gray-700 whitespace-pre-wrap">
          {formatText(content.definition)}
        </p>
      </div>

      {/* Explanation */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">EXPLANATION</h3>
        <p className="text-gray-700 whitespace-pre-wrap">
          {formatText(content.explanation)}
        </p>
      </div>

      {/* Example */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">EXAMPLE</h3>
        <p className="text-gray-700 whitespace-pre-wrap">
          {formatText(content.example)}
        </p>
      </div>

      {/* Application */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">APPLICATION</h3>
        <p className="text-gray-700 whitespace-pre-wrap">
          {formatText(content.application)}
        </p>
      </div>

      {/* Common Mistake */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">COMMON MISTAKE</h3>
        <p className="text-gray-700 whitespace-pre-wrap">
          {formatText(content.mistake)}
        </p>
      </div>

    </div>
  )
}