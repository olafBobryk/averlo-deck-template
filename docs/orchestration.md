# Orchestration

How agents divide work in this repository (constitution VI). This is the minimal version from P0; it is completed in T039.

## Roles

- **Owner thread**: the session the owner talks to. It holds the plan, the decisions and the conversation with the owner, delegates the work, and decides what happens to everything returned. It is the only writer of `docs/decisions/`.
- **Implementer**: a subagent that changes files. It owns an explicit list of files and touches nothing else.
- **Reviewer**: a read-only subagent. It sees the code, not the implementer's conclusion.

## The delegation brief

Every brief states:

- the task ids from the approved `tasks.md`, and the goal;
- the files the subagent owns, and the files it may only read;
- the rules that bind it (the "Rules for every task" in `tasks.md`), including that blocked terms never appear in anything it writes;
- what done looks like, and which checks prove it.

## Limits

- At most 2 implementers run at once.
- Two writers never own the same file at once.
- A subagent's report is a claim. The owner thread checks it against the diff and the gate before reporting it done.

## Parking

After 3 failed attempts at a phase's gate, the owner thread parks the phase as a draft pull request that says what failed and why, with the question, options and a recommendation. It notifies the owner, records the question in `docs/decisions/open-questions.md`, and continues with phases that don't depend on it.
