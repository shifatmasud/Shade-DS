# Tech Spec

1. **Objective**
Create a highly specialized "Technical Interviewer" agent skill located in `/skills/technical-interviewer/SKILL.md`. This skill will govern the agent's behavior when the user issues the `/interview` command in the chat, enabling a structured, diagnostic, multi-choice (ABCD) dialogue designed to systematically extract user intent, technical context, architectural boundaries, and constraints for complex software development tasks.

2. **Success Criteria**
- A robust, comprehensive custom skill is successfully created in `/skills/technical-interviewer/SKILL.md` following the mandatory format.
- The skill includes valid YAML frontmatter specifying its name, version, purpose, applicability, and triggers (including `/interview` and relevant synonyms).
- The skill defines a structured diagnostic framework (Phase 0: Intent Discovery, Phase 1: Context Mapping, Phase 2: Boundary Negotiation, Phase 3: Selection Synthesis) using H1-delimited contexts.
- Each phase is defined with clear, actionable rules instructing the agent on how to formulate exactly 3-5 custom-tailored multiple-choice questions (A, B, C, D) corresponding to different architectural paths.
- The skill mandates the inclusion of standard options like "None of the above (provide custom details)" to avoid forcing the user into pre-baked paths.
- The application compilation passes smoothly with no linting errors.

3. **Project Requirements**
- Create the custom skill file at `/skills/technical-interviewer/SKILL.md` with YAML frontmatter and H1-delimited contexts.
- Structure the skill's instructions to outline the `/interview` command execution flow, question-generation syntax, response-handling strategy, and synthesis output format.
- Verify that there are no syntax errors or breaking changes in the workspace using the `lint_applet` tool.

4. **Architecture Decisions**
- **Trigger-Based Skill Activation**: Define `/interview` as a clear explicit trigger so that when the agent parses the user's message containing this keyword, it immediately reads the `/skills/technical-interviewer/SKILL.md` and executes its diagnostic interview protocol.
- **Dynamic 3-to-5 Question ABCD Structure**: Using multiple-choice questions streamlines user interaction in a chat interface while mapping cleanly to distinct technical architectures (e.g., frontend vs full-stack, local vs cloud persistence, high-fidelity motion vs performant minimalism).
- **Proactive Boundary Clarification**: The questions will target intent, context, and boundaries to establish complete architectural certainty before coding starts, preventing scope creep and downstream regression.

5. **Pseudo Code** (Written in Shade DSL)

```yaml
Data:
  triggerCommand: "/interview"
  skillPath: "/skills/technical-interviewer/SKILL.md"
  phases:
    - Phase 0: Intent & Core Utility
    - Phase 1: Tech Stack & Architecture Context
    - Phase 2: Boundaries, Constraints & Edge Cases
    - Phase 3: Interview Summary & Planning Execution

Logic:
  OnUserMessage:
    if message.contains(triggerCommand) or message.contains("interview me"):
      ReadSkillFile(skillPath)
      InitInterviewState()
      GenerateNextQuestions()
    else if InterviewState.isActive:
      ProcessUserAnswers(message)
      if InterviewState.isComplete:
        GenerateTechnicalPlan()
      else:
        GenerateNextQuestions()

Render:
  QuestionBlock:
    Layout: VerticalStack
    Spacing: Medium
    Children:
      - Title: "Interviewer Diagnostic Question [Index]"
      - Options: List of [A, B, C, D] styled as crisp high-contrast buttons or lists
```
