# AI Self-Evolving System — Project Roadmap

> Living tracker for the project. Update this file in the same PR that completes a milestone.

## Vision

Build a provider-agnostic autonomous system that can discover worthwhile opportunities, choose a goal, research it, plan and build software, test and deploy it, observe users/quality/business outcomes, learn from results, improve itself, and repeat the loop toward sustainable value and revenue.

Core loop:

**Discover Opportunities → Evaluate → Choose Goal → Research → Plan → Build → Test → Deploy → Observe → Learn → Improve → Repeat**

The system must remain controlled, auditable, incremental, and human-approved for consequential external mutations.

## Completed milestones

### Engineering foundation

- [x] Bootstrap core project and architecture
- [x] Repository understanding boundary
- [x] Provider-agnostic AI provider boundary
- [x] Task management foundation
- [x] Task execution loop
- [x] Sandboxed repository workspace
- [x] Tool contracts and registry
- [x] Repository file operation tools
- [x] Controlled tool-calling loop
- [x] Bounded agent loop
- [x] Connect AI provider to agent model
- [x] OpenAI-compatible provider without SDK coupling
- [x] End-to-end agent runtime
- [x] Controlled test runner

### GitHub engineering lifecycle

- [x] Read-only Git observation tools
- [x] Controlled branch creation
- [x] Human-approved commit boundary
- [x] Human-approved checkout boundary
- [x] Controlled unstage
- [x] Human-approved push boundary
- [x] Human-approved GitHub PR creation
- [x] Read-only PR status observation
- [x] GitHub checks observation
- [x] GitHub review observation
- [x] Strict PR merge gate

### Deployment and observation

- [x] Provider-agnostic deployment boundary
- [x] Deployment status observation
- [x] Provider-agnostic health observation

### Learning and self-improvement

- [x] Learning record store
- [x] Deterministic learning analysis
- [x] Deterministic improvement proposal boundary
- [x] Approved improvement execution boundary
- [x] Richer deterministic learning analysis
- [x] Connect execution results to richer learning analysis
- [x] Explicit improvement approval checkpoint
- [x] Improvement outcome verification boundary
- [x] Controlled improvement lifecycle orchestration

### Economic decision layer

- [x] Deterministic opportunity evaluation
- [x] Deterministic goal selection
- [x] Research boundary
- [x] Planning boundary
- [x] Plan → Task Bridge
- [x] Connect generated tasks to the existing task execution loop
- [x] Build implementation context from goal, research, plan, and task

## Current milestone

- [ ] **MVP: validate the complete opportunity-to-learning loop**
  - [x] Evaluate opportunities and select a goal.
  - [x] Research and plan through provider-agnostic boundaries.
  - [x] Convert plan steps into registered tasks with provenance.
  - [x] Build implementation context and pass it into bounded agent execution.
  - [x] Preserve task state through execution and record the result as learning.
  - [x] Add an end-to-end deterministic MVP test.
  - [ ] Run the MVP against a real AI provider on a safe disposable repository.

## Next milestones

### Engineering execution

- [ ] Improve bounded agent execution around generated tasks

### Product / economic loop

- [ ] Define user/usage observation boundary
- [ ] Define product quality observation boundary
- [ ] Define conversion/retention observation boundary
- [ ] Define revenue/cost/profitability observation boundary
- [ ] Connect economic observations to learning
- [ ] Improve opportunity discovery using observed evidence
- [ ] Add opportunity validation before expensive engineering work

### Controlled autonomy

- [x] Define improvement lifecycle orchestration boundary
- [x] Define end-to-end orchestration state machine
- [x] Add explicit budgets and execution limits
- [x] Add audit/event trail across autonomous runs
- [x] Add failure recovery without bypassing approval boundaries
- [x] Add explicit improvement approval checkpoint

## Explicit non-goals for now

- [ ] No autonomous spending
- [ ] No autonomous user outreach or acquisition
- [ ] No uncontrolled web crawling
- [ ] No provider lock-in
- [ ] No autonomous production mutation without approval boundaries
- [ ] No replacing deterministic safety boundaries with opaque behavior prematurely

## Working rules

1. Work in a feature branch; never implement directly on `main`.
2. Keep each milestone small and independently testable.
3. Add focused tests with each new boundary.
4. Run build and test before merge.
5. Re-check PR head, checks, reviews, and merge safety immediately before merging.
6. Update this roadmap when a milestone is actually completed.
7. Prefer original implementations and permissive dependencies; do not copy copyrighted code or designs.
