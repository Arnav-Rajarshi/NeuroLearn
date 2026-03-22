"use client"

import { useState } from "react"
import { useBoardStore } from "@/store/useBoardStore"

export default function TopicInput({ setTopic }: any) {

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const setNodes = useBoardStore((state) => state.setNodes)

  const generateTopic = async () => {

    if (!input) return

    try {

      setLoading(true)

      const res = await fetch("http://127.0.0.1:8000/generate-topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic: input })
      })

      const data = await res.json()

      const rootNode = {
        id: "root",
        title: data.title,
        level: 0,
        parentId: null,
        content: {
          definition: data.definition || "",
          explanation: data.explanation || "",
          example: data.example || "",
          application: data.application || "",
          mistake: data.mistake || ""
        },
        version: 1
      }

      const subNodes = (data.subtopics || []).map(
        (topic: string, index: number) => ({
          id: `sub-${index}`,
          title: topic,
          level: 1,
          parentId: "root",
          content: {
            definition: "",
            explanation: "",
            example: "",
            application: "",
            mistake: ""
          },
          version: 1
        })
      )

      setNodes([rootNode, ...subNodes])

      setTopic(data.title)

    } catch (err) {
      console.error("Topic generation failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 mb-4">

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="border px-3 py-2 w-full rounded"
        placeholder="Enter topic"
      />

      <button
        onClick={generateTopic}
        className="bg-blue-600 text-white px-4 rounded"
      >
        {loading ? "Generating..." : "Generate"}
      </button>

    </div>
  )
}