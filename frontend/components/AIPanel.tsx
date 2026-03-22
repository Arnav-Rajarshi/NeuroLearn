'use client'

import { useBoardStore } from '@/store/useBoardStore'
import { useState } from 'react'

export function AIPanel() {

  const selectedNodeId = useBoardStore((state) => state.selectedNodeId)
  const nodes = useBoardStore((state) => state.nodes)
  const updateNodeContent = useBoardStore((state) => state.updateNodeContent)

  const selectedNode = nodes.find((node) => node.id === selectedNodeId)

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<any>(null)

  const runAI = async () => {

    if (!input.trim() || !selectedNode) return

    try {

      setLoading(true)

      const res = await fetch("http://127.0.0.1:8000/edit-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: selectedNode.title,
          instruction: input,
          content: selectedNode.content
        })
      })

      const data = await res.json()

      setSuggestion(data)

    } catch (err) {
      console.error("AI edit failed", err)
    }

    setLoading(false)
  }

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-l border-slate-200">
        <p className="text-slate-400 text-sm">Select a card</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 p-4">

      <h2 className="text-sm font-semibold mb-4">
        AI Assistant
      </h2>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Give instruction to modify this card..."
        className="border rounded p-2 text-sm w-full h-24 mb-3"
      />

      <button
        onClick={runAI}
        className="bg-blue-600 text-white px-3 py-2 rounded text-sm"
      >
        {loading ? "Thinking..." : "Run AI"}
      </button>

      {/* AI suggestion */}

      {suggestion && (

        <div className="mt-6 border-t pt-4">

          <h3 className="text-sm font-semibold mb-2">
            AI Suggested Card
          </h3>

          <div className="space-y-2 text-sm">

            <p>
              <b>Definition:</b> {suggestion.definition}
            </p>

            <p>
              <b>Explanation:</b> {suggestion.explanation}
            </p>

            <p>
              <b>Example:</b> {suggestion.example}
            </p>

            <p>
              <b>Application:</b> {suggestion.application}
            </p>

            <p>
              <b>Mistake:</b> {suggestion.mistake}
            </p>

          </div>

          <div className="flex gap-2 mt-4">

            <button
              onClick={() => {

                updateNodeContent(
                  selectedNode.id,
                  suggestion
                )

                setSuggestion(null)
                setInput("")

              }}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Apply
            </button>

            <button
              onClick={() => setSuggestion(null)}
              className="bg-gray-400 text-white px-3 py-1 rounded"
            >
              Reject
            </button>

          </div>

        </div>

      )}

    </div>
  )
}