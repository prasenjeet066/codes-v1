"use client"

/**
 * Central icon registry.
 *
 * Add new entries here so you can use:
 *   import { Icons } from '@/components/icons'
 *   <Icons.spinner className="h-4 w-4" />
 */

import type { LucideProps } from "lucide-react"
import { Loader2, User, MessageCircle, Repeat, Trash2, Pencil, ShieldX } from "lucide-react"

export const Icons = {
  /* Generic loading spinner */
  spinner: (props: LucideProps) => <Loader2 {...props} className={`animate-spin ${props.className ?? ""}`} />,

  /* Example brand / logo icon (swap out with your own SVG if needed) */
  logo: (props: LucideProps) => (
    /* Using the Lucide “MessageCircle” as a placeholder brand icon */
    <MessageCircle {...props} />
  ),

  /* Common UI icons used across the project */
  user: (props: LucideProps) => <User {...props} />,
  repost: (props: LucideProps) => <Repeat {...props} />,
  edit: (props: LucideProps) => <Pencil {...props} />,
  delete: (props: LucideProps) => <Trash2 {...props} />,
  block: (props: LucideProps) => <ShieldX {...props} />,
}
