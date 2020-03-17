import { createRequire } from "https://deno.land/std@v0.36.0/node/module.ts";
import {
  assert,
  assertEquals
} from "https://deno.land/std@v0.36.0/testing/asserts.ts";
import { readFile } from "https://raw.github.com/srackham/drake/master/mod.ts";
// import { CallbackFunction, CallbackMessage } from "../src/rimu/options.ts";

interface RenderOptions {
  safeMode?: number;
  htmlReplacement?: string;
  reset?: boolean;
  callback?: CallbackFunction;
}

interface CallbackMessage {
  type: string;
  text: string;
}

type CallbackFunction = (message: CallbackMessage) => void;

const require_ = createRequire(import.meta.url);
const rimu = require_("../lib/rimu.js");

type RimuTest = {
  description: string;
  input: string;
  expectedOutput: string;
  expectedCallback: string;
  options: { reset: boolean; callback: CallbackFunction };
};

function catchLint(message: CallbackMessage): never { // Should never be called.
  console.log(message.type + ": " + message.text);
  throw new Error();
}

Deno.test(
  function rimuApiTest(): void {
    assert(
      rimu.render.constructor === Function,
      "Rimu.render is a function"
    );
  }
);

Deno.test(
  function rimuTest(): void {
    // Execute tests specified in JSON file.
    const data = readFile("./test/rimu-tests.json");
    const tests: RimuTest[] = JSON.parse(data);
    for (const test of tests) {
      let msg = "";
      if (test.expectedCallback === "") {
        test.options.callback = catchLint;
      } else {
        test.options.callback = function(message: CallbackMessage): void {
          msg += message.type + ": " + message.text + "\n";
        };
      }
      let rendered = rimu.render(test.input, test.options);
      assertEquals(rendered, test.expectedOutput, test.description);
      if (test.expectedCallback !== "") {
        assertEquals(msg.trim(), test.expectedCallback, test.description);
      }
    }
  }
);