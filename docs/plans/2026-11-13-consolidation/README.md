# 5.0 Consolidation

**Created**: 2026-11-13
**Ticket**: N/A
**Status**: Implementing (Phase 1: the prover)

## Intent

Each line ends with its record: (why; source; reviewed; strength). The user's words are quoted from the 2026-11-13 planning conversation.

**Goal**: Make the 5.0 testing flow a process agents follow consistently, whose stops are the person's to make, and which proves the product meets its requirements. (why: the alpha's test rules work, but the process around them drives most halts and cost; source: "I want you to own this code. How do we achieve our goals and drive a consistent process?"; reviewed: yes; strength: aim)

**Success looks like**:

- The system proves what it can before asking the person: each acceptance criterion ends a phase as proven, disproven, or could not prove, and the person's manual list holds only what could not be proven. (why: tests are a proxy, and the defects that mattered were found by running the product; source: "prove it actually does what you claim it does and meets our requirements feels like a strong backpressure on the system that we don't have fully nailed yet … the system should try to prove what it can first"; reviewed: yes; strength: aim)
- Stops that reach the person are about the product. Test-adequacy and bookkeeping questions are settled without them, inside stated limits. (why: across two sessions no test decision was declined and the person routed them to an advisor; source: "ask a fable advisor before asking me" (a trial session, 2026-11-10) and "I can't make a deicsion based on what you stated. how does this affect the product" (a trial session, 2026-11-12); reviewed: yes; strength: aim)
- A record-keeping slip cannot halt a run. (why: a forgotten tracker link halted one run for 6 and 10 hours; source: drafted from the session review; reviewed: yes; strength: aim)
- Agents get the context they need and no more: instruction text shrinks from the alpha, measured in characters. (why: plugin text grew from 382k to 926k characters and agents skip steps; source: "How do we organize the work and ensure the agents have the context they need?"; reviewed: yes; strength: aim)
- The integrity floor holds: workers never edit tests, red comes before green, and a test that was weakened, skipped, deleted, or changed without a declaration still fails verification. (why: this is what 5.0 exists for; source: drafted from the testing-guidance plan's Intent; reviewed: yes; strength: hard)

**Non-goals**:

- Adding mechanisms that do not replace an existing one, apart from the prover. (why: each trial added rules, and the added text made the next slip more likely; source: drafted from the review; reviewed: yes; strength: aim)
- Shipping 5.0.0. The release decision stays with the person's trials on two projects. (why: source: "5.0 is still basically alpha … I am doing 'manual' evals on this by working with it through development on 2 projects"; reviewed: yes; strength: hard)
- Copying another workflow's process. (why: source: "Don't anchor too hard on that article"; reviewed: yes; strength: aim)

**Amendments**:

- (none yet)

## Documentation Structure

- **[research.md](research.md)** - What the alpha does in real use: session measurements and code measurements
- **[design.md](design.md)** - Decisions for the consolidation, with the prover's acceptance criteria
- **[tasks.md](tasks.md)** - Phases and tasks; status lives in beads

## Starting Point

- **Checkpoint**: tag `v5.0.0-alpha.1` (commit `1ab9b7a`, branch `testing-guidance-v2`)
- **Working branch**: `5.0-consolidation`
- **Predecessor plan**: [2026-10-16-testing-guidance](../2026-10-16-testing-guidance/README.md)
- **Repository**: gvarela/workbench
