# Outer Tests

Changing an outer test after its red commit, and the cases around it. Part of the implement skill; read it when SKILL.md or another playbook points here.

## Changing an Outer Test

An outer test is the plan's check of its criterion, committed red before the code. Workers never edit one. It can still need to change: a review finds it too weak, a design revision renames what it calls, or a formatter reflows it. The rule is the same for all three ([Outer tests](../../docs/reference/rules-and-intents.md#outer-tests)):

**An outer test changes only through a rewrite task that `wb:test-writer` carries out, and the change lands only when the task verifier's report shows all three:**

1. The criterion's text in design.md is unchanged.
2. Nothing the red-commit version caught is lost, shown one of three ways:
   - **mechanical**: the integrity script proves the change is a reflow, an import re-sort, or whitespace;
   - **name only**: only identifier references in code positions changed, for a rename design.md states. An occurrence in a string, selector, route, snapshot, expected value, assertion message, or user-facing copy is not name only;
   - **differential**: every case the red-commit version caught is still caught, run on `wb-plant-defect` or a recognized mutation tool that runs both versions.
3. Every added assertion checks what the criterion's statement or one of its examples already states.

When all three hold, the change lands without asking the person: they approved the criterion, and the proof shows the test still checks it at least as well. When any does not hold, the person decides (below). You never weigh the proof yourself; you read it from the verifier's report.

### What starts a rewrite

- **A blocking test gap** whose fix is the outer test: the task verifier or the phase test review shows a planted defect that breaks the criterion and survives its outer test.
- **A rename a design revision forces**, or an earlier plan's outer test this plan's design renames ("Earlier Plans' Outer Tests a Rename Breaks" below).
- **A formatter** that reflowed an outer test inside a task's diff.

A judgment-only proposal ("review these", a Rewrite no planted defect or detector supports) is a follow-up. Never start a rewrite for one on your own initiative.

### Filing and running it

1. **File it** with `<plugin scripts>/wb-records file --from <id> --title "Rewrite outer test <file> (AC-n)" --file <path>`, linked to the review finding's issue, or to the task whose commit last changed the test (`git log -1 -- <test file>`). The description cites the criterion on its Serves line and carries this line, followed by the proof and suggested fix that started it:

   `Outer test rewrite: AC-n <outer test file> from red <sha>; reason: <the gap, in a few words | rename <old> → <new>, stated at design.md <section> | reflow>`

   Only you write that line. `wb:test-writer` and the verifier treat a change to an outer test as a rewrite only when the task description carries it (an older plan's `Sanctioned rewrite:` line counts the same).
2. **Spawn `wb:test-writer`** for the task, in rewrite mode, with the test file and red commit from the line. No worker runs: the task changes a test and nothing else. The brief carries the differential requirement, because a rewrite that drops a case the original caught loses coverage nobody agreed to lose:
   - **Cases**: one planted defect for each case the red-commit version catches (every branch, pattern alternative, call form, input shape, and table row of its predicate or assertion, on shapes present in the repository or named in the criterion's examples), and one for the gap. Both versions run against each.
   - **The bar**: the rewrite fails on every one. The red-commit version is expected to pass on the gap's defect, since that miss is why the rewrite exists.
   - **Shapes outside the repository and the examples** are not cases. The test-writer lists each in its report with the search that shows the shape is absent, and the verifier repeats the search.
   - **The suggested fix** is a starting point, not the specification: where following it would stop catching something the original catches, the rewrite keeps the original's case and adds the gap.
3. **Verify** with `wb:task-verifier` as for any task. It reads [rewrite-verification.md](../../docs/reference/rewrite-verification.md) and its returned block's Outer tests line says `rewrite proven (<file>; mechanical | name only | differential, <n> of <n> caught)` or `rewrite not proven (<file>; <what was not shown>)`.

### When the proof holds

1. Post the record: `<plugin scripts>/wb-records put <task-id> --escaped 'rewrite: AC-n <outer test file>; reason: <reason>; proof: <the Outer tests line>; report <the verification report manifest's comment id>'`.
2. Commit the rewritten test on its own as `red(AC-n): <criterion title> (rewrite: <reason>)`, with the task's beads id on a second message line. That commit is the criterion's baseline from then on: every reader that finds a criterion's red commit by title takes the latest one.
3. List it under "Decisions I made for you" in the next report: what the test now catches that it did not, the proof in one clause, and the undo (`git revert <sha>`).

A formatter reflow inside an ordinary task needs no rewrite task: when that task's verifier passes with `outer test reflow, mechanical (<kind>)` in its Test Integrity section, commit the outer test file alone first, as `red(AC-n): <criterion title> (rewrite: reflow)`, then the task's other files.

### When the proof does not hold

The change does not land. What was not shown decides who acts:

- **The differential could not run** (no defect runner and no recognized mutation tool): the person decides, because nobody can show what the rewrite kept. Say so, with the install hint the verifier's Defect checks line gives.
- **A case the original caught is lost**: give the test-writer one more attempt with the verifier's class fix. If cases are still lost, the person decides whether to accept them, by a reply that names them (`not claimed: <cases>`), which you record on the task; accepting lost coverage is theirs, never yours or the judge's.
- **An added check goes beyond the criterion**, or the criterion's text would have to change: that changes what the criterion means, so it goes to the person as a design question.

Put each of these through the judge first ("The judge" in [failures.md](failures.md)), which writes the question in product terms.

## Earlier Plans' Outer Tests a Rename Breaks

An earlier plan's outer tests stay in the repository and keep guarding their criteria. When this plan's design renames or retires an identifier one of them uses (a function, class, route, field, message key, or file), that test fails on the renamed code, and no worker may change it. Find them before the phase, so nobody trips over one mid-task.

1. **Find them**, one plain command per call:
   - the renames and retirements design.md states (its decisions, Data Model, and Integration Points);
   - the earlier outer tests: `git --no-pager log --format='%h %s' --grep='^red(AC-'`, keeping the commits that are not this plan's (made before this plan's first commit, or whose criterion title matches no criterion in this design.md), and each one's test file from `git --no-pager show --stat --format= <sha>`;
   - for each old identifier, `git grep -n -w '<old identifier>' -- <test path>` over the conventions' test paths, keeping the hits in those earlier outer test files.

   Leave out a hit tasks.md already plans as a rewrite task.
2. **A hit in a code position only** (an identifier reference): plan the rewrite. File the rewrite task as above with `reason: rename <old> → <new>, stated at design.md <section>`, linked to the task that makes the rename, and post a `rewrite: planned` record on the renaming task naming the earlier test and the identifier, before its worker runs. That task's verifier then treats the named test's failure on the old identifier as expected, citing the record; every other failure counts as usual. Run the rewrite task immediately after the renaming task is committed, before any other task.
3. **Any other hit** goes to the person before the phase, in the decision form of [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md), naming the earlier criterion, the test file and line, and the old and new identifier, because it changes what the earlier plan's test checks:
   - an occurrence outside a code position (a string, a route, an expected value): what the test asserts would change;
   - the design retires the behavior: retiring a criterion is a design change through `/wb:create_design`;
   - the old identifier should keep working (an alias the design did not plan): also a design change.

create_tasks runs the same search at its Step 4a and plans each name-only rewrite as a task after the renaming task, so the run finds it planned.

## Stub Files Route (attended mode only)

An outer test for a criterion whose class or module does not exist yet cannot go red: the test file fails to load, and a red commit must prove an assertion fails. When `wb:test-writer` returns `blocked (not red yet: <name> does not exist; planned at <path>)` and a task in this phase plans to create that path, the person may approve an empty stub there, so the test loads and reaches its assertion.

- **Approval**: ask in the decision form, naming the criterion, the planned path, and the declaration the stub would hold (an empty class or module), with these options: approve the stub (reply `stub files: <path>`); plan a task that creates the class before the outer test (a plan change); or treat it as a plan defect. Only a reply that names the path approves it. Neither you nor the judge grants it, and it is never available in unattended mode: the stub is production code written by the party that wants the red, so the person has to see each one.
- **Writing it**: record the reply (`user reply:`). Confirm the path does not exist yet; if it exists, there is no stub to write, so tell the person. Write the stub with the Write tool holding only the declaration the test needs to load: no method, no return value, no behavior. Take its blob with `git hash-object --no-filters <path>`, then post the record on the task: `stub files: <path>; pre-state: absent; stub blob: <blob>; owner: <task-id>; declaration: <the declaration>; approved in <the user reply: comment's issue>`. Leave the stub uncommitted: the red commit's pathspec names only the test file, and the worker replaces it.
- **Red again**: spawn `wb:test-writer` again for the criterion. Its red must still be an assertion failure; a missing-method error on the empty stub is not one. Never grow the stub to get a red.
- **The worker and the verifier**: name the stub in the context package's `relevantFiles` as the file the task replaces. The verifier reads the `stub files:` record, treats the path as planned production code, and checks that the worker replaced the stub.
- **Cleanup**: whenever the stub would be removed or overwritten by anyone but the owner task's worker, first compare `git hash-object --no-filters <path>` with the record's stub blob. Equal: it is still the stub, so remove it (or, for a retry, leave it for the next attempt). Different: someone's work is in it, so change nothing and ask the person, naming the path and both blobs.
