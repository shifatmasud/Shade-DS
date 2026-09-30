# Tech Spec 

1. **Objective**
   - **Problem Statement**: The user requested to set up OpenMail (agent email) for this project following the integration guide at `https://docs.openmail.sh/integrations/claude-code` and the API reference at `https://docs.openmail.sh/llms.txt`. The API key is `om_8629d2a727356d0515d23fda9bc7a9e0f57ac73655f0d7e4`, and the agent inbox is `shifatmasud@omail.sh`. The key must be stored securely as `OPENMAIL_API_KEY` (never hardcoded in application source code), all guide requirements installed (CLI + agent skill), and the installation verified by sending a test email from the inbox and reading it back.
   - **Solution Overview**:
     1. Securely store `OPENMAIL_API_KEY` and default `OPENMAIL_INBOX_ID` in `.env` (gitignored), `~/.openmail-cli/state.json`, and environment profile.
     2. Ensure `@openmail/cli` is installed and symlinked into `./bin/openmail`.
     3. Install the official agent skill (`openmailsh/skills`) to provide the agent with email manipulation capabilities.
     4. Write an automated verification script in `/framer/test/openmailTestRoundtrip.ts` that:
        - Reads the API key dynamically from environment (`process.env.OPENMAIL_API_KEY` or `.env`).
        - Sends a test email to `shifatmasud@omail.sh` with a unique verification token.
        - Polls `openmail threads list` or `openmail messages list` for the inbox.
        - Reads the message back and asserts that the body content matches the test payload.
     5. Document full verification and architecture in `/RCA/rca_openmail_agent_setup_and_roundtrip.md`.
   - **Scope**: OpenMail API key configuration, skill provisioning, roundtrip dispatch-and-read test script, and RCA documentation.
   - **Context**: Autonomous AI agent requiring inbound and outbound email capabilities.

2. **Success Criteria**
   - **Zero Source Hardcoding**: API key is loaded dynamically from `process.env.OPENMAIL_API_KEY` or `.env`.
   - **Guide Compliance**: Agent skill is installed and OpenMail CLI state points to `shifatmasud@omail.sh`.
   - **Test Email Dispatch**: Successfully sends an email via `openmail send` to `shifatmasud@omail.sh`.
   - **Test Email Readback**: Successfully queries the inbox via `openmail messages list` / `openmail threads get`, retrieving the dispatched email and verifying content integrity.
   - **Automated Verification**: `/framer/test/openmailTestRoundtrip.ts` executes and exits code 0 with all assertions passing.

3. **Project Requirements**
   - [x] Review OpenMail Claude Code integration guide and LLM specification.
   - [x] Configure `OPENMAIL_API_KEY` and `OPENMAIL_INBOX_ID` in `.env` and `~/.openmail-cli/state.json`.
   - [x] Install OpenMail agent skill (`~/.claude/skills/openmail`).
   - [x] Verify CLI inbox resolution without requiring inline credentials.
   - [x] Write roundtrip test script in `/framer/test/openmailTestRoundtrip.ts`.
   - [x] Execute roundtrip test (send email -> poll and read back from inbox).
   - [x] Record results and details in `/RCA/rca_openmail_agent_setup_and_roundtrip.md`.

4. **Architecture Decisions**
   - **Secure Key Storage vs Hardcoding**: OpenMail CLI natively reads `process.env.OPENMAIL_API_KEY`, `.env` in the current working directory, and `savedApiKey` from `~/.openmail-cli/state.json`. Storing in `.env` and `state.json` ensures that both background CLI calls and programmatic Node scripts have seamless access without embedding secrets into committed files.
   - **Inbox Targeting**: Storing `defaultInboxId` and `defaultInboxAddress` in `state.json` guarantees that `openmail send`, `openmail messages`, and `openmail threads` immediately target `shifatmasud@omail.sh` without requiring repetitive `--inbox-id` arguments.
   - **Polling Strategy for Readback**: When sending an email to an inbox on the same infrastructure, delivery occurs within seconds. The verification harness implements an exponential-backoff polling loop (checking up to 30 seconds) on `openmail messages list` to retrieve and validate the delivered payload.

5. **Pseudo Code**
   ```dsl
   MODULE OpenMailSetupAndVerification:
     DATA:
       inboxAddress: String = "shifatmasud@omail.sh"
       testToken: String = generateRandomUUID()
       subject: String = "OpenMail Agent Test: " + testToken
       body: String = "Verification payload: " + testToken

     LOGIC:
       FUNCTION verifyRoundtrip():
         ASSERT env.OPENMAIL_API_KEY IS NOT EMPTY
         
         // 1. Send test email
         sendResult = EXEC "openmail send --to " + inboxAddress + " --subject \"" + subject + "\" --body \"" + body + "\" --json"
         ASSERT sendResult.success IS TRUE
         
         // 2. Poll messages until testToken arrives
         FOR attempt FROM 1 TO 10:
           SLEEP 3000ms
           messages = EXEC "openmail messages list --limit 10 --json"
           matched = FIND message IN messages WHERE message.subject CONTAINS testToken
           IF matched:
             ASSERT matched.bodyText CONTAINS testToken
             RETURN SUCCESS
             
         THROW ERROR "Timed out waiting for test message delivery"
   ```
