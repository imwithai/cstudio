import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import {
  BookOpen,
  Braces,
  ChevronDown,
  ChevronsLeftRight,
  Cpu,
  GripHorizontal,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { EditorHandle } from "./Editor";
import { InputPanel, OutputPanel } from "./components/ConsolePanels";
import type { InputHandle } from "./components/ConsolePanels";
import { Header, Sidebar, Toolbar } from "./components/Toolbar";
import { IconButton } from "./components/IconButton";
import { WorkspaceDialog } from "./components/WorkspaceDialog";
import { examples } from "./examples";
import { useRunner } from "./useRunner";
import type { EditorSettings, Example, Menu } from "./types";

const Editor = lazy(() => import("./Editor"));

export default function App() {
  const editor = useRef<EditorHandle>(),
    input = useRef<InputHandle>(null),
    position = useRef<HTMLSpanElement>(null),
    panel = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false),
    [menu, setMenu] = useState<Menu | null>(null),
    [collapsed, setCollapsed] = useState(false),
    [expanded, setExpanded] = useState(false),
    [height, setHeight] = useState<number>();
  const [settings, setSettings] = useState<EditorSettings>({
    light: false,
    fontSize: 15,
    minimap: false,
    wordWrap: false,
  });
  const runner = useRunner();
  const updateSettings = (update: Partial<EditorSettings>) =>
    setSettings((previous) => ({ ...previous, ...update }));
  function run() {
    if (editor.current)
      runner.run(editor.current.getValue(), input.current?.getValue() ?? "");
  }
  useEffect(() => {
    editor.current?.setDiagnostics(runner.diagnostics);
  }, [runner.diagnostics]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter" &&
        !event.defaultPrevented &&
        !menu
      ) {
        event.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  function load(example: Example) {
    runner.stop();
    runner.clear();
    editor.current?.setValue(example.code);
    input.current?.setValue(example.input);
    setMenu(null);
  }
  function resize(amount: number) {
    setHeight(Math.max(220, Math.min(window.innerHeight * 0.72, amount)));
  }
  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!panel.current) return;
    const node = event.currentTarget;
    node.setPointerCapture(event.pointerId);
    const start = event.clientY,
      initial = panel.current.getBoundingClientRect().height;
    node.onpointermove = (move) => resize(initial + move.clientY - start);
    node.onlostpointercapture = () => {
      node.onpointermove = null;
      node.onlostpointercapture = null;
    };
  }
  const stateColor =
    runner.status === "Error" ? "red" : runner.busy ? "amber" : "mint";
  return (
    <div
      className={
        "app " +
        (settings.light ? "light " : "") +
        (collapsed ? "collapsed" : "")
      }
    >
      <Sidebar
        open={setMenu}
        focusEditor={() => {
          setMenu(null);
          editor.current?.focus();
        }}
      />
      <main>
        <Header
          light={settings.light}
          toggleSidebar={() => setCollapsed(!collapsed)}
          toggleTheme={() => updateSettings({ light: !settings.light })}
          openSettings={() => setMenu("Settings")}
        />
        <div className="work">
          <Toolbar
            ready={ready}
            busy={runner.busy}
            run={run}
            stop={runner.stop}
            reset={() => load(examples[0])}
          />
          <section
            ref={panel}
            className={"editorpanel panel " + (expanded ? "expanded" : "")}
            style={height && !expanded ? { height } : undefined}
          >
            <div className="editorhead">
              <div className="filetab">
                <span className="cpphex">C⁺⁺</span>main.cpp
              </div>
              <div className="right">
                <span className="stdtag">C++20</span>
                <button
                  className="examplebtn"
                  onClick={() => setMenu("Examples")}
                >
                  <BookOpen size={15} />
                  Examples
                  <ChevronDown size={13} />
                </button>
                <span className="divider" />
                <IconButton
                  name={expanded ? "Restore editor" : "Expand editor"}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <Minimize2 /> : <Maximize2 />}
                </IconButton>
              </div>
            </div>
            <div className="editorbody">
              <Suspense fallback={<p className="pad">Loading editor…</p>}>
                <Editor
                  initialValue={examples[0].code}
                  theme={settings.light ? "light" : "dark"}
                  fontSize={settings.fontSize}
                  minimap={settings.minimap}
                  wordWrap={settings.wordWrap}
                  onReady={(api) => {
                    editor.current = api;
                    setReady(true);
                  }}
                  onRun={run}
                  onCursor={(line, column) => {
                    if (position.current)
                      position.current.textContent =
                        "Ln " + line + ", Col " + column;
                  }}
                />
              </Suspense>
            </div>
            <div className="editorfoot">
              <span>
                <Braces size={13} /> C++
              </span>
              <span>
                <span ref={position}>Ln 1, Col 1</span> <b>·</b> Spaces: 4{" "}
                <b>·</b> UTF-8
              </span>
            </div>
          </section>
          <div
            className="splitter"
            role="separator"
            aria-label="Resize editor"
            aria-orientation="horizontal"
            tabIndex={0}
            onPointerDown={drag}
            onKeyDown={(event) => {
              if (
                panel.current &&
                ["ArrowDown", "ArrowUp"].includes(event.key)
              ) {
                event.preventDefault();
                resize(
                  panel.current.clientHeight +
                    (event.key === "ArrowDown" ? 16 : -16),
                );
              }
            }}
          >
            <GripHorizontal size={16} />
          </div>
          <div className="io">
            <InputPanel ref={input} initial={examples[0].input} />
            <OutputPanel
              output={runner.output}
              detail={runner.detail}
              status={runner.status}
              busy={runner.busy}
              diagnostics={runner.diagnostics}
              metrics={runner.metrics}
              color={stateColor}
              clear={runner.clear}
              jump={(line, column) => editor.current?.jump(line, column)}
            />
          </div>
        </div>
        <footer>
          <span>
            <i className={"dot " + stateColor} />
            {runner.status}
          </span>
          <span>
            <Cpu size={13} />
            WASM runtime <b>·</b> <ChevronsLeftRight size={13} /> Clang / LLVM
          </span>
        </footer>
      </main>
      <WorkspaceDialog
        menu={menu}
        settings={settings}
        ready={ready}
        change={updateSettings}
        load={load}
        close={() => setMenu(null)}
      />
    </div>
  );
}
