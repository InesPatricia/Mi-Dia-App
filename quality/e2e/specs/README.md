# Test plans

A plan is prose that says what should be tested and why, before any test file exists. It is the
cheapest artifact in the pipeline to review, which is the whole reason this directory is here: a
scope error costs a sentence to fix in a plan, a rewrite to fix in code, and an incident to fix
after promotion.

## What is in here

| File | Written by | Read by |
|---|---|---|
| `<feature>.plan.md` | the planner agent, exploring the running app | a person, then the generator agent |
| `<feature>-*-dead-ends.md` | whoever investigated a failure | the next person who hits it |
| `BUGS.md` | whoever found the defect | whoever picks it up |

## The rule that makes a plan worth having

**A plan is reviewed before anything is generated from it.** The planner takes the running
application as ground truth, so it records what the app does, not what it should do. If a feature
shipped with a defect, an unreviewed plan writes that defect down as the specification, and the
generated test then defends it against its own fix.

Nothing downstream catches that. The generator only verifies that the steps run, and the healer only
tries to make a red test green. The review is the only place a person asks whether the described
behaviour is the behaviour anyone wanted.

## Not the same thing as a feature spec

`../SPEC-TEMPLATE.md` is the other document with "spec" in the name, and it sits at the opposite end
of the same feature: a person writes it **before** the code exists, so the implementer and the tester
cannot bias each other. A plan in this directory is written **after** the code exists, by reading it.

One describes the agreement. The other describes the reality. Keeping both is how you notice when
they differ. The full comparison is in `docs/QA-ARCHITECTURE.md`.

## Corrections belong in the plan, not only in the test

If a generated test has to deviate from its plan, the plan is updated too, keeping the scenario id
and the file path stable. A plan that no longer matches the tests grown from it is worse than no
plan, because it reads as a specification while describing something that stopped being true.
