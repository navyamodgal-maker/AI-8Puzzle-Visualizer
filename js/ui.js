const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const DEFAULT_START = "283164705";
const DEFAULT_GOAL = "123804765";
const ALGORITHM_NAMES = {
  bfs: "BFS",
  dfs: "DFS",
  dls: "DLS",
  iddls: "IDDLS",
  gbfs: "GBFS",
  astar: "A*",
};

function showPage(name) {
  $$(".pg").forEach((page) =>
    page.classList.toggle("d-none", page.id !== name),
  );
  $$("#nav a").forEach((link) =>
    link.classList.toggle("active", link.dataset.p === name),
  );
}
$$("#nav a").forEach((link) => {
  link.onclick = (event) => {
    event.preventDefault();
    showPage(link.dataset.p);
  };
});

function createGrid(id, state) {
  $("#" + id).innerHTML = state
    .split("")
    .map((t) => `<input maxlength="1" value="${t === "0" ? "_" : t}">`)
    .join("");
}

function readGrid(id) {
  const state = $$("#" + id + " input")
    .map((box) =>
      box.value.trim() === "" || box.value === "_" ? "0" : box.value,
    )
    .join("");
  const hasAllDigits = "012345678".split("").every((d) => state.includes(d));
  return hasAllDigits && state.length === 9 ? state : null;
}

createGrid("ini", DEFAULT_START);
createGrid("goal", DEFAULT_GOAL);

$("#rnd").onclick = () => {
  let state = readGrid("goal") || DEFAULT_GOAL;
  let previous = "";
  for (let i = 0; i < 60; i++) {
    const options = getNeighbours(state).filter((s) => s !== previous);
    previous = state;
    state = options[Math.floor(Math.random() * options.length)];
  }
  createGrid("ini", state);
};

function boardHtml(state, extraClass = "") {
  const cells = state
    .split("")
    .map(
      (t) =>
        `<span class="${t === "0" ? "z" : ""}">${t === "0" ? "_" : t}</span>`,
    )
    .join("");
  return `<div class="mini ${extraClass}">${cells}</div>`;
}

const tileElements = {};
for (let n = 1; n <= 8; n++) {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.textContent = n;
  $("#board").appendChild(tile);
  tileElements[n] = tile;
}

function placeTiles(state) {
  for (let i = 0; i < 9; i++) {
    const tile = tileElements[state[i]];
    if (tile) {
      tile.style.transform = `translate(${(i % 3) * 102}px, ${Math.floor(i / 3) * 102}px)`;
    }
  }
}
placeTiles(DEFAULT_START);

let frames = [];
let frameIndex = 0;
let timer = null;
let result = null;
let currentAlgorithm = "astar";
let searchFrameCount = 0;

function stopPlayback() {
  clearInterval(timer);
  timer = null;
}

function startPlayback() {
  stopPlayback();
  timer = setInterval(
    () => {
      if (frameIndex >= frames.length - 1) {
        return stopPlayback();
      }
      frameIndex++;
      showFrame();
    },
    1000 / $("#speed").value,
  );
}

function showFrame() {
  const frame = frames[frameIndex];
  if (!frame) {
    return;
  }
  placeTiles(frame.state);
  const isInformed =
    currentAlgorithm === "astar" || currentAlgorithm === "gbfs";

  if (frame.type === "search") {
    $("#stepLbl").textContent = "Searching: expanding node";
    const recent = frames
      .slice(Math.max(0, frameIndex - 5), frameIndex + 1)
      .map((f) => f.state);
    let html = `<b>Current node expanded:</b> ${boardHtml(frame.state, "cur")}`;
    html += `<b>Parent:</b> ${frame.parent || "none (root)"}<br>`;
    html += `<b>Depth:</b> ${frame.g} &nbsp; <b>Path cost g(n):</b> ${frame.g}`;
    if (isInformed) {
      html += ` &nbsp; <b>h(n):</b> ${frame.h} &nbsp; <b>f(n):</b> ${frame.g + frame.h}`;
    }
    html += `<br><b>Generated:</b> ${frame.generated} &nbsp; <b>Expanded:</b> ${frame.expanded}`;
    html += `<br><b>Frontier (${frame.frontierSize}) top:</b> ${frame.frontier.join(", ") || "empty"}`;
    html += `<br><b>Explored (${frame.closedSize}) latest:</b> ${recent.join(", ")}`;
    $("#info").innerHTML = html;
    $("#succ").innerHTML =
      frame.children.map((c) => boardHtml(c)).join("") ||
      '<span class="text-muted">none</span>';
  } else {
    $("#stepLbl").textContent = `Solution step ${frame.step}`;
    $("#info").innerHTML =
      `Following solution path: step ${frame.step} of ${result.path.length - 1}`;
    $("#path").innerHTML = frames
      .slice(searchFrameCount, frameIndex + 1)
      .map((f) => boardHtml(f.state, f.step === frame.step ? "cur" : ""))
      .join("<span>→</span>");
  }

  if (frameIndex === frames.length - 1) {
    showSummary();
  }
}

function showSummary() {
  const r = result;
  $("#summary").classList.remove("d-none");
  $("#summary").innerHTML =
    `<h2 class="h6">Solution Summary</h2><ul class="mb-0">
    <li>Solution: <b>${r.found ? "Found" : "Not Found"}</b></li>
    <li>Total moves: ${r.found ? r.path.length - 1 : "-"}</li>
    <li>Nodes generated: ${r.generated}</li>
    <li>Nodes expanded: ${r.expanded}</li>
    <li>Max search depth: ${r.maxDepth}</li>
    <li>Execution time: ${r.time.toFixed(2)} ms</li>
    <li>Path cost: ${r.cost}</li>
    <li>Memory (approx): ${r.memory.toFixed(1)} KB</li></ul>`;
}

$("#run").onclick = () => {
  const start = readGrid("ini");
  const goal = readGrid("goal");
  if (!start || !goal) {
    return alert("Enter each digit 1–8 once and one blank (_) in both grids.");
  }
  if (!isSolvable(start, goal)) {
    return alert("This puzzle is unsolvable (parity mismatch). Try another.");
  }

  currentAlgorithm = $("#algo").value;
  result = runSearch(currentAlgorithm, start, goal, {
    heuristic: $("#heur").value,
    limit: +$("#limit").value,
    trace: true,
  });

  searchFrameCount = result.trace.length;
  frames = result.trace.map((step) => ({ type: "search", ...step }));
  if (result.found) {
    result.path.forEach((state, step) =>
      frames.push({ type: "move", state, step }),
    );
  }

  frameIndex = 0;
  $("#summary").classList.add("d-none");
  $("#path").innerHTML = "";
  showFrame();
  startPlayback();
};

$("#pause").onclick = stopPlayback;
$("#resume").onclick = startPlayback;
$("#next").onclick = () => {
  stopPlayback();
  if (frameIndex < frames.length - 1) {
    frameIndex++;
    showFrame();
  }
};
$("#prev").onclick = () => {
  stopPlayback();
  if (frameIndex > 0) {
    frameIndex--;
    showFrame();
  }
};
$("#reset").onclick = () => {
  stopPlayback();
  frameIndex = 0;
  $("#summary").classList.add("d-none");
  $("#path").innerHTML = "";
  if (frames.length) {
    showFrame();
  }
};
$("#speed").oninput = () => {
  if (timer) {
    startPlayback();
  }
};

$("#cmp").onclick = () => {
  const start = readGrid("ini");
  const goal = readGrid("goal");
  if (!start || !goal || !isSolvable(start, goal)) {
    return alert("Set a valid, solvable puzzle in the Solver first.");
  }

  let html =
    "<tr><th>Algorithm<th>Found<th>Generated<th>Expanded<th>Moves<th>Time<th>Memory</tr>";
  for (const key in ALGORITHM_NAMES) {
    const r = runSearch(key, start, goal, {
      heuristic: $("#heur").value,
      limit: +$("#limit").value,
    });
    html +=
      `<tr><td>${ALGORITHM_NAMES[key]}<td>${r.found ? "Yes" : "No"}<td>${r.generated}<td>${r.expanded}` +
      `<td>${r.found ? r.path.length - 1 : "-"}<td>${r.time.toFixed(1)} ms<td>${r.memory.toFixed(1)} KB</tr>`;
  }
  $("#cmpT").innerHTML = html;
};

const ALGORITHM_INFO = [
  {
    name: "A*",
    description:
      "Informed search that expands the node with the lowest f(n) = g(n) + h(n).",
    working:
      "Keeps an open list and a closed set. Always expands the most promising node and reopens a state if a cheaper path is found.",
    pros: "Optimal and complete with an admissible heuristic. Expands far fewer nodes than uninformed search.",
    cons: "Memory heavy, since it stores every generated node.",
    time: "O(b^d) worst case, much better with a good heuristic",
    space: "O(b^d)",
    complete: "Yes",
    optimal: "Yes (admissible h)",
  },
  {
    name: "GBFS",
    description: "Informed search that uses only h(n).",
    working: "Expands the node that looks closest to the goal.",
    pros: "Fast and expands few nodes.",
    cons: "Not optimal and can follow a misleading heuristic.",
    time: "O(b^m)",
    space: "O(b^m)",
    complete: "Yes (with closed set, finite space)",
    optimal: "No",
  },
  {
    name: "BFS",
    description: "Uninformed level-by-level search.",
    working: "Uses a FIFO queue and expands the shallowest node first.",
    pros: "Finds the shortest solution.",
    cons: "Very high memory use.",
    time: "O(b^d)",
    space: "O(b^d)",
    complete: "Yes",
    optimal: "Yes (unit costs)",
  },
  {
    name: "DFS",
    description: "Uninformed search that goes as deep as possible first.",
    working: "Uses a LIFO stack and backtracks when it hits a dead end.",
    pros: "Low memory use.",
    cons: "Long, non-optimal paths, and may loop without a closed set.",
    time: "O(b^m)",
    space: "O(bm)",
    complete: "Only with a closed set / finite space",
    optimal: "No",
  },
  {
    name: "DLS",
    description: "DFS with a fixed depth limit L.",
    working: "Never expands nodes deeper than L.",
    pros: "Bounded memory and no infinite descent.",
    cons: "Fails if the solution is deeper than L.",
    time: "O(b^L)",
    space: "O(bL)",
    complete: "No (if L < d)",
    optimal: "No",
  },
  {
    name: "IDDLS",
    description: "Repeats DLS with limits 0, 1, 2, and so on.",
    working: "Combines the completeness of BFS with the low memory of DFS.",
    pros: "Complete, optimal and low memory.",
    cons: "Repeats work at shallow levels.",
    time: "O(b^d)",
    space: "O(bd)",
    complete: "Yes",
    optimal: "Yes (unit costs)",
  },
];

$("#algs").innerHTML = ALGORITHM_INFO.map(
  (a) => `
  <div class="card p-3 mb-2"><h2 class="h5">${a.name}${a.name === "A*" ? ' <span class="badge bg-success">Assigned</span>' : ""}</h2>
  <ul class="small mb-0">
    <li><b>Description:</b> ${a.description}</li><li><b>Working:</b> ${a.working}</li>
    <li><b>Advantages:</b> ${a.pros}</li><li><b>Limitations:</b> ${a.cons}</li>
    <li><b>Time:</b> ${a.time}</li><li><b>Space:</b> ${a.space}</li>
    <li><b>Complete:</b> ${a.complete}</li><li><b>Optimal:</b> ${a.optimal}</li></ul></div>`,
).join("");
