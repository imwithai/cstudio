import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { createCompiler } from "@live-codes/clang-wasm";
import { Play, Terminal, Code2, Zap, Settings2, CheckCircle2, AlertCircle, LoaderCircle, RotateCcw, Copy, Check, Github, Keyboard, ChevronDown } from "lucide-react";

const initialCode = `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cout << "What is your name? ";
    getline(cin, name);
    cout << "Hello, " << name << "! Welcome to C++ Studio." << endl;
    return 0;
}`;

const samples = {
  hello: { label: "Hello World", code: initialCode, input: "Developer" },
  math: { label: "Simple Calculator", code: `#include <iostream>
using namespace std;

int main() {
    double a, b;
    cin >> a >> b;
    cout << "Sum: " << a + b << '\\n';
    cout << "Product: " << a * b << '\\n';
    return 0;
}`, input: "12 8" },
  loops: { label: "Loops & Arrays", code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    long long sum = 0;
    for (int i = 1; i <= n; i++) sum += i;
    cout << "Sum 1.." << n << " = " << sum << '\\n';
    return 0;
}`, input: "10" }
};

type Compiler = Awaited<ReturnType<typeof createCompiler>>;

export default function App() {
  const [code, setCode] = useState(initialCode);
  const [input, setInput] = useState("Developer");
  const [output, setOutput] = useState("Ready to compile. Press Run Code to get started.");
  const [status, setStatus] = useState<"ready"|"loading"|"running"|"success"|"error">("ready");
  const [progress, setProgress] = useState(0);
  const [standard, setStandard] = useState("gnu++17");
  const [sample, setSample] = useState("hello");
  const [tab, setTab] = useState<"output"|"input">("output");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState<string|null>(null);
  const compilerRef = useRef<Compiler|null>(null);
  const compilerStd = useRef<string|null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function run() {
    if (status === "loading" || status === "running") return;
    setTab("output");
    setStatus("loading");
    setProgress(0);
    setOutput("Loading WebAssembly C++ toolchain. The first launch downloads ~29 MB...");
    setElapsed(null);
    try {
      if (!compilerRef.current || compilerStd.current !== standard) {
        if (compilerRef.current) compilerRef.current.dispose();
        compilerRef.current = null;
        const baseUrl = new URL(import.meta.env.BASE_URL + "clang/", window.location.origin);
        const compiler = await createCompiler("cpp", { baseUrl, std: standard, onProgress: value => { if (mounted.current) setProgress(Math.round(value * 100)); } });
        compilerRef.current = compiler;
        compilerStd.current = standard;
      }
      if (!mounted.current) return;
      setStatus("running");
      setOutput("Compiling and executing your program...");
      const result = await compilerRef.current!.run(code, input);
      if (!mounted.current) return;
      const errorText = result.errors.join("\n");
      setOutput([result.output, errorText].filter(Boolean).join("\n") || (result.exitCode === 0 ? "Program finished without output." : "No output returned."));
      setElapsed(((result.compileMs + (result.runMs || 0)) / 1000).toFixed(2));
      setStatus(result.exitCode === 0 ? "success" : "error");
    } catch (error) {
      if (!mounted.current) return;
      setOutput("Unable to run C++ code. " + (error instanceof Error ? error.message : String(error)) + "\n\nCheck your connection and try again.");
      setStatus("error");
    }
  }

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void run(); }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  function changeSample(key: string) {
    const item = samples[key as keyof typeof samples];
    if (!item) return;
    setSample(key);
    setCode(item.code);
    setInput(item.input);
    setStatus("ready");
    setOutput("Example loaded. Press Run Code to get started.");
    setElapsed(null);
  }
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  const busy = status === "loading" || status === "running";

  return <div className="app">
    <header className="topbar">
      <div className="identity"><div className="logo"><Code2 size={22} strokeWidth={2.7}/></div><span className="brand">C++ <strong>Studio</strong></span><span className="brand-divider"/><span className="workspace-name">Playground</span></div>
      <div className="header-right"><span className="online-indicator"><i/> Browser-based IDE</span><a href="https://github.com/imwithai/cstudio" target="_blank" rel="noopener noreferrer" title="View on GitHub" className="github-link"><Github size={19}/></a></div>
    </header>
    <main className="main">
      <div className="intro"><div className="intro-text"><div className="eyebrow"><Zap size={13}/> YOUR CODING WORKSPACE</div><h1>Build something <span>brilliant.</span></h1><p>A beautiful, distraction-free place to write, compile and run C++ — right in your browser.</p></div><span className="pill"><span className="dot"/> Clang WebAssembly</span></div>
      <div className="toolbar">
        <div className="toolbar-left"><label className="select-label"><span>EXAMPLE</span><span className="select-shell"><select value={sample} onChange={e => changeSample(e.target.value)}>{Object.entries(samples).map(([key,value]) => <option key={key} value={key}>{value.label}</option>)}</select><ChevronDown size={15}/></span></label><label className="select-label"><span>STANDARD</span><span className="select-shell"><select value={standard} onChange={e => setStandard(e.target.value)}>{["gnu++11","gnu++14","gnu++17","gnu++20","gnu++23"].map(s => <option key={s} value={s}>{s.replace("gnu","C")}</option>)}</select><ChevronDown size={15}/></span></label></div>
        <button className="run-button" onClick={() => void run()} disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <Play size={17} fill="currentColor"/>}{status === "loading" ? `Loading ${progress}%` : status === "running" ? "Running..." : "Run Code"}<span className="shortcut">⌘ ↵</span></button>
      </div>
      <div className="workspace">
        <section className="panel editor-panel"><div className="panel-header"><div className="panel-heading"><Code2 size={16}/><span>main.cpp</span><span className="lang-badge">C++</span></div><div className="panel-actions"><button onClick={() => void copy()} aria-label="Copy code" title="Copy code">{copied ? <Check size={16}/> : <Copy size={16}/>}</button><button onClick={() => { setCode(initialCode); setSample("hello"); }} aria-label="Reset code" title="Reset code"><RotateCcw size={16}/></button></div></div>
          <div className="editor"><Editor height="100%" language="cpp" theme="vs-dark" value={code} onChange={value => setCode(value ?? "")} options={{fontSize:14,fontFamily:"'SFMono-Regular', Consolas, 'Liberation Mono', monospace",fontLigatures:true,minimap:{enabled:false},scrollBeyondLastLine:false,smoothScrolling:true,automaticLayout:true,renderLineHighlight:"line",padding:{top:20,bottom:20},lineNumbersMinChars:3,bracketPairColorization:{enabled:true},tabSize:4,wordWrap:"on"}}/></div><div className="editor-footer"><span>UTF-8</span><span>Spaces: 4</span><span>C++</span></div></section>
        <section className="panel console-panel"><div className="console-tabs"><button className={tab==="output"?"active":""} onClick={() => setTab("output")}><Terminal size={16}/> Output</button><button className={tab==="input"?"active":""} onClick={() => setTab("input")}><Keyboard size={16}/> Input (stdin)</button></div>
          {tab === "output" ? <div className="console-body"><div className="output-meta">{status === "success" ? <span className="success-text"><CheckCircle2 size={14}/> Execution successful</span> : status === "error" ? <span className="error-text"><AlertCircle size={14}/> Compilation / runtime error</span> : busy ? <span><LoaderCircle className="spin" size={14}/> {status === "loading" ? "Preparing compiler" : "Executing"}</span> : <span><span className="muted-dot"/> Console output</span>}{elapsed && <span className="elapsed">{elapsed}s</span>}</div><pre className="terminal-output">{output}</pre>{status === "loading" && <div className="progress-track"><div style={{width:progress+"%"}}/></div>}</div> : <div className="stdin"><label htmlFor="stdin">Standard input</label><p>Provide input for <code>cin</code> or <code>getline</code>. Use a new line to separate values.</p><textarea id="stdin" value={input} onChange={e => setInput(e.target.value)} spellCheck={false} placeholder="Type program input here..."/></div>}
          <div className="console-footer"><span><Settings2 size={13}/> Sandboxed execution</span><span>No server required</span></div></section>
      </div>
      <footer className="page-footer"><div><Zap size={14}/> Powered by WebAssembly. Runs entirely in your browser.</div><div>Made for curious minds. <span>100% free.</span></div></footer>
    </main>
  </div>;
}
