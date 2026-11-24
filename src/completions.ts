import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

type Group = "std" | "member" | "snippet";
type Entry = readonly [
  name: string,
  body: string,
  description: string,
  group: Group,
];
const entries: Entry[] = [
  [
    "cout",
    "cout << ${1:value}",
    "Write a value to standard output. Include <iostream>.",
    "std",
  ],
  [
    "cin",
    "cin >> ${1:value}",
    "Read a whitespace-delimited value from standard input. Include <iostream>.",
    "std",
  ],
  [
    "cerr",
    "cerr << ${1:message}",
    "Write a diagnostic to standard error. Include <iostream>.",
    "std",
  ],
  [
    "endl",
    "endl",
    "Write a newline and flush the stream. Include <ostream>.",
    "std",
  ],
  [
    "getline",
    "getline(${1:stream}, ${2:line})",
    "Read one full line into a string. Include <string>.",
    "std",
  ],
  [
    "vector",
    "vector<${1:int}> ${2:values}",
    "A resizable contiguous sequence. Include <vector>.",
    "std",
  ],
  [
    "string",
    "string ${1:text}",
    "An owning sequence of characters. Include <string>.",
    "std",
  ],
  [
    "map",
    "map<${1:int}, ${2:int}> ${3:items}",
    "Ordered key-value pairs with unique keys. Include <map>.",
    "std",
  ],
  [
    "set",
    "set<${1:int}> ${2:values}",
    "An ordered collection of unique values. Include <set>.",
    "std",
  ],
  [
    "sort",
    "sort(${1:v}.begin(), ${1:v}.end())",
    "Sort a range in ascending order. Include <algorithm>.",
    "std",
  ],
  [
    "reverse",
    "reverse(${1:v}.begin(), ${1:v}.end())",
    "Reverse the order of a range. Include <algorithm>.",
    "std",
  ],
  [
    "min",
    "min(${1:a}, ${2:b})",
    "Return the smaller value. Include <algorithm>.",
    "std",
  ],
  [
    "max",
    "max(${1:a}, ${2:b})",
    "Return the larger value. Include <algorithm>.",
    "std",
  ],
  [
    "lower_bound",
    "lower_bound(${1:v}.begin(), ${1:v}.end(), ${2:key})",
    "Find the first element at least as large as key in a sorted range. Include <algorithm>.",
    "std",
  ],
  [
    "accumulate",
    "accumulate(${1:v}.begin(), ${1:v}.end(), ${2:0})",
    "Accumulate a range from an initial value. Include <numeric>.",
    "std",
  ],
  [
    "push_back",
    "push_back(${1:value})",
    "Append one value to the end of a sequence.",
    "member",
  ],
  ["size", "size()", "Return the number of elements in a container.", "member"],
  ["begin", "begin()", "Return an iterator to the first element.", "member"],
  [
    "end",
    "end()",
    "Return the iterator just past the final element.",
    "member",
  ],
  [
    "if",
    "if (${1:condition}) {\n\t$0\n}",
    "Run a block when its condition is true.",
    "snippet",
  ],
  [
    "else",
    "else {\n\t$0\n}",
    "Run a fallback block after an if statement.",
    "snippet",
  ],
  [
    "switch",
    "switch (${1:value}) {\n\tcase ${2:0}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}",
    "Choose a branch according to an integral or enumeration value.",
    "snippet",
  ],
  [
    "for",
    "for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t$0\n}",
    "Count from zero up to an exclusive upper bound.",
    "snippet",
  ],
  [
    "for range",
    "for (const auto& ${1:value} : ${2:values}) {\n\t$0\n}",
    "Visit each element by const reference.",
    "snippet",
  ],
  [
    "while",
    "while (${1:condition}) {\n\t$0\n}",
    "Repeat while a condition stays true.",
    "snippet",
  ],
  [
    "do while",
    "do {\n\t$0\n} while (${1:condition});",
    "Run once, then repeat while a condition stays true.",
    "snippet",
  ],
  [
    "int main()",
    "int main() {\n\t$0\n\treturn 0;\n}",
    "Define the program entry point.",
    "snippet",
  ],
  [
    "array",
    "std::array<${1:int}, ${2:5}> ${3:values}{};",
    "Create a fixed-size, value-initialized array. Include <array>.",
    "snippet",
  ],
  [
    "matrix",
    "std::vector<std::vector<${1:int}>> ${2:matrix}(${3:rows}, std::vector<${1:int}>(${4:cols}));",
    "Create a rectangular matrix of runtime dimensions. Include <vector>.",
    "snippet",
  ],
  [
    "function",
    "${1:int} ${2:calculate}(${3:int value}) {\n\treturn ${4:value};\n}",
    "Define a function with parameters and a return value.",
    "snippet",
  ],
  [
    "contest",
    "#include <algorithm>\n#include <iostream>\n#include <vector>\n\nvoid solve() {\n\t$0\n}\n\nint main() {\n\tstd::ios::sync_with_stdio(false);\n\tstd::cin.tie(nullptr);\n\tint cases;\n\tif (!(std::cin >> cases)) return 1;\n\tfor (int i = 0; i < cases; ++i) solve();\n}",
    "Start a fast-I/O, multiple-test-case program using standard headers.",
    "snippet",
  ],
];

const headers = [
  "algorithm",
  "array",
  "cmath",
  "cstdint",
  "deque",
  "iomanip",
  "iostream",
  "limits",
  "map",
  "numeric",
  "queue",
  "set",
  "sstream",
  "stack",
  "string",
  "utility",
  "vector",
];
const kind = monaco.languages.CompletionItemKind;

export function registerCppAssistance() {
  monaco.languages.registerCompletionItemProvider("cpp", {
    triggerCharacters: [".", ":", "<", ">"],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const line = model.getLineContent(position.lineNumber);
      const left = line.slice(0, word.startColumn - 1);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        position.column,
      );
      if (/^\s*#\s*include\s*<$/.test(left)) {
        const close = line.slice(position.column - 1).startsWith(">")
          ? ""
          : ">";
        return {
          suggestions: headers.map((label) => ({
            label,
            insertText: label + close,
            kind: kind.Module,
            detail: "Standard library header",
            range,
          })),
        };
      }
      const member = /(?:\.|->)\s*$/.test(left);
      const qualified = /\bstd::\s*$/.test(left);
      const preceding = model
        .getValueInRange(
          new monaco.Range(
            Math.max(1, position.lineNumber - 350),
            1,
            position.lineNumber,
            word.startColumn,
          ),
        )
        .slice(-32768);
      const usingStd = /\busing\s+namespace\s+std\s*;/.test(preceding);
      const suggestions: monaco.languages.CompletionItem[] = entries
        .filter(([, , , group]) =>
          member
            ? group === "member"
            : qualified
              ? group === "std"
              : group !== "member",
        )
        .map(([label, body, documentation, group]) => ({
          label,
          documentation,
          range,
          filterText:
            label === "int main()" &&
            (word.word.startsWith("m") || /\bint\s+$/.test(left))
              ? "main"
              : label,
          kind:
            group === "member"
              ? kind.Method
              : group === "std"
                ? kind.Function
                : kind.Snippet,
          detail:
            group === "std"
              ? "C++ standard library"
              : group === "member"
                ? "Container member"
                : "C++ snippet",
          insertText:
            label === "int main()" && /\bint\s+$/.test(left)
              ? body.slice(4)
              : group === "std" && !qualified && !usingStd
                ? "std::" + body
                : body,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        }));
      if (!member && !qualified) {
        const locals = new Set<string>();
        for (const match of preceding.matchAll(
          /\b(?:int|long|float|double|char|bool|auto|string|size_t)\s*[*&]*\s+([a-zA-Z_]\w*)/g,
        )) {
          locals.add(match[1]);
        }
        for (const label of locals)
          suggestions.push({
            label,
            insertText: label,
            kind: kind.Variable,
            detail: "Name in this file",
            range,
          });
        const headerRange = /^\s*#\s*$/.test(left)
          ? new monaco.Range(
              position.lineNumber,
              left.indexOf("#") + 1,
              position.lineNumber,
              position.column,
            )
          : range;
        if (!left.trim() || /^\s*#\s*$/.test(left)) {
          for (const h of headers)
            suggestions.push({
              label: "include <" + h + ">",
              kind: kind.Module,
              insertText: "#include <" + h + ">",
              range: headerRange,
            });
        }
      }
      return { suggestions };
    },
  });
  monaco.languages.registerHoverProvider("cpp", {
    provideHover(model, pos) {
      const word = model.getWordAtPosition(pos);
      if (!word) return;
      const entry = entries.find(
        ([name]) =>
          name === word.word || (word.word === "main" && name === "int main()"),
      );
      if (entry)
        return {
          range: new monaco.Range(
            pos.lineNumber,
            word.startColumn,
            pos.lineNumber,
            word.endColumn,
          ),
          contents: [{ value: "**" + entry[0] + "**" }, { value: entry[2] }],
        };
    },
  });
}
