# Tech Spec: Gmail Integration & Interactive Client Component

1. **Objective**
- Enable seamless Gmail integration into the application using OAuth 2.0 with Firebase Authentication and the Gmail REST API (`gmail.googleapis.com/gmail/v1`).
- Provide an interactive, full-featured Gmail client component in `/framer/test/GmailClient.tsx` conforming to the Shade DSL architecture, Theme tokens, and Framer component standards.
- Support reading, searching, viewing threads/messages, composing, sending emails, and managing messages (labels/trash) with mandatory explicit confirmation dialogs for all mutating operations.

2. **Success Criteria**
- OAuth flow successfully configured with requested Gmail scopes via `set_up_oauth` for Google Cloud project `gen-lang-client-0732713233`.
- Official "Sign in with Google" UI flow utilizing Firebase Auth popup, in-memory token cache, and real-time auth state synchronization (`onAuthStateChanged`).
- Robust Gmail API client handling messages list, metadata extraction (From, To, Date, Subject), message body decoding (base64url), and message search query.
- Send mail and delete mail operations strictly guarded by an explicit user confirmation modal before execution.
- Strict design system adherence (Theme tokens, Surface elevations, Content hierarchies, no Tailwind, border procedural helpers, Phosphor icons, Framer Motion fluid animations).
- 100% build and TypeScript compilation success (`npm run lint` / `compile_applet`).

3. **Project Requirements**
- [x] Configure OAuth with project `gen-lang-client-0732713233` and authorized Gmail scopes.
- [x] Install `firebase` package to enable Firebase Auth client-side OAuth flow.
- [ ] Create detailed Tech Spec in `/plans/gmail_integration_tech_spec.md`.
- [ ] Implement `/framer/test/GmailClient.tsx` featuring:
  - Client-side Firebase Auth initialization using `/firebase-applet-config.json`.
  - In-memory access token storage and clean session management.
  - Inbox browsing, unread badge, category/label filtering, and search bar.
  - Rich message detail view with decoded HTML/plain text content and attachments indicator.
  - Compose modal with RFC 2822 MIME message formatting and base64url encoding.
  - Explicit confirmation modal for sending and deleting emails.
  - Framer Property Controls (`title`, `maxResults`, `themeMode`, `accentColor`).
- [ ] Verify TypeScript and build integrity via `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
- **Decision 1: Direct Client-Side REST with In-Memory Token Caching**
  - *Trade-off*: Server-side OAuth redirect routes fail in dynamic ephemeral cloud preview environments with `redirect_uri_mismatch`.
  - *Solution*: Authenticate via client-side Firebase Auth popup (`GoogleAuthProvider` with Gmail scopes) and perform requests directly to `https://gmail.googleapis.com/gmail/v1/users/me/*` with `Authorization: Bearer ${accessToken}` in memory. Token is never persisted to `localStorage` or `sessionStorage`.
- **Decision 2: Mandatory Destructive & Mutation Action Gate**
  - *Trade-off*: Accidental clicks could send incomplete emails or delete critical user correspondence.
  - *Solution*: Implement a dedicated `ConfirmationModal` required by Workspace integration guidelines that details the target action, recipients/subject, and requires explicit confirmation click before dispatching `POST users/me/messages/send` or `POST users/me/messages/{id}/trash`.
- **Decision 3: MIME Message Encoder in Pure TypeScript**
  - *Trade-off*: Browser cannot use Node `nodemailer` or heavyweight email builders.
  - *Solution*: Construct valid RFC 2822 MIME headers (`To:`, `Subject:`, `Content-Type: text/html; charset=utf-8`) with proper UTF-8 Base64URL encoding (`btoa(unescape(encodeURIComponent(str)))` with URL-safe replacements).

5. **Pseudo Code**

```typescript
// Shade DSL Model: GmailClient
COMPONENT:
  GmailClient

DATA:
  props: {
    title: string
    maxResults: number
    initialQuery: string
  }
  state: {
    user: User | null
    token: string | null
    messages: GmailMessageSummary[]
    selectedMessage: GmailMessageDetail | null
    isComposing: boolean
    composeDraft: { to: string; subject: string; body: string }
    searchQuery: string
    activeFolder: "INBOX" | "SENT" | "DRAFT" | "TRASH"
    isLoading: boolean
    confirmAction: { type: "SEND" | "TRASH"; title: string; desc: string; onConfirm: () => void } | null
  }
  ref: {
    cachedTokenRef: RefObject<string | null>
  }

LOGIC:
  action handleSignIn():
    provider = new GoogleAuthProvider()
    provider.addScope("https://mail.google.com/")
    res = await signInWithPopup(auth, provider)
    token = GoogleAuthProvider.credentialFromResult(res).accessToken
    cachedTokenRef.current = token
    fetchMessages()

  action fetchMessages(query, folder):
    res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + query)
    items = await res.json()
    fetchDetailsForItems(items)

  action confirmAndSendMail():
    setConfirmAction({
      type: "SEND",
      title: "Send this email?",
      desc: "To: " + draft.to + " | Subject: " + draft.subject,
      onConfirm: async () => {
        mime = buildRfc2822Mime(draft)
        raw = base64UrlEncode(mime)
        await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ raw })
        })
        closeCompose()
        fetchMessages()
      }
    })

RENDER:
  div.gmailRoot
    ├─ div.headerBar
    │   ├─ div.brandLogo & h2.title
    │   ├─ input.searchBar
    │   └─ button.authAction
    ├─ div.workspaceContainer
    │   ├─ aside.sidebar
    │   │   ├─ button.composeTrigger
    │   │   └─ nav.folderList (Inbox, Sent, Drafts, Trash)
    │   └─ main.contentArea
    │       ├─ div.messageList
    │       └─ div.messagePreviewDetail
    ├─ modal.composeDialog
    └─ modal.confirmationGate
```
