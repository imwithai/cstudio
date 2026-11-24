import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import CoreWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import "monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution";
import "monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching";
import "monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard";
import "monaco-editor/esm/vs/editor/contrib/comment/browser/comment";
import "monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu";
import "monaco-editor/esm/vs/editor/contrib/find/browser/findController";
import "monaco-editor/esm/vs/editor/contrib/gotoError/browser/gotoError";
import "monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution";
import "monaco-editor/esm/vs/editor/contrib/snippet/browser/snippetController2";
import "monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController";
import "monaco-editor/esm/vs/editor/contrib/folding/browser/folding";
import "monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles";
import "monaco-editor/esm/vs/editor/contrib/indentation/browser/indentation";
import "monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations";
import "monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations";
import "monaco-editor/esm/vs/editor/contrib/format/browser/formatActions";
import { registerFormatting } from "./formatting";
import { registerCppAssistance } from "./completions";

import type { Diagnostic } from "./types";
export type EditorHandle = {
  getValue(): string;
  setValue(text: string): void;
  jump(line: number, column?: number): void;
  focus(): void;
  setDiagnostics(items: Diagnostic[]): void;
};
export type EditorProps = {
  initialValue: string;
  theme: "dark" | "light";
  fontSize: number;
  minimap: boolean;
  wordWrap: boolean;
  onReady(api: EditorHandle): void;
  onRun(): void;
  onChange?(): void;
  onCursor?(line: number, column: number): void;
};

self.MonacoEnvironment = { getWorker: () => new CoreWorker() };
registerCppAssistance();
registerFormatting();
monaco.languages.setLanguageConfiguration("cpp", {
  indentationRules: {
    increaseIndentPattern: /[{(]\s*(?:\/\/.*)?$/,
    decreaseIndentPattern: /^\s*[})]/,
  },
});
monaco.editor.defineTheme("studio-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "DCDFED" },
    { token: "keyword", foreground: "C9A5FF" },
    { token: "keyword.int", foreground: "7CCAE5" },
    { token: "keyword.double", foreground: "7CCAE5" },
    { token: "keyword.directive", foreground: "DF9DCD" },
    { token: "string", foreground: "A4DCA6" },
    { token: "delimiter", foreground: "A5AFCA" },
    { token: "number", foreground: "F2B486" },
    { token: "comment", foreground: "8491AB", fontStyle: "italic" },
  ],
  colors: {
    "editor.background": "#111827",
    "editor.foreground": "#E5E7EB",
    "editorLineNumber.foreground": "#748097",
    "editorLineNumber.activeForeground": "#CFD8EA",
    "editor.lineHighlightBackground": "#182235",
    "editor.lineHighlightBorder": "#182235",
    "editorCursor.foreground": "#C7C9FF",
    "editor.selectionBackground": "#414A77",
    "editorIndentGuide.background1": "#293449",
    "editorWidget.background": "#161F32",
    "editorWidget.border": "#34415A",
  },
});
monaco.editor.defineTheme("studio-light", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "7C3DA9" },
    { token: "keyword.int", foreground: "095B7B" },
    { token: "string", foreground: "26704D" },
    { token: "number", foreground: "97550C" },
    { token: "comment", foreground: "64748B", fontStyle: "italic" },
  ],
  colors: {
    "editor.background": "#FAFBFE",
    "editor.lineHighlightBackground": "#EFF2FA",
    "editor.lineHighlightBorder": "#EFF2FA",
  },
});

export default function Editor(props: EditorProps) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!container.current) return;
    const initial = latest.current;
    const model = monaco.editor.createModel(
      initial.initialValue,
      "cpp",
      monaco.Uri.parse("inmemory://studio/main.cpp"),
    );
    model.updateOptions({
      tabSize: 4,
      insertSpaces: true,
      bracketColorizationOptions: {
        enabled: true,
        independentColorPoolPerBracketType: false,
      },
    });
    const editor = monaco.editor.create(container.current, {
      model,
      automaticLayout: true,
      ariaLabel: "main.cpp C++ source editor",
      theme: "studio-" + initial.theme,
      minimap: { enabled: initial.minimap },
      fontSize: initial.fontSize,
      wordWrap: initial.wordWrap ? "on" : "off",
      autoIndent: "full",
      autoClosingBrackets: "always",
      autoClosingQuotes: "always",
      bracketPairColorization: { enabled: true },
      quickSuggestions: true,
      tabCompletion: "on",
      snippetSuggestions: "top",
      renderLineHighlight: "line",
      renderLineHighlightOnlyWhenFocus: false,
      lineNumbersMinChars: 3,
      lineDecorationsWidth: 15,
      glyphMargin: false,
      folding: true,
      padding: { top: 18, bottom: 18 },
      lineHeight: Math.round(initial.fontSize * 1.65),
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      scrollBeyondLastLine: false,
      overviewRulerBorder: false,
      fixedOverflowWidgets: true,
      stickyScroll: { enabled: false },
      scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
    });
    instance.current = editor;
    const owner = "clang";
    let hasMarkers = false;
    const onContent = model.onDidChangeContent(() => {
      if (hasMarkers) {
        monaco.editor.setModelMarkers(model, owner, []);
        hasMarkers = false;
      }
      latest.current.onChange?.();
    });
    const onCursor = editor.onDidChangeCursorPosition(({ position }) =>
      latest.current.onCursor?.(position.lineNumber, position.column),
    );
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      latest.current.onRun(),
    );
    initial.onReady({
      getValue: () => model.getValue(),
      setValue: (value) => model.setValue(value),
      focus: () => editor.focus(),
      jump(line, column = 1) {
        const pos = model.validatePosition({ lineNumber: line, column });
        editor.setPosition(pos);
        editor.revealPositionInCenterIfOutsideViewport(pos);
        editor.focus();
      },
      setDiagnostics(items) {
        hasMarkers = items.length > 0;
        monaco.editor.setModelMarkers(
          model,
          owner,
          items.map((item) => {
            const point = model.validatePosition({
              lineNumber: item.line,
              column: item.column,
            });
            const word = model.getWordAtPosition(point);
            return {
              startLineNumber: point.lineNumber,
              startColumn: point.column,
              endLineNumber: point.lineNumber,
              endColumn: word?.endColumn ?? point.column + 1,
              message: item.message,
              source: "Clang",
              severity:
                item.severity === "note"
                  ? monaco.MarkerSeverity.Info
                  : item.severity === "warning"
                    ? monaco.MarkerSeverity.Warning
                    : monaco.MarkerSeverity.Error,
            };
          }),
        );
      },
    });
    return () => {
      instance.current = null;
      onContent.dispose();
      onCursor.dispose();
      editor.dispose();
      model.dispose();
    };
  }, []);
  useEffect(() => {
    monaco.editor.setTheme("studio-" + props.theme);
    instance.current?.updateOptions({
      minimap: { enabled: props.minimap },
      fontSize: props.fontSize,
      lineHeight: Math.round(props.fontSize * 1.65),
      wordWrap: props.wordWrap ? "on" : "off",
    });
  }, [props.theme, props.minimap, props.fontSize, props.wordWrap]);
  return (
    <div
      ref={container}
      className="monaco-host"
      style={{ width: "100%", height: "100%", minHeight: 0, minWidth: 0 }}
    />
  );
}
