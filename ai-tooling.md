# AI Tooling Disclosure: The Recall Ledger

## 1. Summary

I used AI tools throughout this project to help with planning, implementation, testing, and documentation. I directed the scope and architecture, reviewed the proposed changes, and ran the checks needed to decide whether each card was complete. AI helped me move the work forward, but I remained responsible for the decisions and the final result.

## 2. Tools used and how

| Tool | Role in the project | How its output was verified |
|---|---|---|
| **Cursor** (AI code editor) | Implemented each Trello card from a per-card build prompt; generated code and tests within that card's scope | Ran every card's acceptance checks myself (curl, UI, `npm test`); reviewed diffs before committing; merged only through PRs with green CI |
| **Claude** (Anthropic, chat) | Helped interpret the rubric, plan the sprints and board, create the per-card prompt pack, review the beta build, and draft the design and testing document and presentation script.| I checked technical claims against the repository and rubric and verified test counts by running the suites. AI-assisted drafts were subject to my review and final wording decisions.|
| **Anthropic API** (runtime, in the product) | Powers the server-side persona-ranking service (`/api/persona-rank`) | The service uses a strict JSON contract, server-side validation, a fallback path, and an evaluation suite in CI. These checks are described in the design and testing document, Section 2.4. |

| **ChatGPT**  | Helped organize and phrase this AI tooling disclosure from the project outline I supplied. | The supplied outline was the factual basis for the draft. This drafting step did not independently inspect the repository or run tests; I am responsible for confirming the final account before submission. | 

## 3. Workflow

1. **Beta build.** A first version was built with Cursor to prove the design
   and surface real data-source problems.
2. **Prompt pack.** The beta was reverse-engineered into one build prompt per
   Trello card, preserving lessons learned (e.g., FDA `report_date` sorting,
   CPSC re-publish dates, Render `--include=dev`).
3. **Card-by-card rebuild.** Each card: branch → Cursor implements within
   scope → I run acceptance checks → PR → green CI → merge → Trello to Done.
4. **Review gates.** After each card I asked the agent what decisions it made
   that I hadn't asked for, to catch scope drift before it reached `main`.

Working one card at a time made it easier for me to follow the changes and judge whether they met the intended goal. Asking the agent to explain its additional decisions gave me a clearer view of where it was making assumptions. The decision to re-scope the persona UI to a server-side API in Sprint 3 also reinforced that I needed to keep the work aligned with the project's priorities.

## 4. What I owned (not delegated)

AI contributed suggestions and implementation work in these areas, but I retained responsibility for the decisions and approval:

- Product scope and priorities: deciding what belonged in the project, including re-scoping the persona UI to a server-side API in Sprint 3.
- Architecture: choosing the backend-for-frontend (BFF) approach, the normalization of the two recall sources, and the caching strategy.
- Verification and acceptance: running acceptance checks, test suites, and live-site checks, and deciding whether the results satisfied the card's requirements.
- Deployment and configuration: managing deployment, DNS and the custom domain, and environment secrets.
- Code review and merging: reviewing diffs, checking changes against the card's scope, and approving merges after CI passed.
- Documentation and presentation: reviewing AI-assisted drafts and taking responsibility for the final wording and technical claims.


## 5. Where AI fell short / lessons learned

- Live data exposed details that prompts alone did not settle. FDA report_date sorting and CPSC re-publish dates showed why I needed to check behavior against the actual sources. A plausible implementation still needed verification against the data it would use.

- AI could make decisions beyond the requested scope. Asking what the agent had changed or decided without being asked made those assumptions easier to review. I needed to judge each change against the card's acceptance criteria.

- Smaller prompts made the work easier to control. One prompt per card gave me a defined set of changes to review and a clear stopping point for testing. This helped me connect each implementation decision to a requirement.

- Generated tests and documentation still needed scrutiny. Passing tests did not replace checking the UI and live site, and a confident explanation did not establish that a claim matched the repository. Test counts and descriptions of implemented behavior needed to come from the actual project.

- Next time, I would bring source and deployment checks into the process earlier. I would test representative API responses and the deployment build before expanding the implementation, then carry those findings into the card prompts and acceptance checks.

## 6. Accountability statement

I am responsible for the code, architecture, verification, and documentation submitted for this project, including work produced with AI assistance. AI accelerated the process, while reviewing changes, checking their behavior, and deciding what to accept remained my responsibility.
