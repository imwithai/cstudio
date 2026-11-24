import {
  BookOpen,
  ChevronRight,
  CodeXml,
  Cpu,
  Keyboard,
  Moon,
  PanelLeft,
  PanelsTopLeft,
  Play,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Square,
  Sun,
} from "lucide-react";
import { IconButton } from "./IconButton";
import type { Menu } from "../types";

export function Sidebar({
  open,
  focusEditor,
}: {
  open: (menu: Menu) => void;
  focusEditor: () => void;
}) {
  return (
    <aside>
      <div className="brand">
        <span className="brandicon">
          <CodeXml size={24} strokeWidth={2.5} />
        </span>
        <b>C++ Studio</b>
      </div>
      <nav aria-label="Studio">
        <div className="overline">WORKSPACE</div>
        <button
          className="navitem active"
          aria-label="Workspace"
          onClick={focusEditor}
        >
          <PanelsTopLeft />
          Workspace
        </button>
        <button className="navitem" onClick={() => open("Examples")}>
          <BookOpen />
          Examples
        </button>
        <div className="overline second">TOOLS</div>
        <button className="navitem" onClick={() => open("Shortcuts")}>
          <Keyboard />
          Shortcuts
        </button>
        <button className="navitem" onClick={() => open("Settings")}>
          <Settings2 />
          Settings
        </button>
      </nav>
      <button className="runtimecard" onClick={() => open("Runtime details")}>
        <span className="chipicon">
          <Cpu size={19} />
        </span>
        <span>
          <b>Local runtime</b>
          <small>WebAssembly</small>
        </span>
        <i className="dot" />
      </button>
    </aside>
  );
}

interface HeaderProps {
  light: boolean;
  toggleSidebar(): void;
  toggleTheme(): void;
  openSettings(): void;
}
export function Header({
  light,
  toggleSidebar,
  toggleTheme,
  openSettings,
}: HeaderProps) {
  return (
    <header>
      <div className="crumb">
        <IconButton name="Toggle sidebar" onClick={toggleSidebar}>
          <PanelLeft />
        </IconButton>
        <span className="divider" />
        <span>Studio</span>
        <ChevronRight size={13} />
        <strong>Workspace</strong>
      </div>
      <div className="right">
        <span className="local">
          <i className="dot" /> Browser local
        </span>
        <span className="divider" />
        <IconButton name="Switch theme" onClick={toggleTheme}>
          {light ? <Moon /> : <Sun />}
        </IconButton>
        <IconButton name="Editor settings" onClick={openSettings}>
          <SlidersHorizontal />
        </IconButton>
      </div>
    </header>
  );
}

interface ToolbarProps {
  ready: boolean;
  busy: boolean;
  run(): void;
  stop(): void;
  reset(): void;
}
export function Toolbar({ ready, busy, run, stop, reset }: ToolbarProps) {
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
  return (
    <div className="titlebar">
      <div>
        <div className="sectiontag">
          <i />
          C++ PLAYGROUND
        </div>
        <h1>Code workspace</h1>
      </div>
      <div className="actions">
        <button className="subbtn" disabled={!ready} onClick={reset}>
          <RotateCcw />
          Reset
        </button>
        <button className="subbtn" disabled={!busy} onClick={stop}>
          <Square />
          Stop
        </button>
        <button className="run" disabled={!ready || busy} onClick={run}>
          <Play fill="currentColor" />
          Run code <kbd>{shortcut} ↵</kbd>
        </button>
      </div>
    </div>
  );
}
