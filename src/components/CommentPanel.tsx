import { useEffect, useMemo, useState } from 'react'

type CommentItem = {
  id: string
  text: string
  createdAt: string
}

type CommentPanelProps = {
  assetId: string
  focusSignal: number
}

const storageKey = (assetId: string) => `immichext.comments.${assetId}`

const loadComments = (assetId: string): CommentItem[] => {
  try {
    const raw = localStorage.getItem(storageKey(assetId))
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as CommentItem[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((comment) => Boolean(comment.id) && Boolean(comment.text))
  } catch {
    return []
  }
}

const saveComments = (assetId: string, comments: CommentItem[]): void => {
  localStorage.setItem(storageKey(assetId), JSON.stringify(comments))
}

export const CommentPanel = ({ assetId, focusSignal }: CommentPanelProps) => {
  const [comments, setComments] = useState<CommentItem[]>(() => loadComments(assetId))
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    setComments(loadComments(assetId))
    setDraft('')
    setEditingId(null)
    setEditingText('')
  }, [assetId])

  useEffect(() => {
    const input = document.getElementById('quick-comment-input') as HTMLTextAreaElement | null
    input?.focus()
  }, [focusSignal])

  const commentCountLabel = useMemo(() => {
    if (comments.length === 1) {
      return '1 local comment'
    }

    return `${comments.length} local comments`
  }, [comments.length])

  const addComment = () => {
    const text = draft.trim()
    if (!text) {
      return
    }

    const next: CommentItem[] = [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        text,
        createdAt: new Date().toISOString(),
      },
      ...comments,
    ]

    setComments(next)
    setDraft('')
    saveComments(assetId, next)
  }

  const removeComment = (id: string) => {
    const next = comments.filter((comment) => comment.id !== id)
    setComments(next)
    saveComments(assetId, next)
  }

  const startEdit = (comment: CommentItem) => {
    setEditingId(comment.id)
    setEditingText(comment.text)
  }

  const commitEdit = () => {
    if (!editingId) {
      return
    }

    const text = editingText.trim()
    if (!text) {
      return
    }

    const next = comments.map((comment) =>
      comment.id === editingId ? { ...comment, text } : comment,
    )

    setComments(next)
    setEditingId(null)
    setEditingText('')
    saveComments(assetId, next)
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Quick Comments</h3>
        <span className="text-xs text-slate-500">{commentCountLabel}</span>
      </div>

      <p className="mb-2 text-[11px] text-slate-500">
        Local per-asset comments for fast notes while browsing timeline.
      </p>

      <textarea
        id="quick-comment-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Type a comment and press Ctrl+Enter"
        className="min-h-16 w-full resize-y rounded-md border border-slate-300 px-2 py-2 text-sm"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            addComment()
          }
        }}
      />

      <button
        type="button"
        onClick={addComment}
        className="mt-2 rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white"
      >
        Add Comment
      </button>

      <ul className="mt-3 space-y-2">
        {comments.map((comment) => {
          const isEditing = editingId === comment.id

          return (
            <li key={comment.id} className="rounded-md border border-slate-200 bg-white p-2">
              {isEditing ? (
                <>
                  <textarea
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    className="min-h-14 w-full resize-y rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={commitEdit}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null)
                        setEditingText('')
                      }}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{comment.text}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(comment)}
                        className="rounded border border-slate-300 px-1.5 py-0.5"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeComment(comment.id)}
                        className="rounded border border-rose-200 px-1.5 py-0.5 text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
