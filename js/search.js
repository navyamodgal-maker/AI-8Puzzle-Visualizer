const NODE_LIMIT = 300000;
const TRACE_LIMIT = 4000;

function makeNode(state, parent, g, goal, heuristic) {
  return { state, parent, g, h: heuristic(state, goal) };
}

function runSearch(algorithm, start, goal, options = {}) {
  const startTime = performance.now();
  if (algorithm === "iddls") {
    return runIterativeDeepening(start, goal, options, startTime);
  }

  const heuristic = HEURISTICS[options.heuristic || "manhattan"];
  const isInformed = algorithm === "astar" || algorithm === "gbfs";
  const isDLS = algorithm === "dls";
  const depthLimit = algorithm === "dfs" ? 99 : (options.limit ?? 5);

  const priority = (node) => (algorithm === "gbfs" ? node.h : node.g + node.h);

  const openList = [makeNode(start, null, 0, goal, heuristic)];
  const closedSet = new Set();
  const bestCost = { [start]: 0 };
  const trace = [];

  let generated = 1,
    expanded = 0,
    maxDepth = 0,
    peakSize = 1,
    goalNode = null;

  while (openList.length > 0 && generated < NODE_LIMIT) {
    let node;
    if (algorithm === "bfs") {
      node = openList.shift();
    } else if (algorithm === "dfs" || isDLS) {
      node = openList.pop();
    } else {
      let bestIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (priority(openList[i]) < priority(openList[bestIndex])) {
          bestIndex = i;
        }
      }
      node = openList.splice(bestIndex, 1)[0];
    }

    if (!isDLS) {
      if (closedSet.has(node.state)) {
        continue;
      }
      closedSet.add(node.state);
    }
    expanded++;
    maxDepth = Math.max(maxDepth, node.g);

    const isGoal = node.state === goal;
    const children = [];
    if (!isGoal && node.g < depthLimit) {
      for (const next of getNeighbours(node.state)) {
        if (isDLS) {
          if (isOnPath(node, next)) {
            continue;
          }
        } else {
          if (bestCost[next] !== undefined && bestCost[next] <= node.g + 1) {
            continue;
          }
          bestCost[next] = node.g + 1;
        }
        openList.push(makeNode(next, node, node.g + 1, goal, heuristic));
        generated++;
        children.push(next);
      }
    }

    if (options.trace && trace.length < TRACE_LIMIT) {
      trace.push({
        state: node.state,
        parent: node.parent ? node.parent.state : null,
        g: node.g,
        h: node.h,
        generated,
        expanded,
        children,
        frontier: describeFrontier(openList, algorithm, isInformed, priority),
        frontierSize: openList.length,
        closedSize: closedSet.size,
      });
    }

    peakSize = Math.max(peakSize, openList.length + closedSet.size);
    if (isGoal) {
      goalNode = node;
      break;
    }
  }

  const path = [];
  for (let n = goalNode; n; n = n.parent) {
    path.unshift(n.state);
  }

  return {
    found: goalNode !== null,
    path,
    generated,
    expanded,
    maxDepth,
    time: performance.now() - startTime,
    memory: peakSize * 0.064,
    cost: goalNode ? goalNode.g : "-",
    trace,
  };
}

function isOnPath(node, state) {
  for (let n = node; n; n = n.parent) {
    if (n.state === state) {
      return true;
    }
  }
  return false;
}

function describeFrontier(openList, algorithm, isInformed, priority) {
  let items;
  if (isInformed) {
    items = [...openList].sort((a, b) => priority(a) - priority(b)).slice(0, 6);
  } else if (algorithm === "bfs") {
    items = openList.slice(0, 6);
  } else {
    items = openList.slice(-6).reverse();
  }
  return items.map(
    (n) => n.state + (isInformed ? " (" + priority(n) + ")" : ""),
  );
}

function runIterativeDeepening(start, goal, options, startTime) {
  const total = {
    generated: 0,
    expanded: 0,
    maxDepth: 0,
    memory: 0,
    trace: [],
  };
  let last;

  for (let limit = 0; limit <= 20; limit++) {
    last = runSearch("dls", start, goal, { ...options, limit });
    total.generated += last.generated;
    total.expanded += last.expanded;
    total.maxDepth = Math.max(total.maxDepth, last.maxDepth);
    total.memory = Math.max(total.memory, last.memory);
    if (options.trace) {
      total.trace.push(
        ...last.trace.slice(0, Math.max(0, TRACE_LIMIT - total.trace.length)),
      );
    }
    if (last.found || total.generated > NODE_LIMIT) {
      break;
    }
  }
  return { ...last, ...total, time: performance.now() - startTime };
}
