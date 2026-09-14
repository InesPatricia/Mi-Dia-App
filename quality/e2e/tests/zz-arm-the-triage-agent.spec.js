// TEMPORARY. DO NOT MERGE. This test exists to fail on purpose, once.
//
// WHY IT IS HERE
//   The AI failure-triage agent shipped on 2026-07-28 and produced nothing for six weeks, because
//   it asked for a key this repository does not have and every failure path in it exits 0 by design.
//   That was fixed on 2026-09-14 and merged in #58, and the fix was verified by running the agent
//   from a laptop against a real failed run.
//
//   What that verification could not touch is the wiring. The agent is triggered by `workflow_run`,
//   which executes the workflow file from the DEFAULT branch, so the path from "e2e goes red on a
//   pull request" to "a comment appears on that pull request" only exists in CI, on main, and only
//   when something actually fails. No amount of local running reaches it.
//
//   An alarm nobody has heard is not an alarm. So this pull request makes the suite go red on
//   purpose, exactly once, to find out whether the agent wakes up, reads the diff and the logs, and
//   writes. The expected outcome is a comment on this pull request within a few minutes of the e2e
//   run finishing.
//
// WHAT HAPPENS NEXT
//   The pull request is closed and this branch is deleted as soon as the answer is known, whichever
//   way it goes. Nothing here is meant to survive.
//
// WHY THE FILENAME STARTS WITH zz
//   Only so it sorts last and is obvious in a file listing. It carries no meaning to the runner.
const { test, expect } = require('../fixtures/app.fixture');

test('deliberately failing check that arms the triage agent', async ({ app, page }) => {
  await app.launch();

  // A realistic shape of failure rather than expect(1).toBe(2): the agent is being asked to read a
  // Playwright assertion diff and correlate it with a diff that adds this file, so the failure it
  // reads should look like the ones it will see in real life. The title below is not the app's.
  //
  // The short timeout is deliberate too. The default would spend 30 seconds per retry waiting for
  // something that is never going to be true, and the point of this run is the agent, not patience.
  await expect(page).toHaveTitle('Not the title this application has', { timeout: 3000 });
});
