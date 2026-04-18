import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookOpen, Zap, Calendar, RotateCcw, Trophy,
  ChevronLeft, ChevronRight, Check, Circle, Loader2,
  Brain, Cpu, Activity, Layers, Sparkles
} from "lucide-react";

// ─── Curriculum Data ──────────────────────────────────────────────────────────

const DAYS = [
  { lesson: "What Python is. What a program is. Input, output, instruction.", tiny: "Make the computer say, \"Today I begin.\"", start: "Install Python and run your first print statement.", midday: "Am I still learning one idea, or am I already trying to learn the whole field?", evening: "What is a program in my own words?", carry: "Tomorrow I will practice variables." },
  { lesson: "Variables", tiny: "Create a short script with your name, age, and favorite number.", start: "Make three variables and print them.", midday: "Did I confuse the label with the value?", evening: "A variable is...", carry: "Tomorrow I will separate text from numbers." },
  { lesson: "Strings, numbers, and basic math", tiny: "Tiny calculator", start: "Add and print two numbers.", midday: "Do I know which values are text and which are numbers?", evening: "The difference between a string and a number is...", carry: "Tomorrow I will ask the user for input." },
  { lesson: "Input", tiny: "Interactive check-in script", start: "Use input() to ask one simple question.", midday: "Did I make it interactive, or am I just reading about it?", evening: "Input changes a program by...", carry: "Tomorrow I will use conditions." },
  { lesson: "If statements", tiny: "Mood-based response script", start: "Write one if statement.", midday: "Do I understand the condition being tested?", evening: "A condition is...", carry: "Tomorrow I will learn loops." },
  { lesson: "Loops", tiny: "Countdown script", start: "Print numbers 1 through 10 with a loop.", midday: "Am I clear on what is repeating?", evening: "A loop helps when...", carry: "Tomorrow I will review what I know." },
  { lesson: "Review and rebuild", tiny: "Combine greeting, input, and mood response into one script", start: "Rebuild without looking too much.", midday: "What do I actually remember?", evening: "This week got easier when...", carry: "Tomorrow I will learn functions." },
  { lesson: "Functions", tiny: "Wrap your check-in flow into functions", start: "Write one simple function.", midday: "Did I break the code into smaller actions?", evening: "A function is useful because...", carry: "Tomorrow I will store multiple items in a list." },
  { lesson: "Lists", tiny: "Print a list of projects or tasks", start: "Create a list with three items.", midday: "Am I storing one thing or several things?", evening: "A list helps me hold...", carry: "Tomorrow I will learn dictionaries." },
  { lesson: "Dictionaries", tiny: "Build one project card in code", start: "Make a dictionary with name, status, and next step.", midday: "Do I understand key and value?", evening: "A dictionary works best when...", carry: "Tomorrow I will combine lists and dictionaries." },
  { lesson: "Lists plus dictionaries", tiny: "Tiny project dashboard in the terminal", start: "Put two project dictionaries into a list.", midday: "Does this now feel more like app data?", evening: "I can now model...", carry: "Tomorrow I will save data to a file." },
  { lesson: "Files", tiny: "Save a daily note to a text file", start: "Write one line to a file and read it back.", midday: "Am I actually saving data, not just thinking about it?", evening: "Saving matters because...", carry: "Tomorrow I will think in app flows." },
  { lesson: "Data in, logic in the middle, output at the end", tiny: "Daily planner script that saves answers", start: "Draw input → process → output.", midday: "Where is the logic happening?", evening: "A simple app works by...", carry: "Tomorrow I will rebuild a clean mini planner." },
  { lesson: "Review and simplify", tiny: "Morning Console version 1", start: "Rebuild the planner cleanly.", midday: "What has become natural?", evening: "I now understand...", carry: "Tomorrow I move into electronics." },
  { lesson: "Voltage, current, circuit, ground", tiny: "Draw a basic LED circuit by hand", start: "Learn what makes a circuit complete.", midday: "Am I learning practical meaning or drowning in theory?", evening: "A circuit is complete when...", carry: "Tomorrow I will meet the microcontroller." },
  { lesson: "What a microcontroller is", tiny: "Set up Arduino IDE or ESP32 environment", start: "Plug in the board and get it recognized.", midday: "Do I understand how this differs from my laptop?", evening: "A microcontroller is...", carry: "Tomorrow I will blink an LED." },
  { lesson: "Digital output", tiny: "Blink an LED", start: "Run the Blink example.", midday: "Did I physically make output happen?", evening: "Output in hardware means...", carry: "Tomorrow I will read the code more clearly." },
  { lesson: "setup() and loop()", tiny: "Change blink speed and annotate the code", start: "Explain setup and loop in plain English.", midday: "What happens once? What repeats?", evening: "setup() does... loop() does...", carry: "Tomorrow I will use a button." },
  { lesson: "Digital input", tiny: "Button turns LED on", start: "Wire one simple button input.", midday: "What changed when I added input?", evening: "Input in hardware means...", carry: "Tomorrow I will combine input and logic." },
  { lesson: "Simple hardware logic", tiny: "Button toggles between slow and fast blink", start: "Make the button change behavior.", midday: "Where is the decision happening now?", evening: "This system decides by...", carry: "Tomorrow I will review physical computing." },
  { lesson: "Review physical computing", tiny: "Mood light prototype with button modes", start: "Rebuild blink + button + changed behavior.", midday: "What part do I still need to touch again?", evening: "The magical part was...", carry: "Tomorrow I will meet sensors." },
  { lesson: "Sensors and analog vs digital input", tiny: "Wire a simple sensor if available", start: "Learn what a sensor detects.", midday: "Am I clear on what the sensor is measuring?", evening: "A sensor turns ______ into data.", carry: "Tomorrow I will read sensor values." },
  { lesson: "Reading sensor values", tiny: "Print sensor readings to serial monitor", start: "Watch the data change.", midday: "Can I connect the number to the physical change?", evening: "This became data when...", carry: "Tomorrow I will use threshold logic." },
  { lesson: "Threshold logic", tiny: "Turn LED on when sensor crosses a threshold", start: "Write one if rule using sensor data.", midday: "Do I understand what triggers action?", evening: "Sensing became decision when...", carry: "Tomorrow I will log what I observe." },
  { lesson: "Logging and observation", tiny: "Record sensor values over time", start: "Create a tiny table of values and conditions.", midday: "What pattern am I seeing?", evening: "Logging matters because...", carry: "Tomorrow I will learn training vs inference." },
  { lesson: "Training vs inference", tiny: "Explain the difference in plain language", start: "Write one sentence for each.", midday: "Am I mixing the model-building step with the model-using step?", evening: "Training is... inference is...", carry: "Tomorrow I will study edge AI intuition." },
  { lesson: "Edge AI and TinyML intuition", tiny: "Watch one simple TinyML demo and map the flow", start: "Write input → model → output.", midday: "Where is the AI actually living?", evening: "Edge AI matters because...", carry: "Tomorrow I will simulate a smart device." },
  { lesson: "Simulating a tiny intelligent device", tiny: "Smart lamp logic using a sensor and LED", start: "Build a rule-based smart device.", midday: "What would make this smarter than a fixed rule?", evening: "This system senses, decides, and acts by...", carry: "Tomorrow I will build one full mini system." },
  { lesson: "Build one mini system", tiny: "Choose one: mood light, light-activated lamp, temperature warning, motion notifier", start: "Pick one project and keep it small.", midday: "Am I finishing a simple system, or expanding it too soon?", evening: "I built...", carry: "Tomorrow I will reflect and choose my next lane." },
  { lesson: "Reflection and direction", tiny: "Make a one-page map of what you learned", start: "Summarize the month in your own words.", midday: "Which lane truly pulls me back?", evening: "My next lane is...", carry: "Choose one next path: deeper Python, more electronics, robotics, TinyML, later FPGA, later quantum." },
];

const WEEK_COMPASS = [
  { week: 1, primary: "Learn the language of logic", secondary: "Build confidence with small Python scripts", maintenance: "Install tools and keep notes organized", days: "1–7" },
  { week: 2, primary: "Understand how data is stored and moved", secondary: "Build one complete mini script", maintenance: "Review and organize your notes from week 1", days: "8–14" },
  { week: 3, primary: "Move from code to physical output", secondary: "Understand the microcontroller environment", maintenance: "Keep your Python notes accessible", days: "15–21" },
  { week: 4, primary: "Sense, decide, act", secondary: "Understand the edge AI pipeline", maintenance: "Reflect on what has clicked and what is still fuzzy", days: "22–30" },
];

const SUCCESS_MARKERS = [
  "I can write beginner Python without freezing",
  "I understand variables, conditions, loops, functions, lists, dictionaries, and files",
  "I know what a microcontroller is",
  "I have made an LED blink",
  "I have used a button as input",
  "I have read at least one sensor",
  "I understand sense → decide → act",
  "I understand the basic difference between training and inference",
  "I know which lane I want next",
];

const PHASE_ICON = (dayNum: number) => {
  if (dayNum <= 14) return <Brain className="w-3 h-3" />;
  if (dayNum <= 21) return <Cpu className="w-3 h-3" />;
  if (dayNum <= 25) return <Activity className="w-3 h-3" />;
  return <Layers className="w-3 h-3" />;
};

const PHASE_LABEL = (dayNum: number) => {
  if (dayNum <= 7) return "Python Foundations";
  if (dayNum <= 14) return "Python Intermediate";
  if (dayNum <= 21) return "Electronics & Microcontrollers";
  if (dayNum <= 25) return "Sensors & Data";
  return "Edge AI";
};

// ─── Field Component ──────────────────────────────────────────────────────────

function Field({
  label, prompt, value, onChange, rows = 3
}: {
  label: string; prompt: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-muted-foreground italic mt-0.5">{prompt}</p>
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="text-sm resize-none bg-background/50 border-border/50 focus:border-primary/50"
        placeholder="Write here..."
      />
    </div>
  );
}

// ─── Daily Tab ────────────────────────────────────────────────────────────────

function DailyTab({ logs }: { logs: any[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [activeDay, setActiveDay] = useState(() => {
    const completedDays = logs.filter(l => l.completedAt).map(l => l.dayNum);
    const next = completedDays.length > 0 ? Math.min(completedDays.length + 1, 30) : 1;
    return next;
  });

  const logMap = Object.fromEntries(logs.map(l => [l.dayNum, l]));
  const existing = logMap[activeDay] || {};
  const curriculum = DAYS[activeDay - 1];

  const [form, setForm] = useState({
    capacity: existing.capacity || "",
    firstMove: existing.firstMove || "",
    whatLearned: existing.whatLearned || "",
    whatBuilt: existing.whatBuilt || "",
    stayedOnLesson: existing.stayedOnLesson || "",
    driftedWhere: existing.driftedWhere || "",
    returnStep: existing.returnStep || "",
    whatMoved: existing.whatMoved || "",
    stillFuzzy: existing.stillFuzzy || "",
    summary: existing.summary || "",
    carryForward: existing.carryForward || "",
  });

  // Reset form when switching days
  useEffect(() => {
    const e = logMap[activeDay] || {};
    setForm({
      capacity: e.capacity || "",
      firstMove: e.firstMove || "",
      whatLearned: e.whatLearned || "",
      whatBuilt: e.whatBuilt || "",
      stayedOnLesson: e.stayedOnLesson || "",
      driftedWhere: e.driftedWhere || "",
      returnStep: e.returnStep || "",
      whatMoved: e.whatMoved || "",
      stillFuzzy: e.stillFuzzy || "",
      summary: e.summary || "",
      carryForward: e.carryForward || "",
    });
  }, [activeDay, logs.length]);

  const utils = trpc.useUtils();
  const save = trpc.study.saveDayLog.useMutation({
    onSuccess: () => {
      utils.study.getDayLogs.invalidate();
      toast.success(`Day ${activeDay} saved.`);
    },
  });
  const markComplete = trpc.study.saveDayLog.useMutation({
    onSuccess: () => {
      utils.study.getDayLogs.invalidate();
      toast.success(`Day ${activeDay} complete. Keep going.`);
    },
  });

  const f = (key: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [key]: v }));
  const isComplete = !!existing.completedAt;
  const completedCount = logs.filter(l => l.completedAt).length;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completedCount} of 30 days complete</span>
          <span>{Math.round((completedCount / 30) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(completedCount / 30) * 100}%` }}
          />
        </div>
        {/* Day grid */}
        <div className="grid grid-cols-10 gap-1 pt-1">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(d => {
            const log = logMap[d];
            const done = !!log?.completedAt;
            const started = !!log && !done;
            return (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`h-7 rounded text-xs font-medium transition-all ${
                  d === activeDay
                    ? "ring-2 ring-primary bg-primary text-primary-foreground"
                    : done
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    : started
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs gap-1">
              {PHASE_ICON(activeDay)}
              {PHASE_LABEL(activeDay)}
            </Badge>
            {isComplete && (
              <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <Check className="w-3 h-3 mr-1" /> Complete
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-semibold">Day {activeDay}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{curriculum.lesson}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setActiveDay(Math.max(1, activeDay - 1))} disabled={activeDay === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setActiveDay(Math.min(30, activeDay + 1))} disabled={activeDay === 30}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Curriculum card */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tiny Project</p>
            <p className="text-foreground/90">{curriculum.tiny}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Start Here</p>
            <p className="text-foreground/90">{curriculum.start}</p>
          </div>
        </div>
      </div>

      {/* Capacity */}
      <div>
        <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-2">Capacity Today</p>
        <div className="flex gap-2">
          {["full", "partial", "low"].map(c => (
            <button
              key={c}
              onClick={() => setForm(p => ({ ...p, capacity: c }))}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all capitalize ${
                form.capacity === c
                  ? c === "full" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : c === "partial" ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                    : "bg-red-500/20 border-red-500/50 text-red-400"
                  : "bg-muted border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Start Here */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Zap className="w-4 h-4" /> Start Here
        </div>
        <Field label="First Move" prompt={curriculum.start} value={form.firstMove} onChange={f("firstMove")} rows={2} />
      </div>

      {/* Study Block */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
          <BookOpen className="w-4 h-4" /> Study Block
        </div>
        <Field label="What I Learned" prompt="In your own words..." value={form.whatLearned} onChange={f("whatLearned")} />
        <Field label="What I Built or Practiced" prompt={curriculum.tiny} value={form.whatBuilt} onChange={f("whatBuilt")} />
      </div>

      {/* Midday Realignment */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
          <RotateCcw className="w-4 h-4" /> Midday Realignment
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">Stayed on Lesson?</p>
          <p className="text-xs text-muted-foreground italic mb-2">{curriculum.midday}</p>
          <div className="flex gap-2">
            {["yes", "somewhat", "no"].map(v => (
              <button
                key={v}
                onClick={() => setForm(p => ({ ...p, stayedOnLesson: v }))}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all capitalize ${
                  form.stayedOnLesson === v
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-muted border-border/50 text-muted-foreground hover:border-border"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {form.stayedOnLesson !== "yes" && (
          <>
            <Field label="If I Drifted, Where?" prompt="Where did attention go?" value={form.driftedWhere} onChange={f("driftedWhere")} rows={2} />
            <Field label="Return Step" prompt="What brought me back?" value={form.returnStep} onChange={f("returnStep")} rows={2} />
          </>
        )}
      </div>

      {/* Evening Closure */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
          <Calendar className="w-4 h-4" /> Evening Closure
        </div>
        <Field label="What Moved Today?" prompt="What shifted or clicked?" value={form.whatMoved} onChange={f("whatMoved")} />
        <Field label="What Still Feels Fuzzy?" prompt="No judgment — just name it." value={form.stillFuzzy} onChange={f("stillFuzzy")} rows={2} />
        <Field label="One Sentence Summary" prompt={curriculum.evening} value={form.summary} onChange={f("summary")} rows={2} />
      </div>

      {/* Carry Forward */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
          <ChevronRight className="w-4 h-4" /> Carry Forward
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/80 italic">
          {curriculum.carry}
        </div>
        <Field label="Your Carry Forward Note" prompt="What do you want to remember for tomorrow?" value={form.carryForward} onChange={f("carryForward")} rows={2} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => save.mutate({ dayNum: activeDay, logDate: today, ...form })}
          disabled={save.isPending}
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Draft
        </Button>
        <Button
          onClick={() => markComplete.mutate({ dayNum: activeDay, logDate: today, ...form, completedAt: new Date() })}
          disabled={markComplete.isPending || isComplete}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {markComplete.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          {isComplete ? "Day Complete" : "Mark Day Complete"}
        </Button>
      </div>
    </div>
  );
}

// ─── Weekly Compass Tab ───────────────────────────────────────────────────────

function WeeklyCompassTab() {
  const [activeWeek, setActiveWeek] = useState(1);
  const w = WEEK_COMPASS[activeWeek - 1];
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(wk => (
          <button
            key={wk}
            onClick={() => setActiveWeek(wk)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
              activeWeek === wk
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-muted border-border/50 text-muted-foreground hover:border-border"
            }`}
          >
            Week {wk}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-border/50 bg-muted/30 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Week {w.week} Compass</h3>
          <Badge variant="outline" className="text-xs">Days {w.days}</Badge>
        </div>
        <div className="grid gap-3">
          <div className="rounded-md bg-primary/10 border border-primary/20 p-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Primary Focus</p>
            <p className="text-sm">{w.primary}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Secondary Focus</p>
            <p className="text-sm">{w.secondary}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Maintenance Lane</p>
            <p className="text-sm">{w.maintenance}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Focus Log Tab ────────────────────────────────────────────────────────────

function FocusLogTab({ blocks }: { blocks: any[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    logDate: today, startTime: "", duration: "", capacity: "",
    lesson: "", tinyProject: "", intention: "", actualWork: "",
    drifted: "", driftedWhere: "", returnPoint: "", whatMoved: "", nextStep: "",
  });
  const utils = trpc.useUtils();
  const add = trpc.study.addFocusBlock.useMutation({
    onSuccess: () => { utils.study.getFocusBlocks.invalidate(); toast.success("Focus block logged."); setForm(p => ({ ...p, lesson: "", tinyProject: "", intention: "", actualWork: "", drifted: "", driftedWhere: "", returnPoint: "", whatMoved: "", nextStep: "" })); },
  });
  const del = trpc.study.deleteFocusBlock.useMutation({
    onSuccess: () => { utils.study.getFocusBlocks.invalidate(); toast.success("Block removed."); },
  });
  const f = (key: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [key]: v }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/50 p-5 space-y-4">
        <h3 className="font-semibold text-sm">New Focus Block</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date</p>
            <input type="date" value={form.logDate} onChange={e => setForm(p => ({ ...p, logDate: e.target.value }))}
              className="w-full h-9 rounded-md border border-border/50 bg-background/50 px-3 text-sm" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Start Time</p>
            <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
              className="w-full h-9 rounded-md border border-border/50 bg-background/50 px-3 text-sm" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
            <input type="text" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 45 min"
              className="w-full h-9 rounded-md border border-border/50 bg-background/50 px-3 text-sm" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capacity</p>
          <div className="flex gap-2">
            {["full", "partial", "low"].map(c => (
              <button key={c} onClick={() => setForm(p => ({ ...p, capacity: c }))}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all capitalize ${form.capacity === c ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-border/50 text-muted-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <Field label="Today's Lesson" prompt="" value={form.lesson} onChange={f("lesson")} rows={1} />
        <Field label="Today's Tiny Project" prompt="" value={form.tinyProject} onChange={f("tinyProject")} rows={1} />
        <Field label="Intention Before Starting" prompt="" value={form.intention} onChange={f("intention")} rows={2} />
        <Field label="What I Actually Worked On" prompt="" value={form.actualWork} onChange={f("actualWork")} />
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Did I Drift?</p>
          <div className="flex gap-2">
            {["yes", "no", "a_little"].map(v => (
              <button key={v} onClick={() => setForm(p => ({ ...p, drifted: v }))}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${form.drifted === v ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-border/50 text-muted-foreground"}`}>
                {v === "a_little" ? "A little" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {form.drifted !== "no" && (
          <>
            <Field label="If I Drifted, Where?" prompt="" value={form.driftedWhere} onChange={f("driftedWhere")} rows={2} />
            <Field label="Return Point" prompt="" value={form.returnPoint} onChange={f("returnPoint")} rows={2} />
          </>
        )}
        <Field label="What Moved in This Block" prompt="" value={form.whatMoved} onChange={f("whatMoved")} />
        <Field label="Next Step" prompt="" value={form.nextStep} onChange={f("nextStep")} rows={2} />
        <Button onClick={() => add.mutate(form)} disabled={add.isPending || !form.logDate}>
          {add.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Log Focus Block
        </Button>
      </div>

      {/* Past blocks */}
      {blocks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">Past Blocks</h3>
          {[...blocks].reverse().map(b => (
            <div key={b.id} className="rounded-lg border border-border/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{b.logDate}</span>
                  {b.startTime && <span className="text-muted-foreground">{b.startTime}</span>}
                  {b.duration && <Badge variant="outline" className="text-xs">{b.duration}</Badge>}
                  {b.capacity && <Badge variant="outline" className="text-xs capitalize">{b.capacity}</Badge>}
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-7 text-xs"
                  onClick={() => del.mutate({ id: b.id })}>Remove</Button>
              </div>
              {b.lesson && <p className="text-sm"><span className="text-muted-foreground">Lesson:</span> {b.lesson}</p>}
              {b.whatMoved && <p className="text-sm"><span className="text-muted-foreground">Moved:</span> {b.whatMoved}</p>}
              {b.nextStep && <p className="text-sm"><span className="text-muted-foreground">Next:</span> {b.nextStep}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Weekly Review Tab ────────────────────────────────────────────────────────

function WeeklyReviewTab({ reviews }: { reviews: any[] }) {
  const [activeWeek, setActiveWeek] = useState(1);
  const reviewMap = Object.fromEntries(reviews.map(r => [r.weekNum, r]));
  const existing = reviewMap[activeWeek] || {};

  const [form, setForm] = useState({
    meaningfulMovement: existing.meaningfulMovement || "",
    lessonsCompleted: existing.lessonsCompleted || "",
    buildsCompleted: existing.buildsCompleted || "",
    stillFuzzy: existing.stillFuzzy || "",
    driftedMost: existing.driftedMost || "",
    whatHelped: existing.whatHelped || "",
    newUnderstanding: existing.newUnderstanding || "",
    openLoop: existing.openLoop || "",
    startHereNext: existing.startHereNext || "",
  });

  useEffect(() => {
    const e = reviewMap[activeWeek] || {};
    setForm({
      meaningfulMovement: e.meaningfulMovement || "",
      lessonsCompleted: e.lessonsCompleted || "",
      buildsCompleted: e.buildsCompleted || "",
      stillFuzzy: e.stillFuzzy || "",
      driftedMost: e.driftedMost || "",
      whatHelped: e.whatHelped || "",
      newUnderstanding: e.newUnderstanding || "",
      openLoop: e.openLoop || "",
      startHereNext: e.startHereNext || "",
    });
  }, [activeWeek, reviews.length]);

  const utils = trpc.useUtils();
  const save = trpc.study.saveWeeklyReview.useMutation({
    onSuccess: () => { utils.study.getWeeklyReviews.invalidate(); toast.success(`Week ${activeWeek} review saved.`); },
  });
  const f = (key: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [key]: v }));

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(wk => (
          <button key={wk} onClick={() => setActiveWeek(wk)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${activeWeek === wk ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-border/50 text-muted-foreground hover:border-border"}`}>
            Week {wk}
          </button>
        ))}
      </div>
      <Field label="Meaningful Movement This Week" prompt="What actually moved?" value={form.meaningfulMovement} onChange={f("meaningfulMovement")} />
      <Field label="Lessons Completed" prompt="Which days did you finish?" value={form.lessonsCompleted} onChange={f("lessonsCompleted")} rows={2} />
      <Field label="Tiny Builds Completed" prompt="What did you actually make?" value={form.buildsCompleted} onChange={f("buildsCompleted")} rows={2} />
      <Field label="What Still Feels Fuzzy" prompt="No shame — just name it." value={form.stillFuzzy} onChange={f("stillFuzzy")} />
      <Field label="Where I Drifted Most" prompt="Pattern, not judgment." value={form.driftedMost} onChange={f("driftedMost")} rows={2} />
      <Field label="What Helped Me Return" prompt="What worked?" value={form.whatHelped} onChange={f("whatHelped")} rows={2} />
      <Field label="One Thing I Understand Now That I Did Not Before" prompt="The real win." value={form.newUnderstanding} onChange={f("newUnderstanding")} />
      <Field label="Open Loop Entering Next Week" prompt="What is unresolved?" value={form.openLoop} onChange={f("openLoop")} rows={2} />
      <Field label="Start Here for Next Week" prompt="The first move." value={form.startHereNext} onChange={f("startHereNext")} rows={2} />
      <Button onClick={() => save.mutate({ weekNum: activeWeek, ...form })} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Week {activeWeek} Review
      </Button>
    </div>
  );
}

// ─── Re-Entry + Success Tab ───────────────────────────────────────────────────

function ReEntryTab({ completedCount }: { completedCount: number }) {
  const [checkedMarkers, setCheckedMarkers] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("studySuccessMarkers") || "[]"); } catch { return []; }
  });
  const toggle = (i: number) => {
    const next = checkedMarkers.includes(i) ? checkedMarkers.filter(x => x !== i) : [...checkedMarkers, i];
    setCheckedMarkers(next);
    localStorage.setItem("studySuccessMarkers", JSON.stringify(next));
  };

  return (
    <div className="space-y-8">
      {/* Amnesty */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-6 space-y-4">
        <div className="flex items-center gap-2 text-amber-400">
          <RotateCcw className="w-5 h-5" />
          <h3 className="font-semibold">Re-Entry</h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground italic">
          <p>You have been away. Nothing is broken.</p>
          <p>We are not reopening every tab.</p>
          <p>We are starting here.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Choose one:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-center gap-2"><Circle className="w-3 h-3 text-primary" /> Resume the last unfinished day</li>
            <li className="flex items-center gap-2"><Circle className="w-3 h-3 text-primary" /> Do a review day instead</li>
            <li className="flex items-center gap-2"><Circle className="w-3 h-3 text-primary" /> Rebuild a tiny project you already completed</li>
            <li className="flex items-center gap-2"><Circle className="w-3 h-3 text-primary" /> Restudy one concept that still feels fuzzy</li>
          </ul>
        </div>
        <div className="pt-2 text-xs text-muted-foreground border-t border-border/50">
          This tracker is not a test of worth. It is a way to keep the thread. Small movement still counts. Continue.
        </div>
      </div>

      {/* Success Markers */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">Success Markers</h3>
          <Badge variant="outline" className="text-xs ml-auto">{checkedMarkers.length} / {SUCCESS_MARKERS.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">By the end of this tracker, success means:</p>
        <div className="space-y-2">
          {SUCCESS_MARKERS.map((marker, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                checkedMarkers.includes(i)
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-muted/30 border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${checkedMarkers.includes(i) ? "bg-emerald-500 border-emerald-500" : "border-border"}`}>
                {checkedMarkers.includes(i) && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm">{marker}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "daily", label: "Daily", icon: BookOpen },
  { id: "compass", label: "Compass", icon: Sparkles },
  { id: "focus", label: "Focus Log", icon: Zap },
  { id: "review", label: "Weekly Review", icon: Calendar },
  { id: "reentry", label: "Re-Entry", icon: RotateCcw },
];

export default function StudyTrackerPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("daily");

  const { data: dayLogs = [], isLoading: logsLoading } = trpc.study.getDayLogs.useQuery();
  const { data: focusBlocks = [] } = trpc.study.getFocusBlocks.useQuery();
  const { data: weeklyReviews = [] } = trpc.study.getWeeklyReviews.useQuery();

  const completedCount = dayLogs.filter((l: any) => l.completedAt).length;

  if (user?.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Study Tracker</h1>
        <p className="text-muted-foreground">This is a personal tool. Access is restricted.</p>
        <Link href="/"><Button variant="outline">Go Home</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-semibold">Study Tracker</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              if (!user?.isPro) {
                toast.error("Export is a Pro feature", { description: "Upgrade to download your full session history.", action: { label: "Upgrade", onClick: () => window.location.href = "/pro" } });
                return;
              }
              const rows = [["Date","Type","Lesson","Tiny Project","Intention","Actual Work","What Moved","Next Step"], ...dayLogs.map((l: any) => [l.date ?? "", l.type ?? "", l.lesson ?? "", l.tinyProject ?? "", l.intention ?? "", l.actualWork ?? "", l.whatMoved ?? "", l.nextStep ?? ""])];
              const csv = rows.map(r => r.map((v: string) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
              const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "study-tracker-export.csv"; a.click();
            }}
          >
            {user?.isPro ? "↓ Export CSV" : "↓ Export (Pro)"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">30-Day Beginner Learning Path · Python · Electronics · Edge AI</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {logsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {tab === "daily" && <DailyTab logs={dayLogs} />}
          {tab === "compass" && <WeeklyCompassTab />}
          {tab === "focus" && <FocusLogTab blocks={focusBlocks} />}
          {tab === "review" && <WeeklyReviewTab reviews={weeklyReviews} />}
          {tab === "reentry" && <ReEntryTab completedCount={completedCount} />}
        </>
      )}
    </div>
  );
}
