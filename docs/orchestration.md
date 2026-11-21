# Orchestration

How agents divide work in this repository. It applies the [constitution](../.specify/memory/constitution.md), Principles VI and VII; where the two differ, the constitution wins.

## Roles

- **Owner thread**: the session the owner talks to. It holds the plan, the decisions and the conversation with the owner. It delegates the work, verifies what comes back and decides what happens to it. It is the only writer of `docs/decisions/`.
- **Implementer**: a subagent that changes files. It owns an explicit list of files and touches nothing else. It works in its own git worktree on its own branch, and commits only when its brief says so.
- **Researcher**: a read-only subagent that answers a question and reports what it found, with file paths.
- **Reviewer**: a read-only subagent that gives a second opinion on a change. It sees the code and the spec, not the implementer's report or the owner thread's conclusion.

An unattended run implements only tasks from an approved `tasks.md`. Anything that needs the owner's answer is raised with the owner, never decided by an agent (Principle I).

## The delegation brief

A subagent knows only its brief. Every brief states:

- the task ids from the approved `tasks.md`, and the goal;
- the worktree and branch to work in;
- what to read first: the constitution, the spec sections, and the code it builds on;
- the files the subagent owns, and that everything else is read only;
- the rules that bind it: the "Rules for every task" in `tasks.md`, and that no blocked term appears in anything it writes;
- what it must not do, such as running the full gate, pushing, or committing;
- what done looks like, which checks prove it, and how to stop any server it starts;
- what its report holds: the files changed, the checks run with their results, anything not run, and any decision it made or could not make.

## File ownership

- Each file has one writer at a time. Two subagents never own the same file at once.
- Phases own disjoint files, as listed in the feature's `plan.md`. A subagent that finds it needs a file it does not own stops and reports, rather than editing it.
- Ported files are never edited by anyone (Principle VIII). Carried files change only as their `docs/carried/` rows list.

## Parallel limits

- At most 2 implementers run at once. The gate machine has 8 GB of memory, and each implementer's production build and Playwright runs need a large share of it.
- Researchers and reviewers are read only and light, so they may run beside the implementers, as long as they start no server or build.
- Parallel subagents use different ports (`SMOKE_PORT`, `PDF_PORT`), keep their test runs to their own specs, and stop every server they start, by its process id. Unless its brief says otherwise, a subagent does not run `npm run gate`; the owner thread does.

## Verifying a report

A subagent's report is a claim. Before the owner thread reports anything as done, it:

1. reads the diff, and checks that only the owned files changed;
2. runs the checks the brief named, or the gate, itself;
3. runs `npm run scan:public`, and `npm run scan:public -- --text <file>` on any text it will post;
4. reports every check that did not run as not run, never as passed.

A reviewer's approval is a second opinion, not the owner's approval.

## Parking

After 3 failed attempts at a phase's gate, the owner thread parks the phase:

1. it opens the phase as a draft pull request that says what failed and why, with the question, the options and a recommendation;
2. it records the question in `docs/decisions/open-questions.md` and notifies the owner;
3. it continues with the phases that do not depend on it.

## Branches and merging

- Each phase has its own branch, stacked on the one it depends on, as the feature's `plan.md` lists. A phase that depends on two others brings the second in with a merge commit.
- Commits are small and in plain English, with no Conventional Commit prefixes.
- Once a phase's gate passes, an agent may push its branch and open its pull request against the branch below it. When that one is merged, the pull request is retargeted to `main`.
- The owner merges, into `main`, in phase order, always with a merge commit, never squash. Agents never merge into `main`.
- Changing the repository's visibility or template setting, publishing a release or deploying needs the owner's separate, explicit go.
