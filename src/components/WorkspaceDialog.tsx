import { useEffect, useRef } from "react";
import { ChevronRight, FileCode2, X } from "lucide-react";
import { examples } from "../examples";
import type { EditorSettings, Example, Menu } from "../types";
import { IconButton } from "./IconButton";

interface Props {
  menu: Menu | null;
  ready: boolean;
  settings: EditorSettings;
  change: (update: Partial<EditorSettings>) => void;
  load: (example: Example) => void;
  close: () => void;
}

const toggles = [
  ["Light theme", "light"],
  ["Minimap", "minimap"],
  ["Word wrap", "wordWrap"],
] as const;

function Shortcuts() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const modifier = mac ? "⌘" : "Ctrl";
  const format = /Linux/.test(navigator.userAgent)
    ? "Ctrl + Shift + I"
    : mac
      ? "Shift + Option + F"
      : "Shift + Alt + F";
  return [
    ["Run code", modifier + " + Enter"],
    ["Find in editor", modifier + " + F"],
    ["Show suggestions", "Ctrl + Space"],
    ["Format document", format],
    ["Next snippet field", "Tab"],
  ].map(([name, key]) => (
    <div className="setting" key={name}>
      {name}
      <kbd>{key}</kbd>
    </div>
  ));
}

export function WorkspaceDialog({
  menu,
  ready,
  settings,
  change,
  load,
  close,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (menu) dialog.current?.showModal();
    else dialog.current?.close();
  }, [menu]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="dialog-title"
      onCancel={close}
      onClick={(event) => {
        if (event.target === dialog.current) close();
      }}
    >
      <div className="modal">
        <div className="modalhead">
          <h2 id="dialog-title">{menu}</h2>
          <IconButton name="Close" onClick={close}>
            <X />
          </IconButton>
        </div>
        {menu === "Examples" && (
          <>
            <p>Open an example to replace the current code and input.</p>
            {examples.map((example) => (
              <button
                key={example.name}
                className="choice"
                disabled={!ready}
                onClick={() => load(example)}
              >
                <FileCode2 />
                {example.name}
                <ChevronRight />
              </button>
            ))}
          </>
        )}
        {menu === "Shortcuts" && <Shortcuts />}
        {menu === "Settings" && (
          <>
            <label className="setting">
              Font size
              <select
                value={settings.fontSize}
                onChange={(e) => change({ fontSize: Number(e.target.value) })}
              >
                {[12, 14, 15, 16, 18, 20, 24].map((size) => (
                  <option key={size} value={size}>
                    {size} px
                  </option>
                ))}
              </select>
            </label>
            {toggles.map(([label, key]) => (
              <label className="setting" key={key}>
                {label}
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(event) => change({ [key]: event.target.checked })}
                />
              </label>
            ))}
          </>
        )}
        {menu === "Runtime details" && (
          <p>
            Clang compiles your source to WebAssembly in a browser worker. Input
            is read from the predefined stdin panel. Programs have five seconds
            to run. Stop terminates the worker immediately.
          </p>
        )}
      </div>
    </dialog>
  );
}
