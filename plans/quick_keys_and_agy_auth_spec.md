# Tech Spec: Quick Keys Auto-Width Styling & Antigravity CLI Auth Resolution

1. **Objective**
   - **Problem Statement**:
     1. Quick Keys chips inside `Terminal.tsx` look "disgusting" because the `Button` component enforces `width: "100%"`, causing distorted button rendering, stretched child text, or forced inline layout issues. Users need quick keys width to be `auto` (sizing tightly to their label content, like real keyboard keycaps) with clean padding, theme-token typography, and responsive wrapping/scrolling.
     2. `agy` PTY execution displayed `Got an error: token exchange failed: oauth2: "invalid_grant" "Malformed auth code."` followed by 429 quota exhaustion on `gemini-3.1-pro`, preventing headless CLI sessions from responding.
   - **Solution Overview**:
     1. Override `width: 'auto'` on Quick Keys `Button` components (and motion wrapper), applying optical keycap styling with subtle border tokens (`theme.border.getBorder1px`), monospace label typography, and natural content-sized horizontal padding.
     2. Install a dedicated `/app/applet/bin/agy` wrapper that automatically forces `--model gemini-3.8-flash-low` and uses `GEMINI_API_KEY`, bypassing OAuth prompts and 429 rate limits on default pro models.
   - **Scope**:
     - `components/Page/Terminal.tsx`: Refactor Quick Keys container and chip rendering with `width: 'auto'`, proper theme tokens, and clean layout.
     - `/app/applet/bin/agy`: Production wrapper for the CLI binary.
     - `README.md`: Update changelog with changes.

2. **Success Criteria**
   - Quick Keys buttons have `width: 'auto'`, displaying as compact, tactile keycaps with zero distortion or stretched flex.
   - Quick Keys wrap gracefully or scroll smoothly with zero layout overflow.
   - `agy` runs without any OAuth errors and returns clean responses using `GEMINI_API_KEY`.
   - `compile_applet` succeeds with zero errors.

3. **Project Requirements**
   - [x] Analyze `agy` binary and resolve OAuth failure and quota exhaustion.
   - [x] Create wrapper at `/app/applet/bin/agy` routing to `/app/applet/bin/agy-bin` with `--model gemini-3.8-flash-low`.
   - [ ] Refactor Quick Keys chips in `/components/Page/Terminal.tsx` to use `width: 'auto'`, keycap border, and responsive auto-sizing.
   - [ ] Update `README.md` changelog.
   - [ ] Compile and verify applet builds cleanly.

4. **Architecture Decisions**
   - **Keycap Width (`width: 'auto'`)**: The core `Button` primitive defines `width: "100%"` for touch parity across dynamic label changes. For Quick Keys, we pass `style={{ width: 'auto', minWidth: '28px', ... }}` to override this default and preserve content-based hugging.
   - **Model Delegation**: `gemini-3.8-flash-low` provides instant CLI feedback without hitting 429 daily free tier caps of `gemini-3.1-pro`.

5. **Pseudo Code**
   ```tsx
   // Quick Keys Chip render
   <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.XS'], flexWrap: 'wrap' }}>
     <span style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Quick Keys:</span>
     {QUICK_KEYS.map(k => (
       <Button
         key={k.label}
         variant="secondary"
         size="S"
         label={k.label}
         onClick={() => sendInputToProcess(k.val)}
         style={{
           width: 'auto',
           minWidth: '26px',
           height: '24px',
           padding: `0 ${theme.space['Space.S']}`,
           fontSize: '11px',
           fontFamily: 'monospace',
           borderRadius: theme.radius['Radius.S'],
           flexShrink: 0
         }}
       />
     ))}
   </div>
   ```
