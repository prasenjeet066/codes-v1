"use client"

import React from "react"

interface ReplyDialogProps {
  open?: boolean
  onClose?: () => void
  postId?: string
}

export function ReplyDialog({ open = false }: ReplyDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white p-4 rounded-md shadow-lg max-w-sm w-full">
        <p className="text-sm">Reply dialog placeholder</p>
      </div>
    </div>
  )
}