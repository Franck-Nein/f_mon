const unlockStepData = [
  [6, 700],
  [9, 1240],
  [12, 2200],
  [15, 3439],
  [18, 5846],
  [21, 9938],
  [24, 16896],
  [27, 28723],
  [30, 48830],
  [33, 83011],
  [36, 141119],
  [39, 239903],
  [42, 407835],
  [45, 693320],
  [48, 1178644],
  [51, 2003696],
  [54, 3406283],
  [57, 5790681],
  [60, 9844158],
  [63, 16735068],
  [66, 28449616],
  [69, 48364348],
  [72, 82219391],
  [75, 139772963],
  [78, 237614034],
  [81, 403943854],
  [84, 686704544],
  [87, 1167397711],
  [90, 1984576085],
  [93, 3373779305],
  [96, 5735424752],
  [99, 9750221964],
  [102, 16575377144],
  [105, 28178140813],
  [108, 47902838819],
  [111, 81434825035],
  [114, 138439200932],
  [117, 235346638816],
  [120, 400089281280],
  [123, 680151770175],
  [126, 1156257995694],
  [129, 1965638569555],
  [132, 3341585528931],
  [135, 5680695332352],
  [138, 9657181951385],
  [141, 16417209124210],
  [144, 27909255182814],
  [147, 47445733252599],
  [150, 80657745580503],
  [153, 137118165873701],
  [156, 233100879242929],
  [159, 396271490050963],
  [162, 673661525161207],
  [165, 1145224579300822],
  [168, 1946881761906906],
  [171, 3309698956304105],
  [174, 5626488159523000],
];

let chart;

const fmt = (n) => new Intl.NumberFormat("en-US").format(Math.round(n));

function getCapCosts() {
  const c1 = Number(document.getElementById("c1").value);
  const c2 = Number(document.getElementById("c2").value);
  const c3 = Number(document.getElementById("c3").value);
  const c4 = Number(document.getElementById("c4").value);
  return [0, c1, c1 + c2, c1 + c2 + c3, c1 + c2 + c3 + c4];
}

function buildUnlockCumulativeMap() {
  const map = new Map([[3, 0]]);
  let sum = 0;
  for (const [habs, price] of unlockStepData) {
    sum += price;
    map.set(habs, sum);
  }
  return map;
}

function unlockCostForHabitats(habCount, cumulativeMap) {
  if (habCount <= 3) return 0;
  const tiers = [...cumulativeMap.keys()].sort((a, b) => a - b);
  for (const t of tiers) {
    if (t >= habCount) return cumulativeMap.get(t);
  }
  return Infinity;
}

function buildCostTables(maxSlots, maxHabs, capCosts) {
  const INF = Number.POSITIVE_INFINITY;
  const dpByHabs = Array.from({ length: maxHabs + 1 }, () =>
    Array(maxSlots + 1).fill(INF),
  );
  const parent = Array.from({ length: maxHabs + 1 }, () =>
    Array(maxSlots + 1).fill(null),
  );
  dpByHabs[0][0] = 0;

  for (let i = 1; i <= maxHabs; i++) {
    const prev = dpByHabs[i - 1];
    const curr = dpByHabs[i];

    for (let s = 0; s <= maxSlots; s++) {
      if (!Number.isFinite(prev[s])) continue;

      for (let cap = 0; cap <= 4; cap++) {
        const ns = Math.min(maxSlots, s + cap);
        const nc = prev[s] + capCosts[cap];
        if (nc < curr[ns]) {
          curr[ns] = nc;
          parent[i][ns] = { prevS: s, cap };
        }
      }
    }
  }

  return { dpByHabs, parent };
}

function reconstructMix(parent, nHabitats, targetSlots) {
  const mix = [0, 0, 0, 0, 0];
  let s = targetSlots;
  for (let i = nHabitats; i >= 1; i--) {
    const step = parent[i][s];
    if (!step) {
      mix[0] += i;
      break;
    }
    mix[step.cap]++;
    s = step.prevS;
  }
  return mix;
}

function solveForSlots(targetSlots, cumulativeMap, dpByHabs, parent, maxHabs) {
  let best = null;

  const minHabsNeeded = Math.max(1, Math.ceil(targetSlots / 4));

  for (let habs = minHabsNeeded; habs <= maxHabs; habs++) {
    const unlock = unlockCostForHabitats(habs, cumulativeMap);
    if (!Number.isFinite(unlock)) continue;

    const buildCost = dpByHabs[habs][targetSlots];
    if (!Number.isFinite(buildCost)) continue;

    const total = unlock + buildCost;
    if (!best || total < best.total) {
      best = {
        targetSlots,
        habitats: habs,
        unlockCost: unlock,
        buildCost,
        total,
        mix: reconstructMix(parent, habs, targetSlots),
      };
    }
  }

  return best;
}

function renderResult(best) {
  const status = document.getElementById("status");
  if (!best) {
    document.getElementById("rCost").textContent = "-";
    document.getElementById("rHabs").textContent = "-";
    document.getElementById("rUnlock").textContent = "-";
    document.getElementById("rBuild").textContent = "-";
    document.getElementById("rMix").textContent =
      "No valid plan found for this target.";
    status.textContent = "";
    status.className = "note bad";
    return;
  }

  document.getElementById("rCost").textContent = fmt(best.total);
  document.getElementById("rHabs").textContent = `${best.habitats}`;
  document.getElementById("rUnlock").textContent = fmt(best.unlockCost);
  document.getElementById("rBuild").textContent = fmt(best.buildCost);
  document.getElementById("rMix").textContent =
    `Mix (count by capacity): cap1=${best.mix[1]}, cap2=${best.mix[2]}, cap3=${best.mix[3]}, cap4=${best.mix[4]}`;

  status.textContent = `Computed optimal plan for ${best.targetSlots} slots.`;
  status.className = "note ok";
}

function drawChart(points) {
  const ctx = document.getElementById("chart").getContext("2d");
  const labels = points.map((p) => p.slots);
  const costs = points.map((p) => p.total);
  const unlocks = points.map((p) => p.unlockCost);
  const builds = points.map((p) => p.buildCost);
  const habs = points.map((p) => p.habitats);
  const cap1 = points.map((p) => p.mix[1]);
  const cap2 = points.map((p) => p.mix[2]);
  const cap3 = points.map((p) => p.mix[3]);
  const cap4 = points.map((p) => p.mix[4]);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Optimal total cost",
          data: costs,
          borderColor: "#7aa2ff",
          backgroundColor: "rgba(122,162,255,.2)",
          borderWidth: 2,
          tension: 0.18,
          pointRadius: 0,
        },
        {
          label: "Unlock cost part",
          data: unlocks,
          borderColor: "#6be6b5",
          borderWidth: 1.5,
          tension: 0.18,
          pointRadius: 0,
        },
        {
          label: "Build/upgrade cost part",
          data: builds,
          borderColor: "#ffb86b",
          borderWidth: 1.5,
          tension: 0.18,
          pointRadius: 0,
        },
        {
          label: "Habitats needed",
          data: habs,
          yAxisID: "yCount",
          borderColor: "#ffffff",
          borderWidth: 1.2,
          borderDash: [4, 4],
          tension: 0.18,
          pointRadius: 0,
        },
        {
          label: "Cap1 habitats",
          data: cap1,
          yAxisID: "yCount",
          borderColor: "#4dd0e1",
          borderWidth: 1,
          tension: 0.18,
          pointRadius: 0,
        },
        {
          label: "Cap2 habitats",
          data: cap2,
          yAxisID: "yCount",
          borderColor: "#81c784",
          borderWidth: 1,
          tension: 0.18,
          pointRadius: 0,
        },
        {
          label: "Cap3 habitats",
          data: cap3,
          yAxisID: "yCount",
          borderColor: "#ba68c8",
          borderWidth: 1,
          tension: 0.18,
          pointRadius: 0,
        },
        {
          label: "Cap4 habitats",
          data: cap4,
          yAxisID: "yCount",
          borderColor: "#ef5350",
          borderWidth: 1,
          tension: 0.18,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#e7ecff" } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.yAxisID === "yCount") {
                return `${ctx.dataset.label}: ${Math.round(ctx.parsed.y)}`;
              }
              return `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`;
            },
            footer: (items) => {
              if (!items.length) return "";
              const i = items[0].dataIndex;
              const p = points[i];
              return `Total cost: ${fmt(p.total)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Target slots", color: "#9aa4d1" },
          ticks: { color: "#9aa4d1" },
          grid: { color: "rgba(154,164,209,.15)" },
        },
        y: {
          title: { display: true, text: "Cost", color: "#9aa4d1" },
          ticks: {
            color: "#9aa4d1",
            callback: (value) => fmt(value),
          },
          grid: { color: "rgba(154,164,209,.15)" },
        },
        yCount: {
          position: "right",
          title: { display: true, text: "Habitats count", color: "#9aa4d1" },
          ticks: {
            color: "#9aa4d1",
            precision: 0,
            callback: (value) => Math.round(value),
          },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function recalculate() {
  const targetSlots = Number(document.getElementById("targetSlots").value);
  const graphMaxSlots = Number(document.getElementById("graphMaxSlots").value);
  const capCosts = getCapCosts();
  const cumulativeMap = buildUnlockCumulativeMap();

  if (![targetSlots, graphMaxSlots, ...capCosts].every(Number.isFinite)) {
    document.getElementById("status").textContent = "Invalid numeric input.";
    document.getElementById("status").className = "note bad";
    return;
  }

  const maxPossibleSlots = unlockStepData[unlockStepData.length - 1][0] * 4;
  const safeTarget = Math.max(1, Math.min(targetSlots, maxPossibleSlots));
  const safeGraphMax = Math.max(10, Math.min(graphMaxSlots, maxPossibleSlots));
  const maxHabs = unlockStepData[unlockStepData.length - 1][0];

  const { dpByHabs, parent } = buildCostTables(safeGraphMax, maxHabs, capCosts);

  const best = solveForSlots(
    safeTarget,
    cumulativeMap,
    dpByHabs,
    parent,
    maxHabs,
  );
  renderResult(best);

  const points = [];
  for (let s = 1; s <= safeGraphMax; s++) {
    const ans = solveForSlots(s, cumulativeMap, dpByHabs, parent, maxHabs);
    if (ans) {
      points.push({
        slots: s,
        total: ans.total,
        habitats: ans.habitats,
        unlockCost: ans.unlockCost,
        buildCost: ans.buildCost,
        mix: ans.mix,
      });
    }
  }
  drawChart(points);
}

document.getElementById("recalc").addEventListener("click", recalculate);
recalculate();
