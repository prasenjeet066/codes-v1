
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, AlertCircle } from "lucide-react"

const MIN_POLL_OPTIONS = 2
const MAX_POLL_OPTIONS = 4

interface PollData {
  poll_id: number
  question: string
  status: "active" | "closed"
  created_at: string
  ends_at: string
  options: { option_id: number; text: string; votes: number }[]
}

interface PollCreatorProps {
  onCancel: () => void
  onSubmit: (pollData: PollData) => void
}

export function PollCreator({ onCancel, onSubmit }: PollCreatorProps) {
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""])
  const [pollDuration, setPollDuration] = useState("1 day")
  const [error, setError] = useState("")

  const handleAddPollOption = () => {
    if (pollOptions.length < MAX_POLL_OPTIONS) {
      setPollOptions([...pollOptions, ""])
    }
  }

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > MIN_POLL_OPTIONS) {
      setPollOptions(pollOptions.filter((_, i) => i !== index))
    }
  }

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions]
    newOptions[index] = value
    setPollOptions(newOptions)
  }

  const handleSubmit = () => {
    if (!pollQuestion.trim()) {
      setError("Poll question cannot be empty.")
      return
    }
    const trimmedOptions = pollOptions.filter((opt) => opt.trim())
    if (trimmedOptions.length < MIN_POLL_OPTIONS) {
      setError(`Please provide at least ${MIN_POLL_OPTIONS} non-empty poll options.`)
      return
    }
    if (!pollDuration) {
      setError("Please select a poll duration.")
      return
    }

    const now = new Date()
    const createdAt = now.toISOString()
    let endsAt = new Date(now)
    if (pollDuration === "1 day") {
      endsAt.setDate(now.getDate() + 1)
    } else if (pollDuration === "3 days") {
      endsAt.setDate(now.getDate() + 3)
    } else if (pollDuration === "1 week") {
      endsAt.setDate(now.getDate() + 7)
    }

    const pollData: PollData = {
      poll_id: Math.floor(Math.random() * 1000000),
      question: pollQuestion.trim(),
      status: "active",
      created_at: createdAt,
      ends_at: endsAt.toISOString(),
      options: trimmedOptions.map((optionText, index) => ({
        option_id: index + 1,
        text: optionText,
        votes: 0,
      })),
    }

    onSubmit(pollData)
    setPollQuestion("")
    setPollOptions(["", ""])
    setPollDuration("1 day")
    setError("")
  }

  return (
    <Card className="mb-4 shadow-none border">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <h3 className="text-lg font-semibold">Create Poll</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel Poll
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="mb-4">
          <label htmlFor="poll-question" className="block text-sm font-medium text-gray-700 mb-1">
            Poll Question
          </label>
          <Input
            id="poll-question"
            placeholder="Ask a question..."
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Poll Options</label>
          {pollOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <Input
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => handlePollOptionChange(index, e.target.value)}
                className="flex-1 rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {pollOptions.length > MIN_POLL_OPTIONS && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePollOption(index)}
                  className="text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {pollOptions.length < MAX_POLL_OPTIONS && (
            <Button
              variant="outline"
              className="w-full mt-2 border-dashed border-gray-300 hover:bg-gray-50"
              onClick={handleAddPollOption}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Option
            </Button>
          )}
        </div>
        <div>
          <label htmlFor="poll-duration" className="block text-sm font-medium text-gray-700 mb-1">
            Poll Duration
          </label>
          <Select value={pollDuration} onValueChange={setPollDuration}>
            <SelectTrigger className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1 day">1 Day</SelectItem>
              <SelectItem value="3 days">3 Days</SelectItem>
              <SelectItem value="1 week">1 Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSubmit} className="mt-4 w-full">
          Add Poll
        </Button>
      </CardContent>
    </Card>
  )
}
