/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 980
 * @framerIntrinsicHeight 680
 */
import * as React from "react"
import { ControlType, addPropertyControls } from "framer"
import { motion, AnimatePresence } from "framer-motion"
import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth"
import firebaseConfig from "../../firebase-applet-config.json"
import { useTheme } from "../../Theme.tsx"
import {
  Envelope,
  PaperPlaneTilt,
  Trash,
  MagnifyingGlass,
  ArrowsClockwise,
  SignOut,
  Star,
  X,
  Check,
  Warning,
  User as UserIcon,
  Tray,
  Folder,
  Tag,
  Pen,
  ArrowBendUpLeft,
} from "phosphor-react"

// Types
export interface GmailMessageSummary {
  id: string
  threadId: string
  from: string
  fromEmail: string
  to: string
  subject: string
  date: string
  snippet: string
  isUnread: boolean
  isStarred: boolean
  labelIds: string[]
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyHtml?: string
  bodyText?: string
}

type FolderKey = "INBOX" | "SENT" | "DRAFT" | "TRASH" | "STARRED"

interface GmailClientProps {
  title?: string
  maxResults?: number
  defaultFolder?: FolderKey
  accentColor?: string
  style?: React.CSSProperties
}

// In-memory token cache (strictly NO localStorage or sessionStorage as required by Workspace skill)
let inMemoryAccessToken: string | null = null
let isSigningIn = false

// Initialize Firebase safely (avoid duplicate app error)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)

// Provider setup
const provider = new GoogleAuthProvider()
const GMAIL_SCOPES = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.labels",
]
GMAIL_SCOPES.forEach((scope) => provider.addScope(scope))

// Helpers: UTF-8 safe base64url encode/decode
function encodeBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str)
  let binary = ""
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function decodeBase64Url(base64UrlStr: string): string {
  try {
    let base64 = base64UrlStr.replace(/-/g, "+").replace(/_/g, "/")
    while (base64.length % 4) {
      base64 += "="
    }
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return ""
  }
}

function parseHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
  if (!headers) return ""
  const match = headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
  return match ? match.value : ""
}

function extractEmailSender(fromHeader: string): { name: string; email: string } {
  const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/)
  if (match) {
    return { name: match[1].replace(/^["']|["']$/g, "").trim() || match[2], email: match[2].trim() }
  }
  return { name: fromHeader.trim() || "Unknown", email: fromHeader.trim() }
}

function extractBodyFromPayload(payload: any): { html?: string; text?: string } {
  if (!payload) return {}
  let html = ""
  let text = ""

  const traverse = (part: any) => {
    if (!part) return
    const mime = part.mimeType || ""
    const data = part.body?.data

    if (mime === "text/html" && data) {
      html = decodeBase64Url(data)
    } else if (mime === "text/plain" && data && !html) {
      text = decodeBase64Url(data)
    }

    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(traverse)
    }
  }

  if (payload.body?.data) {
    const mime = payload.mimeType || "text/plain"
    if (mime === "text/html") {
      html = decodeBase64Url(payload.body.data)
    } else {
      text = decodeBase64Url(payload.body.data)
    }
  } else if (payload.parts) {
    payload.parts.forEach(traverse)
  }

  return { html, text }
}

export default function GmailClient(props: GmailClientProps) {
  const {
    title = "Gmail Suite",
    maxResults = 25,
    defaultFolder = "INBOX",
    accentColor = "#EA4335",
    style,
  } = props

  // Safe theme context
  let theme: any
  try {
    const t = useTheme()
    theme = t.theme
  } catch {
    theme = {
      Color: {
        Base: {
          Surface: { 1: "#121214", 2: "#18191E", 3: "#262833" },
          Content: { 1: "#F4F4F6", 2: "#A1A4B5", 3: "#6B6E82" },
        },
        Accent: { Surface: { 1: "#EA4335" }, Content: { 1: "#FFFFFF" } },
        Error: { Surface: { 1: "#3B181A" }, Content: { 1: "#FF5252" } },
        Success: { Surface: { 1: "#152E20" }, Content: { 1: "#4CAF50" } },
      },
      Type: {
        Readable: {
          Title: {
            L: { fontSize: "20px", fontWeight: 600, fontFamily: "Inter, sans-serif" },
            M: { fontSize: "16px", fontWeight: 600, fontFamily: "Inter, sans-serif" },
            S: { fontSize: "14px", fontWeight: 600, fontFamily: "Inter, sans-serif" },
          },
          Body: {
            M: { fontSize: "14px", fontWeight: 400, fontFamily: "Inter, sans-serif" },
            S: { fontSize: "12px", fontWeight: 400, fontFamily: "Inter, sans-serif" },
          },
          Label: {
            M: { fontSize: "12px", fontWeight: 500, fontFamily: "Inter, sans-serif" },
            S: { fontSize: "11px", fontWeight: 500, fontFamily: "Inter, sans-serif" },
          },
        },
      },
      space: { "Space.XS": "4px", "Space.S": "8px", "Space.M": "12px", "Space.L": "16px", "Space.XL": "24px" },
      radius: { "Radius.S": "4px", "Radius.M": "8px", "Radius.L": "12px", "Radius.XL": "16px" },
      border: {
        getBorder1px: (c: string) => ({ border: "none", boxShadow: `0 0 1px 0px ${c}, inset 0 0 1px 0px ${c}` }),
        getOutline2px: (c: string) => ({ border: "none", outline: `2px solid ${c}`, outlineOffset: "-2px" }),
      },
    }
  }

  // Auth State
  const [currentUser, setCurrentUser] = React.useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = React.useState<boolean>(true)
  const [token, setToken] = React.useState<string | null>(inMemoryAccessToken)

  // App State
  const [folder, setFolder] = React.useState<FolderKey>(defaultFolder)
  const [messages, setMessages] = React.useState<GmailMessageSummary[]>([])
  const [selectedMessageId, setSelectedMessageId] = React.useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = React.useState<GmailMessageDetail | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = React.useState<boolean>(false)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState<boolean>(false)
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null)

  // Compose State
  const [isComposeOpen, setIsComposeOpen] = React.useState<boolean>(false)
  const [composeTo, setComposeTo] = React.useState<string>("")
  const [composeSubject, setComposeSubject] = React.useState<string>("")
  const [composeBody, setComposeBody] = React.useState<string>("")

  // Destructive / Mutation Confirmation Dialog State (MANDATORY by Workspace guideline)
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean
    title: string
    description: string
    confirmLabel: string
    confirmVariant?: "danger" | "primary"
    onConfirm: () => Promise<void>
  } | null>(null)
  const [isConfirming, setIsConfirming] = React.useState<boolean>(false)

  // Auth Listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user && inMemoryAccessToken) {
        setToken(inMemoryAccessToken)
      } else if (!user) {
        inMemoryAccessToken = null
        setToken(null)
      }
      setIsAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Auto-dismiss status notice
  React.useEffect(() => {
    if (!statusNotice) return
    const timer = setTimeout(() => setStatusNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [statusNotice])

  // Sign In with Google
  const handleSignIn = async () => {
    try {
      setIsAuthLoading(true)
      setErrorMessage(null)
      isSigningIn = true
      const result = await signInWithPopup(auth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (!credential?.accessToken) {
        throw new Error("Unable to retrieve Google OAuth access token.")
      }
      inMemoryAccessToken = credential.accessToken
      setToken(inMemoryAccessToken)
      setCurrentUser(result.user)
      setStatusNotice("Signed in successfully to Gmail.")
    } catch (err: any) {
      console.error("[GmailClient] Sign-in error:", err)
      setErrorMessage(err?.message || "Failed to sign in with Google.")
    } finally {
      isSigningIn = false
      setIsAuthLoading(false)
    }
  }

  // Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      inMemoryAccessToken = null
      setToken(null)
      setCurrentUser(null)
      setMessages([])
      setSelectedMessageId(null)
      setSelectedDetail(null)
      setStatusNotice("Signed out of Gmail.")
    } catch (err: any) {
      console.error("[GmailClient] Sign-out error:", err)
    }
  }

  // Load Message List from Gmail REST API
  const fetchMessages = React.useCallback(
    async (targetFolder: FolderKey = folder, queryOverride?: string) => {
      if (!token) return
      setIsLoadingMessages(true)
      setErrorMessage(null)

      try {
        let q = ""
        if (queryOverride !== undefined && queryOverride.trim().length > 0) {
          q = queryOverride.trim()
        } else {
          switch (targetFolder) {
            case "INBOX":
              q = "in:inbox"
              break
            case "SENT":
              q = "in:sent"
              break
            case "DRAFT":
              q = "in:draft"
              break
            case "TRASH":
              q = "in:trash"
              break
            case "STARRED":
              q = "is:starred"
              break
          }
        }

        const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
        url.searchParams.set("maxResults", String(maxResults))
        if (q) url.searchParams.set("q", q)

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        })

        if (!res.ok) {
          if (res.status === 401) {
            inMemoryAccessToken = null
            setToken(null)
            throw new Error("Session expired. Please sign in with Google again.")
          }
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData?.error?.message || `Failed to fetch messages (${res.status})`)
        }

        const data = await res.json()
        const messageRefs: Array<{ id: string; threadId: string }> = data.messages || []

        if (messageRefs.length === 0) {
          setMessages([])
          setSelectedMessageId(null)
          setSelectedDetail(null)
          setIsLoadingMessages(false)
          return
        }

        // Fetch metadata headers in parallel batches
        const detailPromises = messageRefs.slice(0, maxResults).map(async (ref) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          if (!detailRes.ok) return null
          const d = await detailRes.json()
          const fromRaw = parseHeader(d.payload?.headers, "From")
          const { name: fromName, email: fromEmail } = extractEmailSender(fromRaw)
          const subject = parseHeader(d.payload?.headers, "Subject") || "(No subject)"
          const to = parseHeader(d.payload?.headers, "To")
          const date = parseHeader(d.payload?.headers, "Date")
          const labelIds: string[] = d.labelIds || []
          const isUnread = labelIds.includes("UNREAD")
          const isStarred = labelIds.includes("STARRED")

          const summary: GmailMessageSummary = {
            id: ref.id,
            threadId: ref.threadId,
            from: fromName,
            fromEmail,
            to,
            subject,
            date: date ? new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
            snippet: d.snippet || "",
            isUnread,
            isStarred,
            labelIds,
          }
          return summary
        })

        const resolved = await Promise.all(detailPromises)
        const validMessages = resolved.filter((m): m is GmailMessageSummary => m !== null)
        setMessages(validMessages)
      } catch (err: any) {
        console.error("[GmailClient] Fetch error:", err)
        setErrorMessage(err?.message || "Error fetching Gmail messages.")
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [token, folder, maxResults]
  )

  // Trigger load on token or folder change
  React.useEffect(() => {
    if (token) {
      fetchMessages(folder)
    }
  }, [token, folder, fetchMessages])

  // Load Message Full Detail
  const loadMessageDetail = async (id: string) => {
    if (!token) return
    setSelectedMessageId(id)
    setIsLoadingDetail(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load email details.")
      const data = await res.json()

      const fromRaw = parseHeader(data.payload?.headers, "From")
      const { name: fromName, email: fromEmail } = extractEmailSender(fromRaw)
      const subject = parseHeader(data.payload?.headers, "Subject") || "(No subject)"
      const to = parseHeader(data.payload?.headers, "To")
      const date = parseHeader(data.payload?.headers, "Date")
      const labelIds: string[] = data.labelIds || []
      const { html, text } = extractBodyFromPayload(data.payload)

      setSelectedDetail({
        id: data.id,
        threadId: data.threadId,
        from: fromName,
        fromEmail,
        to,
        subject,
        date: date ? new Date(date).toLocaleString() : "",
        snippet: data.snippet || "",
        isUnread: labelIds.includes("UNREAD"),
        isStarred: labelIds.includes("STARRED"),
        labelIds,
        bodyHtml: html,
        bodyText: text,
      })

      // If unread, mark read
      if (labelIds.includes("UNREAD")) {
        markAsRead(id)
      }
    } catch (err: any) {
      console.error("[GmailClient] Load detail error:", err)
      setErrorMessage(err?.message || "Failed to load email contents.")
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Mark message as read
  const markAsRead = async (id: string) => {
    if (!token) return
    try {
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      })
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isUnread: false } : m))
      )
    } catch (err) {
      console.warn("[GmailClient] Mark read failed:", err)
    }
  }

  // Star / Unstar
  const toggleStar = async (msg: GmailMessageSummary, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!token) return
    const newStarred = !msg.isStarred
    try {
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          newStarred
            ? { addLabelIds: ["STARRED"] }
            : { removeLabelIds: ["STARRED"] }
        ),
      })
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isStarred: newStarred } : m))
      )
      if (selectedDetail && selectedDetail.id === msg.id) {
        setSelectedDetail({ ...selectedDetail, isStarred: newStarred })
      }
    } catch (err) {
      console.error("[GmailClient] Toggle star failed:", err)
    }
  }

  // Request Send Confirmation (MANDATORY User Confirmation for Workspace mutating API)
  const handleRequestSend = () => {
    if (!composeTo.trim()) {
      setErrorMessage("Please enter at least one recipient email address.")
      return
    }
    setErrorMessage(null)

    // Open explicit confirmation modal
    setConfirmDialog({
      isOpen: true,
      title: "Confirm Email Transmission",
      description: `Are you sure you want to send this email to "${composeTo}" with subject "${composeSubject || "(No Subject)"}" from your Gmail account?`,
      confirmLabel: "Send Email",
      confirmVariant: "primary",
      onConfirm: executeSendMail,
    })
  }

  // Execute Send Email via Gmail REST API
  const executeSendMail = async () => {
    if (!token) return
    setIsConfirming(true)
    try {
      const mime = [
        `To: ${composeTo.trim()}`,
        currentUser?.email ? `From: ${currentUser.email}` : "",
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(composeSubject.trim() || "(No Subject)")))}?=`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        "",
        composeBody.replace(/\n/g, "<br/>"),
      ]
        .filter(Boolean)
        .join("\r\n")

      const raw = encodeBase64Url(mime)

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error?.message || "Failed to transmit email through Gmail API.")
      }

      setIsComposeOpen(false)
      setComposeTo("")
      setComposeSubject("")
      setComposeBody("")
      setStatusNotice("Email sent successfully!")
      setConfirmDialog(null)
      // Refresh messages if on Sent or Inbox
      fetchMessages(folder)
    } catch (err: any) {
      console.error("[GmailClient] Send error:", err)
      setErrorMessage(err?.message || "Failed to send email.")
    } finally {
      setIsConfirming(false)
    }
  }

  // Request Move to Trash (MANDATORY User Confirmation for Workspace mutating API)
  const handleRequestTrash = (msg: GmailMessageSummary, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setConfirmDialog({
      isOpen: true,
      title: "Move to Trash?",
      description: `Move "${msg.subject}" from "${msg.from}" to Gmail Trash? This message will be permanently deleted after 30 days.`,
      confirmLabel: "Move to Trash",
      confirmVariant: "danger",
      onConfirm: async () => {
        setIsConfirming(true)
        try {
          const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/trash`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) throw new Error("Failed to move message to Trash.")
          setMessages((prev) => prev.filter((m) => m.id !== msg.id))
          if (selectedMessageId === msg.id) {
            setSelectedMessageId(null)
            setSelectedDetail(null)
          }
          setStatusNotice("Message moved to Trash.")
          setConfirmDialog(null)
        } catch (err: any) {
          console.error("[GmailClient] Trash error:", err)
          setErrorMessage(err?.message || "Failed to move message to Trash.")
        } finally {
          setIsConfirming(false)
        }
      },
    })
  }

  // Styles adhering to Shade DSL Variant Style System (Base / Variant / Size merged)
  const styles = {
    container: {
      position: "relative" as const,
      display: "flex",
      flexDirection: "column" as const,
      width: "100%",
      minHeight: "640px",
      backgroundColor: theme.Color.Base.Surface[1],
      color: theme.Color.Base.Content[1],
      borderRadius: theme.radius["Radius.L"],
      overflow: "hidden",
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      boxShadow: "0 18px 45px rgba(0, 0, 0, 0.45)",
      fontFamily: "Inter, sans-serif",
      ...style,
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `${theme.space["Space.M"]} ${theme.space["Space.L"]}`,
      backgroundColor: theme.Color.Base.Surface[2],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      gap: theme.space["Space.M"],
      flexWrap: "wrap" as const,
    },
    brandArea: {
      display: "flex",
      alignItems: "center",
      gap: theme.space["Space.S"],
    },
    logoBadge: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "32px",
      height: "32px",
      borderRadius: theme.radius["Radius.M"],
      backgroundColor: accentColor,
      color: "#FFFFFF",
      boxShadow: "0 2px 8px rgba(234, 67, 53, 0.35)",
    },
    brandTitle: {
      ...theme.Type.Readable.Title.M,
      margin: 0,
      color: theme.Color.Base.Content[1],
    },
    searchBox: {
      display: "flex",
      alignItems: "center",
      gap: theme.space["Space.S"],
      backgroundColor: theme.Color.Base.Surface[1],
      padding: `${theme.space["Space.XS"]} ${theme.space["Space.M"]}`,
      borderRadius: theme.radius["Radius.M"],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      flex: "1 1 240px",
      maxWidth: "420px",
    },
    searchInput: {
      width: "100%",
      backgroundColor: "transparent",
      border: "none",
      outline: "none",
      color: theme.Color.Base.Content[1],
      ...theme.Type.Readable.Body.M,
    },
    topActions: {
      display: "flex",
      alignItems: "center",
      gap: theme.space["Space.S"],
    },
    iconBtn: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
      borderRadius: theme.radius["Radius.M"],
      backgroundColor: theme.Color.Base.Surface[1],
      color: theme.Color.Base.Content[2],
      border: "none",
      cursor: "pointer",
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      transition: "color 0.15s, background-color 0.15s",
    },
    mainLayout: {
      display: "flex",
      flex: 1,
      minHeight: 0,
      height: "100%",
    },
    sidebar: {
      display: "flex",
      flexDirection: "column" as const,
      width: "210px",
      backgroundColor: theme.Color.Base.Surface[2],
      padding: theme.space["Space.M"],
      gap: theme.space["Space.S"],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      borderTop: "none",
      borderBottom: "none",
      borderLeft: "none",
      flexShrink: 0,
    },
    composeBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.space["Space.S"],
      width: "100%",
      padding: `${theme.space["Space.M"]} ${theme.space["Space.L"]}`,
      borderRadius: theme.radius["Radius.M"],
      backgroundColor: accentColor,
      color: "#FFFFFF",
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      ...theme.Type.Readable.Body.M,
      boxShadow: "0 4px 12px rgba(234, 67, 53, 0.3)",
      marginBottom: theme.space["Space.S"],
    },
    folderItem: (active: boolean) => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `${theme.space["Space.S"]} ${theme.space["Space.M"]}`,
      borderRadius: theme.radius["Radius.M"],
      backgroundColor: active ? theme.Color.Base.Surface[3] : "transparent",
      color: active ? theme.Color.Base.Content[1] : theme.Color.Base.Content[2],
      border: "none",
      cursor: "pointer",
      textAlign: "left" as const,
      width: "100%",
      ...theme.Type.Readable.Body.M,
      fontWeight: active ? 600 : 400,
    }),
    folderLeft: {
      display: "flex",
      alignItems: "center",
      gap: theme.space["Space.S"],
    },
    badgeCount: {
      backgroundColor: theme.Color.Base.Surface[1],
      color: theme.Color.Base.Content[1],
      padding: "2px 7px",
      borderRadius: "10px",
      fontSize: "11px",
      fontWeight: 600,
    },
    listPane: {
      flex: "1 1 340px",
      minWidth: "280px",
      maxWidth: selectedMessageId ? "380px" : "100%",
      display: "flex",
      flexDirection: "column" as const,
      backgroundColor: theme.Color.Base.Surface[1],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      borderTop: "none",
      borderBottom: "none",
      borderLeft: "none",
      overflowY: "auto" as const,
    },
    listHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `${theme.space["Space.S"]} ${theme.space["Space.M"]}`,
      backgroundColor: theme.Color.Base.Surface[2],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      fontSize: "12px",
      color: theme.Color.Base.Content[3],
    },
    messageRow: (selected: boolean, unread: boolean) => ({
      display: "flex",
      flexDirection: "column" as const,
      padding: theme.space["Space.M"],
      backgroundColor: selected
        ? theme.Color.Base.Surface[3]
        : unread
        ? theme.Color.Base.Surface[2]
        : "transparent",
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      cursor: "pointer",
      position: "relative" as const,
      gap: "4px",
    }),
    messageRowTop: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    senderName: (unread: boolean) => ({
      ...theme.Type.Readable.Body.M,
      fontWeight: unread ? 700 : 500,
      color: unread ? theme.Color.Base.Content[1] : theme.Color.Base.Content[2],
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
      maxWidth: "180px",
    }),
    messageDate: {
      ...theme.Type.Readable.Label.S,
      color: theme.Color.Base.Content[3],
    },
    subjectText: (unread: boolean) => ({
      ...theme.Type.Readable.Body.S,
      fontWeight: unread ? 600 : 400,
      color: unread ? theme.Color.Base.Content[1] : theme.Color.Base.Content[2],
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    }),
    snippetText: {
      ...theme.Type.Readable.Label.S,
      color: theme.Color.Base.Content[3],
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    },
    rowQuickActions: {
      display: "flex",
      alignItems: "center",
      gap: theme.space["Space.XS"],
      marginTop: "4px",
    },
    detailPane: {
      flex: "2 1 420px",
      display: "flex",
      flexDirection: "column" as const,
      backgroundColor: theme.Color.Base.Surface[1],
      overflowY: "auto" as const,
    },
    detailHeader: {
      padding: theme.space["Space.L"],
      backgroundColor: theme.Color.Base.Surface[2],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      display: "flex",
      flexDirection: "column" as const,
      gap: theme.space["Space.S"],
    },
    detailActions: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: theme.space["Space.XS"],
    },
    detailBody: {
      padding: theme.space["Space.L"],
      flex: 1,
      color: theme.Color.Base.Content[1],
      ...theme.Type.Readable.Body.M,
      lineHeight: "1.6",
      overflowWrap: "break-word" as const,
    },
    modalOverlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: theme.space["Space.M"],
    },
    modalCard: {
      backgroundColor: theme.Color.Base.Surface[2],
      borderRadius: theme.radius["Radius.L"],
      width: "100%",
      maxWidth: "560px",
      display: "flex",
      flexDirection: "column" as const,
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
      overflow: "hidden",
    },
    modalHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `${theme.space["Space.M"]} ${theme.space["Space.L"]}`,
      backgroundColor: theme.Color.Base.Surface[3],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
    },
    modalContent: {
      padding: theme.space["Space.L"],
      display: "flex",
      flexDirection: "column" as const,
      gap: theme.space["Space.M"],
    },
    modalInput: {
      width: "100%",
      padding: `${theme.space["Space.S"]} ${theme.space["Space.M"]}`,
      backgroundColor: theme.Color.Base.Surface[1],
      borderRadius: theme.radius["Radius.M"],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      color: theme.Color.Base.Content[1],
      outline: "none",
      ...theme.Type.Readable.Body.M,
    },
    modalTextArea: {
      width: "100%",
      height: "180px",
      padding: theme.space["Space.M"],
      backgroundColor: theme.Color.Base.Surface[1],
      borderRadius: theme.radius["Radius.M"],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      color: theme.Color.Base.Content[1],
      outline: "none",
      resize: "vertical" as const,
      ...theme.Type.Readable.Body.M,
    },
    modalFooter: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.space["Space.S"],
      padding: `${theme.space["Space.M"]} ${theme.space["Space.L"]}`,
      backgroundColor: theme.Color.Base.Surface[3],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      borderBottom: "none",
      borderLeft: "none",
      borderRight: "none",
    },
    authPromptContainer: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      padding: "64px 24px",
      textAlign: "center" as const,
      gap: theme.space["Space.L"],
      margin: "auto",
      maxWidth: "460px",
    },
    googleSignInBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      backgroundColor: "#FFFFFF",
      color: "#1F1F1F",
      border: "1px solid #747775",
      borderRadius: "20px",
      padding: "10px 24px",
      cursor: "pointer",
      fontWeight: 500,
      fontSize: "14px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
      transition: "background-color 0.2s, box-shadow 0.2s",
      width: "100%",
      maxWidth: "280px",
    },
  }

  return (
    <div style={styles.container}>
      {/* Top Header Bar */}
      <header style={styles.topBar}>
        <div style={styles.brandArea}>
          <div style={styles.logoBadge}>
            <Envelope size={18} weight="fill" />
          </div>
          <h2 style={styles.brandTitle}>{title}</h2>
        </div>

        {token && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              fetchMessages(folder, searchQuery)
            }}
            style={styles.searchBox}
          >
            <MagnifyingGlass size={16} color={theme.Color.Base.Content[3]} />
            <input
              type="text"
              placeholder="Search in mail (e.g. from:friend, has:attachment)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  fetchMessages(folder, "")
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: theme.Color.Base.Content[3] }}
              >
                <X size={14} />
              </button>
            )}
          </form>
        )}

        <div style={styles.topActions}>
          {token && (
            <>
              <button
                onClick={() => fetchMessages(folder, searchQuery)}
                title="Refresh mailbox"
                style={styles.iconBtn}
              >
                <ArrowsClockwise size={16} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "4px" }}>
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    style={{ width: "28px", height: "28px", borderRadius: "50%" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: theme.Color.Base.Surface[3],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: theme.Color.Base.Content[2],
                    }}
                  >
                    <UserIcon size={14} />
                  </div>
                )}
                <span style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2] }}>
                  {currentUser?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign out of Google"
                  style={{ ...styles.iconBtn, width: "32px", height: "32px" }}
                >
                  <SignOut size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Notifications / Error Banner */}
      <AnimatePresence>
        {statusNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: "8px 16px",
              backgroundColor: theme.Color.Success?.Surface?.[1] || "#152E20",
              color: theme.Color.Success?.Content?.[1] || "#4CAF50",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={16} weight="bold" />
              <span>{statusNotice}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: "8px 16px",
              backgroundColor: theme.Color.Error?.Surface?.[1] || "#3B181A",
              color: theme.Color.Error?.Content?.[1] || "#FF5252",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Warning size={16} weight="bold" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {!token ? (
        // Unauthenticated State: Official Sign in with Google Button
        <div style={styles.authPromptContainer}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              backgroundColor: theme.Color.Base.Surface[2],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accentColor,
              ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
            }}
          >
            <Envelope size={32} weight="duotone" />
          </div>
          <div>
            <h3 style={{ ...theme.Type.Readable.Title.L, margin: "0 0 8px 0" }}>Connect your Gmail account</h3>
            <p style={{ ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content[2], margin: 0 }}>
              Access your inbox, browse messages, write drafts, and send emails securely with Google Workspace
              permissions.
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={isAuthLoading}
            style={styles.googleSignInBtn}
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              style={{ display: "block", width: "18px", height: "18px" }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span>{isAuthLoading ? "Connecting..." : "Sign in with Google"}</span>
          </button>
        </div>
      ) : (
        // Authenticated Workspace Layout
        <div style={styles.mainLayout}>
          {/* Sidebar */}
          <aside style={styles.sidebar}>
            <button
              onClick={() => {
                setErrorMessage(null)
                setIsComposeOpen(true)
              }}
              style={styles.composeBtn}
            >
              <Pen size={16} weight="bold" />
              <span>Compose</span>
            </button>

            <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <button
                onClick={() => setFolder("INBOX")}
                style={styles.folderItem(folder === "INBOX")}
              >
                <div style={styles.folderLeft}>
                  <Tray size={16} />
                  <span>Inbox</span>
                </div>
                {folder === "INBOX" && messages.filter((m) => m.isUnread).length > 0 && (
                  <span style={styles.badgeCount}>{messages.filter((m) => m.isUnread).length}</span>
                )}
              </button>

              <button
                onClick={() => setFolder("STARRED")}
                style={styles.folderItem(folder === "STARRED")}
              >
                <div style={styles.folderLeft}>
                  <Star size={16} />
                  <span>Starred</span>
                </div>
              </button>

              <button
                onClick={() => setFolder("SENT")}
                style={styles.folderItem(folder === "SENT")}
              >
                <div style={styles.folderLeft}>
                  <PaperPlaneTilt size={16} />
                  <span>Sent</span>
                </div>
              </button>

              <button
                onClick={() => setFolder("DRAFT")}
                style={styles.folderItem(folder === "DRAFT")}
              >
                <div style={styles.folderLeft}>
                  <Folder size={16} />
                  <span>Drafts</span>
                </div>
              </button>

              <button
                onClick={() => setFolder("TRASH")}
                style={styles.folderItem(folder === "TRASH")}
              >
                <div style={styles.folderLeft}>
                  <Trash size={16} />
                  <span>Trash</span>
                </div>
              </button>
            </nav>
          </aside>

          {/* Messages List Pane */}
          <section style={styles.listPane}>
            <div style={styles.listHeader}>
              <span>
                {folder} {isLoadingMessages ? "• Syncing..." : `(${messages.length})`}
              </span>
              <span>Sorted by recent</span>
            </div>

            {isLoadingMessages && messages.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: theme.Color.Base.Content[3] }}>
                Loading emails from Gmail...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: theme.Color.Base.Content[3] }}>
                <Envelope size={32} style={{ marginBottom: "8px", opacity: 0.5 }} />
                <p style={{ margin: 0, ...theme.Type.Readable.Body.M }}>No messages in this folder.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selectedMessageId === msg.id
                return (
                  <div
                    key={msg.id}
                    onClick={() => loadMessageDetail(msg.id)}
                    style={styles.messageRow(isSelected, msg.isUnread)}
                  >
                    <div style={styles.messageRowTop}>
                      <span style={styles.senderName(msg.isUnread)}>{msg.from}</span>
                      <span style={styles.messageDate}>{msg.date}</span>
                    </div>

                    <div style={styles.subjectText(msg.isUnread)}>{msg.subject}</div>
                    <div style={styles.snippetText}>{msg.snippet}</div>

                    <div style={styles.rowQuickActions}>
                      <button
                        onClick={(e) => toggleStar(msg, e)}
                        title={msg.isStarred ? "Unstar" : "Star"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: msg.isStarred ? "#FFB800" : theme.Color.Base.Content[3],
                          padding: "2px",
                        }}
                      >
                        <Star size={14} weight={msg.isStarred ? "fill" : "regular"} />
                      </button>

                      {folder !== "TRASH" && (
                        <button
                          onClick={(e) => handleRequestTrash(msg, e)}
                          title="Move to trash"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: theme.Color.Base.Content[3],
                            padding: "2px",
                          }}
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </section>

          {/* Message Detail View */}
          <section style={styles.detailPane}>
            {isLoadingDetail ? (
              <div style={{ padding: "48px", textAlign: "center", color: theme.Color.Base.Content[3] }}>
                Loading email body...
              </div>
            ) : selectedDetail ? (
              <>
                <div style={styles.detailHeader}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ ...theme.Type.Readable.Title.L, margin: 0, color: theme.Color.Base.Content[1] }}>
                      {selectedDetail.subject}
                    </h3>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => toggleStar(selectedDetail)}
                        title={selectedDetail.isStarred ? "Unstar" : "Star"}
                        style={styles.iconBtn}
                      >
                        <Star
                          size={16}
                          weight={selectedDetail.isStarred ? "fill" : "regular"}
                          color={selectedDetail.isStarred ? "#FFB800" : "inherit"}
                        />
                      </button>

                      <button
                        onClick={() => {
                          setComposeTo(selectedDetail.fromEmail)
                          setComposeSubject(`Re: ${selectedDetail.subject.replace(/^Re:\s*/i, "")}`)
                          setComposeBody(`\n\n--- On ${selectedDetail.date}, ${selectedDetail.from} wrote: ---\n`)
                          setIsComposeOpen(true)
                        }}
                        title="Reply"
                        style={styles.iconBtn}
                      >
                        <ArrowBendUpLeft size={16} />
                      </button>

                      {folder !== "TRASH" && (
                        <button
                          onClick={() => handleRequestTrash(selectedDetail)}
                          title="Move to trash"
                          style={{
                            ...styles.iconBtn,
                            color: theme.Color.Error?.Content?.[1] || "#FF5252",
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ ...theme.Type.Readable.Body.M, fontWeight: 600 }}>{selectedDetail.from}</span>
                      <span style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>
                        &lt;{selectedDetail.fromEmail}&gt;
                      </span>
                    </div>
                    <span style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>
                      {selectedDetail.date}
                    </span>
                  </div>

                  <div style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>
                    To: {selectedDetail.to}
                  </div>
                </div>

                <div style={styles.detailBody}>
                  {selectedDetail.bodyHtml ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: selectedDetail.bodyHtml }}
                      style={{ overflowX: "auto" }}
                    />
                  ) : (
                    <pre
                      style={{
                        fontFamily: "inherit",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        margin: 0,
                      }}
                    >
                      {selectedDetail.bodyText || selectedDetail.snippet || "(No content)"}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: theme.Color.Base.Content[3],
                  gap: "12px",
                }}
              >
                <Envelope size={40} style={{ opacity: 0.3 }} />
                <span>Select a message from the list to preview</span>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Compose Email Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={styles.modalCard}
            >
              <div style={styles.modalHeader}>
                <span style={{ ...theme.Type.Readable.Title.S, fontWeight: 600 }}>New Message</span>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: theme.Color.Base.Content[2] }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.modalContent}>
                <input
                  type="email"
                  placeholder="Recipient (To: email@example.com)"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  style={styles.modalInput}
                />
                <input
                  type="text"
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  style={styles.modalInput}
                />
                <textarea
                  placeholder="Write your email here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  style={styles.modalTextArea}
                />
              </div>

              <div style={styles.modalFooter}>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: theme.radius["Radius.M"],
                    backgroundColor: "transparent",
                    color: theme.Color.Base.Content[2],
                    border: "none",
                    cursor: "pointer",
                    ...theme.Type.Readable.Body.M,
                  }}
                >
                  Discard
                </button>
                <button
                  onClick={handleRequestSend}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 20px",
                    borderRadius: theme.radius["Radius.M"],
                    backgroundColor: accentColor,
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    ...theme.Type.Readable.Body.M,
                  }}
                >
                  <PaperPlaneTilt size={16} weight="bold" />
                  <span>Send</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANDATORY Confirmation Modal for Workspace Mutating / Destructive Operations */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{ ...styles.modalCard, maxWidth: "460px" }}
            >
              <div style={styles.modalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Warning
                    size={20}
                    color={
                      confirmDialog.confirmVariant === "danger"
                        ? theme.Color.Error?.Content?.[1] || "#FF5252"
                        : accentColor
                    }
                    weight="bold"
                  />
                  <span style={{ ...theme.Type.Readable.Title.S, fontWeight: 600 }}>{confirmDialog.title}</span>
                </div>
                <button
                  onClick={() => !isConfirming && setConfirmDialog(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: theme.Color.Base.Content[2] }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.modalContent}>
                <p style={{ margin: 0, ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content[2] }}>
                  {confirmDialog.description}
                </p>
              </div>

              <div style={styles.modalFooter}>
                <button
                  onClick={() => setConfirmDialog(null)}
                  disabled={isConfirming}
                  style={{
                    padding: "8px 16px",
                    borderRadius: theme.radius["Radius.M"],
                    backgroundColor: "transparent",
                    color: theme.Color.Base.Content[2],
                    border: "none",
                    cursor: "pointer",
                    ...theme.Type.Readable.Body.M,
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    await confirmDialog.onConfirm()
                  }}
                  disabled={isConfirming}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 20px",
                    borderRadius: theme.radius["Radius.M"],
                    backgroundColor:
                      confirmDialog.confirmVariant === "danger"
                        ? theme.Color.Error?.Content?.[1] || "#D32F2F"
                        : accentColor,
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    ...theme.Type.Readable.Body.M,
                  }}
                >
                  {confirmDialog.confirmVariant === "danger" ? (
                    <Trash size={16} weight="bold" />
                  ) : (
                    <PaperPlaneTilt size={16} weight="bold" />
                  )}
                  <span>{isConfirming ? "Processing..." : confirmDialog.confirmLabel}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Framer Property Controls
addPropertyControls(GmailClient, {
  title: {
    type: ControlType.String,
    title: "Title",
    defaultValue: "Gmail Suite",
  },
  maxResults: {
    type: ControlType.Number,
    title: "Max Results",
    min: 5,
    max: 100,
    step: 5,
    defaultValue: 25,
  },
  defaultFolder: {
    type: ControlType.Enum,
    title: "Folder",
    options: ["INBOX", "STARRED", "SENT", "DRAFT", "TRASH"],
    optionTitles: ["Inbox", "Starred", "Sent", "Drafts", "Trash"],
    defaultValue: "INBOX",
  },
  accentColor: {
    type: ControlType.Color,
    title: "Accent",
    defaultValue: "#EA4335",
  },
})
