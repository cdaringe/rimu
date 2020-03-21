import {
  assert,
  assertEquals,
  assertNotEquals
} from "https://deno.land/std@v0.36.0/testing/asserts.ts";
import {
  readFile,
  shCapture
} from "https://raw.github.com/srackham/drake/master/mod.ts";

type RimucTest = {
  description: string;
  args: string;
  input: string;
  expectedOutput: string;
  exitCode?: number;
  predicate: string;
  layouts?: boolean;
};

async function runTest(test: RimucTest): Promise<void> {
  let shout = await shCapture(
    `node ./bin/rimuc.js --no-rimurc ${test.args ?? ""}`,
    { input: test.input }
  );
  testShOut(shout, test);
  shout = await shCapture(
    `deno --allow-env --allow-read src/deno/rimuc.ts ${test.args ?? ""}`,
    { input: test.input }
  );
  testShOut(shout, test);
}

function testShOut(
  shout: { code: number | undefined; output: string; error: string },
  test: RimucTest
): void {
  const out = shout.output + shout.error;
  switch (test.predicate) {
    case "equals":
      assertEquals(out, test.expectedOutput, test.description);
      break;
    case "!equals":
      assertNotEquals(out, test.expectedOutput, test.description);
      break;
    case "contains":
      assert(out.indexOf(test.expectedOutput) >= 0, test.description);
      break;
    case "!contains":
      assert(out.indexOf(test.expectedOutput) === -1, test.description);
      break;
    case "startsWith":
      assert(out.startsWith(test.expectedOutput), test.description);
      break;
    case "exitCode":
      assertEquals(out, test.expectedOutput, test.description);
      assert(shout.code === test.exitCode, test.description);
      break;
    default:
      assert(
        false,
        test.description + ": illegal predicate: " + test.predicate
      );
  }
}

Deno.test(
  async function rimucTest(): Promise<void> {
    // Execute tests specified in JSON file.
    const data = readFile("./test/rimuc-tests.json");
    const tests: RimucTest[] = JSON.parse(data);
    for (const test of tests) {
      if (test.layouts) {
        // Run the test on built-in layouts.
        const t = { ...test }; // TODO: Necessary?
        for (const layout of ["classic", "flex", "sequel"]) {
          t.args = "--layout " + layout + " " + test.args;
          t.description = layout + " layout: " + test.description;
          await runTest(t);
        }
      } else {
        await runTest(test);
      }
    }
  }
);
