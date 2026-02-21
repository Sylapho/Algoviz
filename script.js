// ═══════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════
let sortRunning = false;
let sortPaused = false;
let currentSortAlgo = 'bubble';
let sortArray = [];
let sortComps = 0, sortSwaps = 0;
let sortDelay = 30;

let graphRunning = false;
let graphPaused = false;
let currentGAlgo = 'bfs';
let ROWS = 20, COLS = 20;
let grid = [];
let startCell = { r: 2, c: 2 };
let endCell = { r: 17, c: 17 };
let isDrawing = false;
let drawMode = 'wall'; // wall or erase
let movingStart = false, movingEnd = false;
let graphDelay = 20;

// ═══════════════════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('sortApp').classList.remove('visible');
        document.getElementById('graphApp').classList.remove('visible');
        if (tab.dataset.view === 'sort') {
            document.getElementById('sortApp').classList.add('visible');
        } else {
            document.getElementById('graphApp').classList.add('visible');
            // Use requestAnimationFrame to ensure DOM is painted before measuring canvas size
            requestAnimationFrame(() => resizeCanvas());
        }
    });
});

// ═══════════════════════════════════════════════════════
// SORT ENGINE
// ═══════════════════════════════════════════════════════
const sortInfoMap = {
    bubble: '<strong>Tri à Bulles</strong> — Compare les éléments adjacents et échange. Répète. Simple mais O(n²).',
    selection: '<strong>Tri Sélection</strong> — Trouve le min, le place. Toujours O(n²) comparaisons, peu d\'échanges.',
    insertion: '<strong>Tri Insertion</strong> — Insère chaque élément à sa place. Excellent si presque trié.',
    merge: '<strong>Tri Fusion</strong> — Divise en deux, trie récursivement, fusionne. Stable, toujours O(n log n).',
    quick: '<strong>Tri Rapide</strong> — Pivot + partition. En pratique très rapide. O(n log n) moyen.',
    heap: '<strong>Tri par Tas</strong> — Construit un max-heap, extrait le max. O(n log n) garanti en place.',
    radix: '<strong>Tri Radix</strong> — Trie par chiffre, de moins significatif au plus. O(nk), non-comparatif.',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Résolveurs pour reprendre après une pause
let sortResumeResolve = null;
let graphResumeResolve = null;

// sleep qui se met en pause si sortPaused est true, et attend la reprise
async function sortSleep(ms) {
    await new Promise(r => setTimeout(r, ms));
    if (!sortRunning && !sortPaused) return; // arrêt complet
    if (sortPaused) {
        await new Promise(r => { sortResumeResolve = r; });
    }
}

// sleep qui se met en pause si graphPaused est true, et attend la reprise
async function graphSleep(ms) {
    await new Promise(r => setTimeout(r, ms));
    if (!graphRunning && !graphPaused) return; // arrêt complet
    if (graphPaused) {
        await new Promise(r => { graphResumeResolve = r; });
    }
}

function genArray(n) {
    sortArray = Array.from({ length: n }, () => Math.floor(Math.random() * 95) + 5);
    renderBars(sortArray);
    sortComps = 0; sortSwaps = 0;
    document.getElementById('compCount').textContent = '0';
    document.getElementById('swapCount').textContent = '0';
    document.getElementById('msCount').textContent = '—';
    setGStatus('sortStatusDot', 'sortStatusMsg', '', 'Prêt — Appuie sur Start');
}

function renderBars(arr, hl = {}) {
    const wrap = document.getElementById('barsWrap');
    const max = Math.max(...arr);
    wrap.innerHTML = '';
    arr.forEach((v, i) => {
        const b = document.createElement('div');
        b.className = 'bar';
        b.style.height = `${(v / max) * 100}%`;
        if (hl.piv && hl.piv.includes(i)) b.classList.add('piv');
        else if (hl.cmp && hl.cmp.includes(i)) b.classList.add('cmp');
        else if (hl.swp && hl.swp.includes(i)) b.classList.add('swp');
        else if (hl.srt && hl.srt.includes(i)) b.classList.add('srt');
        else if (hl.act && hl.act.includes(i)) b.classList.add('act');
        wrap.appendChild(b);
    });
}

function updStats(c, s) {
    sortComps = c; sortSwaps = s;
    document.getElementById('compCount').textContent = c;
    document.getElementById('swapCount').textContent = s;
}

function setGStatus(dotId, msgId, cls, msg) {
    const d = document.getElementById(dotId);
    const m = document.getElementById(msgId);
    d.className = 'status-dot ' + cls;
    m.className = 'status-msg ' + cls;
    m.textContent = msg;
}

// --- Bubble Sort ---
async function bubbleSort(a) {
    let c = 0, s = 0; const srt = new Set(), n = a.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (!sortRunning) return;
            c++; renderBars(a, { cmp: [j, j + 1], srt: [...srt] }); updStats(c, s);
            await sortSleep(sortDelay);
            if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; s++; renderBars(a, { swp: [j, j + 1], srt: [...srt] }); updStats(c, s); await sortSleep(sortDelay); }
        }
        srt.add(n - 1 - i);
    }
    srt.add(0); renderBars(a, { srt: [...srt] });
}

// --- Selection Sort ---
async function selectionSort(a) {
    let c = 0, s = 0; const srt = new Set(), n = a.length;
    for (let i = 0; i < n - 1; i++) {
        let mi = i;
        for (let j = i + 1; j < n; j++) {
            if (!sortRunning) return;
            c++; renderBars(a, { cmp: [mi, j], act: [i], srt: [...srt] }); updStats(c, s);
            await sortSleep(sortDelay);
            if (a[j] < a[mi]) mi = j;
        }
        if (mi !== i) { [a[i], a[mi]] = [a[mi], a[i]]; s++; renderBars(a, { swp: [i, mi], srt: [...srt] }); updStats(c, s); await sortSleep(sortDelay); }
        srt.add(i);
    }
    srt.add(n - 1); renderBars(a, { srt: [...srt] });
}

// --- Insertion Sort ---
async function insertionSort(a) {
    let c = 0, s = 0; const srt = new Set([0]), n = a.length;
    for (let i = 1; i < n; i++) {
        let j = i;
        while (j > 0) {
            if (!sortRunning) return;
            c++; renderBars(a, { cmp: [j, j - 1], srt: [...srt] }); updStats(c, s);
            await sortSleep(sortDelay);
            if (a[j] < a[j - 1]) { [a[j], a[j - 1]] = [a[j - 1], a[j]]; s++; renderBars(a, { swp: [j, j - 1], srt: [...srt] }); updStats(c, s); await sortSleep(sortDelay); j--; }
            else break;
        }
        srt.add(i);
    }
    renderBars(a, { srt: [...Array(a.length).keys()] });
}

// --- Merge Sort ---
async function mergeSortMain(a) {
    const aux = [...a];
    await mergeSort(a, aux, 0, a.length - 1, new Set());
    if (sortRunning) renderBars(a, { srt: [...Array(a.length).keys()] });
}
async function mergeSort(a, aux, l, r, srt) {
    if (l >= r || !sortRunning) return;
    const m = Math.floor((l + r) / 2);
    await mergeSort(a, aux, l, m, srt);
    await mergeSort(a, aux, m + 1, r, srt);
    await merge(a, aux, l, m, r, srt);
}
async function merge(a, aux, l, m, r, srt) {
    for (let i = l; i <= r; i++) aux[i] = a[i];
    let i = l, j = m + 1, k = l;
    while (i <= m && j <= r) {
        if (!sortRunning) return;
        sortComps++;
        renderBars(a, { cmp: [i, j], act: [k], srt: [...srt] });
        document.getElementById('compCount').textContent = sortComps;
        await sortSleep(sortDelay);
        if (aux[i] <= aux[j]) a[k++] = aux[i++];
        else a[k++] = aux[j++];
    }
    while (i <= m) { a[k++] = aux[i++]; }
    while (j <= r) { a[k++] = aux[j++]; }
    for (let x = l; x <= r; x++) srt.add(x);
    renderBars(a, { srt: [...srt] });
    await sortSleep(sortDelay);
}

// --- Quick Sort ---
async function quickSortMain(a) {
    const srt = new Set();
    await quickSort(a, 0, a.length - 1, srt);
    if (sortRunning) renderBars(a, { srt: [...Array(a.length).keys()] });
}
async function quickSort(a, lo, hi, srt) {
    if (lo >= hi || !sortRunning) return;
    const pi = await partition(a, lo, hi, srt);
    srt.add(pi);
    await quickSort(a, lo, pi - 1, srt);
    await quickSort(a, pi + 1, hi, srt);
}
async function partition(a, lo, hi, srt) {
    const pv = a[hi]; let i = lo - 1;
    for (let j = lo; j < hi; j++) {
        if (!sortRunning) return hi;
        sortComps++;
        renderBars(a, { cmp: [j, hi], piv: [hi], srt: [...srt] });
        document.getElementById('compCount').textContent = sortComps;
        await sortSleep(sortDelay);
        if (a[j] <= pv) { i++;[a[i], a[j]] = [a[j], a[i]]; sortSwaps++; renderBars(a, { swp: [i, j], piv: [hi], srt: [...srt] }); document.getElementById('swapCount').textContent = sortSwaps; await sortSleep(sortDelay); }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]]; sortSwaps++;
    return i + 1;
}

// --- Heap Sort ---
async function heapSortMain(a) {
    const n = a.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) await heapify(a, n, i, new Set());
    const srt = new Set();
    for (let i = n - 1; i > 0; i--) {
        if (!sortRunning) return;
        [a[0], a[i]] = [a[i], a[0]]; sortSwaps++;
        srt.add(i);
        renderBars(a, { swp: [0, i], srt: [...srt] });
        document.getElementById('swapCount').textContent = sortSwaps;
        await sortSleep(sortDelay);
        await heapify(a, i, 0, srt);
    }
    srt.add(0); renderBars(a, { srt: [...srt] });
}
async function heapify(a, n, i, srt) {
    let lg = i, l = 2 * i + 1, r = 2 * i + 2;
    if (!sortRunning) return;
    sortComps += 2;
    document.getElementById('compCount').textContent = sortComps;
    if (l < n && a[l] > a[lg]) lg = l;
    if (r < n && a[r] > a[lg]) lg = r;
    if (lg !== i) {
        [a[i], a[lg]] = [a[lg], a[i]]; sortSwaps++;
        renderBars(a, { swp: [i, lg], act: [lg], srt: [...srt] });
        document.getElementById('swapCount').textContent = sortSwaps;
        await sortSleep(sortDelay);
        await heapify(a, n, lg, srt);
    }
}

// --- Radix Sort ---
async function radixSortMain(a) {
    const max = Math.max(...a);
    const srt = new Set();
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        if (!sortRunning) return;
        await countingSort(a, exp, srt);
    }
    renderBars(a, { srt: [...Array(a.length).keys()] });
}
async function countingSort(a, exp, srt) {
    const n = a.length, out = new Array(n), cnt = new Array(10).fill(0);
    for (let i = 0; i < n; i++) cnt[Math.floor(a[i] / exp) % 10]++;
    for (let i = 1; i < 10; i++) cnt[i] += cnt[i - 1];
    for (let i = n - 1; i >= 0; i--) out[--cnt[Math.floor(a[i] / exp) % 10]] = a[i];
    for (let i = 0; i < n; i++) {
        if (!sortRunning) return;
        a[i] = out[i];
        sortComps++;
        renderBars(a, { act: [i], srt: [...srt] });
        document.getElementById('compCount').textContent = sortComps;
        await sortSleep(sortDelay * 2);
    }
}

async function runSort() {
    sortRunning = true;
    sortPaused = false;
    setSortBtn('start');
    document.getElementById('sortStartBtn').disabled = true;
    document.getElementById('sortResetBtn').disabled = true;
    document.getElementById('sortShuffleBtn').disabled = true;
    document.getElementById('sortStopBtn').disabled = false;
    setGStatus('sortStatusDot', 'sortStatusMsg', 'run', 'Tri en cours…');
    sortComps = 0; sortSwaps = 0;
    const a = [...sortArray];
    const t = performance.now();
    const fns = { bubble: bubbleSort, selection: selectionSort, insertion: insertionSort, merge: mergeSortMain, quick: quickSortMain, heap: heapSortMain, radix: radixSortMain };
    await fns[currentSortAlgo](a);
    if (sortRunning) {
        const ms = Math.round(performance.now() - t);
        document.getElementById('msCount').textContent = ms;
        setGStatus('sortStatusDot', 'sortStatusMsg', 'done', `Terminé en ${ms}ms`);
        sortPaused = false;
        setSortBtn('start');
    }
    sortRunning = false;
    document.getElementById('sortStartBtn').disabled = false;
    document.getElementById('sortResetBtn').disabled = false;
    document.getElementById('sortShuffleBtn').disabled = false;
    document.getElementById('sortStopBtn').disabled = true;
}

function setSortBtn(mode) {
    const btn = document.getElementById('sortStartBtn');
    if (mode === 'continue') {
        btn.textContent = '▶ Suite';
        btn.classList.remove('primary');
        btn.classList.add('continue');
    } else {
        btn.textContent = '▶ Start';
        btn.classList.remove('continue');
        btn.classList.add('primary');
    }
}

function sortResume() {
    sortPaused = false;
    sortRunning = true;
    setSortBtn('start');
    document.getElementById('sortStartBtn').disabled = true;
    document.getElementById('sortResetBtn').disabled = true;
    document.getElementById('sortShuffleBtn').disabled = true;
    document.getElementById('sortStopBtn').disabled = false;
    setGStatus('sortStatusDot', 'sortStatusMsg', 'run', 'Reprise…');
    if (sortResumeResolve) { sortResumeResolve(); sortResumeResolve = null; }
}

// Sort controls
document.querySelectorAll('[data-algo]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (sortRunning && !sortPaused) return;
        // Reset pause state if we were paused
        if (sortPaused) {
            sortPaused = false;
            if (sortResumeResolve) { sortResumeResolve(); sortResumeResolve = null; }
            setSortBtn('start');
            document.getElementById('sortStopBtn').disabled = true;
            document.getElementById('sortResetBtn').disabled = false;
            document.getElementById('sortShuffleBtn').disabled = false;
        }
        document.querySelectorAll('[data-algo]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSortAlgo = btn.dataset.algo;
        document.getElementById('sortInfo').innerHTML = sortInfoMap[currentSortAlgo];
        updateSortInfoBtns();
        genArray(parseInt(document.getElementById('sizeSlider').value));
    });
});
document.getElementById('sortStartBtn').addEventListener('click', () => {
    if (sortPaused) sortResume();
    else if (!sortRunning) runSort();
});
document.getElementById('sortStopBtn').addEventListener('click', () => {
    sortPaused = true;
    sortRunning = false;
    document.getElementById('sortStopBtn').disabled = true;
    document.getElementById('sortStartBtn').disabled = false;
    document.getElementById('sortResetBtn').disabled = false;
    document.getElementById('sortShuffleBtn').disabled = false;
    setSortBtn('continue');
    setGStatus('sortStatusDot', 'sortStatusMsg', '', 'Arrêté — Suite ou Reset');
});
document.getElementById('sortResetBtn').addEventListener('click', () => {
    sortRunning = false; sortPaused = false;
    if (sortResumeResolve) { sortResumeResolve(); sortResumeResolve = null; }
    setSortBtn('start');
    setTimeout(() => genArray(parseInt(document.getElementById('sizeSlider').value)), 100);
});
document.getElementById('sortShuffleBtn').addEventListener('click', () => {
    if (!sortRunning) {
        sortPaused = false;
        if (sortResumeResolve) { sortResumeResolve(); sortResumeResolve = null; }
        setSortBtn('start');
        genArray(parseInt(document.getElementById('sizeSlider').value));
    }
});
function applySortSize(v) {
    v = Math.min(120, Math.max(10, parseInt(v) || 10));
    document.getElementById('sizeSlider').value = v;
    document.getElementById('sizeInput').value = v;
    document.getElementById('sizeVal').textContent = v;
    if (!sortRunning) genArray(v);
}
function applySortSpeed(v) {
    v = Math.min(10, Math.max(1, parseInt(v) || 1));
    document.getElementById('speedSlider').value = v;
    document.getElementById('speedInput').value = v;
    sortDelay = Math.round(110 / v);
    document.getElementById('speedVal').textContent = '×' + v;
}
document.getElementById('sizeSlider').addEventListener('input', e => applySortSize(e.target.value));
document.getElementById('sizeInput').addEventListener('blur', e => applySortSize(e.target.value));
document.getElementById('sizeInput').addEventListener('keydown', e => { if (e.key === 'Enter') applySortSize(e.target.value); });
document.getElementById('speedSlider').addEventListener('input', e => applySortSpeed(e.target.value));
document.getElementById('speedInput').addEventListener('blur', e => applySortSpeed(e.target.value));
document.getElementById('speedInput').addEventListener('keydown', e => { if (e.key === 'Enter') applySortSpeed(e.target.value); });

// ═══════════════════════════════════════════════════════
// GRAPH ENGINE
// ═══════════════════════════════════════════════════════
const graphInfoMap = {
    bfs: '<strong>BFS</strong> — Parcours en largeur. Explore les voisins couche par couche via une file. Garantit le plus court chemin sur graphe non pondéré.',
    dfs: '<strong>DFS</strong> — Parcours en profondeur. Explore une branche jusqu\'au bout via une pile. Ne garantit pas le plus court chemin.',
    dijkstra: '<strong>Dijkstra</strong> — Plus court chemin sur graphe pondéré. File de priorité, explore les distances minimales. Optimal mais plus lent que BFS.',
    astar: '<strong>A*</strong> — Dijkstra + heuristique. Utilise la distance de Manhattan pour guider la recherche. Plus rapide que Dijkstra en pratique.',
};

const CELL = { EMPTY: 0, WALL: 1, START: 2, END: 3, VISITED: 4, FRONTIER: 5, PATH: 6 };

function initGrid() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(CELL.EMPTY));
    grid[startCell.r][startCell.c] = CELL.START;
    grid[endCell.r][endCell.c] = CELL.END;
    document.getElementById('nodesVisited').textContent = '0';
    document.getElementById('pathLen').textContent = '—';
    setGStatus('graphStatusDot', 'graphStatusMsg', '', 'Prêt — Dessine des murs puis clique Start');
    drawGrid();
}

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const wrap = canvas.parentElement;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    if (!grid.length) initGrid();
    else drawGrid();
}

function cellSize() {
    return { w: canvas.width / COLS, h: canvas.height / ROWS };
}

const DARK_COLORS = {
    [CELL.EMPTY]: '#111118', [CELL.WALL]: '#2a2a40',
    [CELL.START]: '#00cc6e', [CELL.END]: '#ff3366',
    [CELL.VISITED]: '#080c20', [CELL.FRONTIER]: '#200818', [CELL.PATH]: '#ffaa00',
};
const LIGHT_COLORS = {
    [CELL.EMPTY]: '#f0f2f5', [CELL.WALL]: '#9098b0',
    [CELL.START]: '#00aa55', [CELL.END]: '#d4003a',
    [CELL.VISITED]: '#dce4ff', [CELL.FRONTIER]: '#ffe0ea', [CELL.PATH]: '#ffcc44',
};
const DARK_BORDER = {
    [CELL.EMPTY]: '#1e1e2e', [CELL.WALL]: '#404060',
    [CELL.START]: '#00aa55', [CELL.END]: '#cc1144',
    [CELL.VISITED]: '#3344ff', [CELL.FRONTIER]: '#ff3366', [CELL.PATH]: '#cc8800',
};
const LIGHT_BORDER = {
    [CELL.EMPTY]: '#dde0e8', [CELL.WALL]: '#6670a0',
    [CELL.START]: '#007a44', [CELL.END]: '#aa0030',
    [CELL.VISITED]: '#1a2ecc', [CELL.FRONTIER]: '#d4003a', [CELL.PATH]: '#cc7700',
};
function getColors() { return document.documentElement.classList.contains('light') ? LIGHT_COLORS : DARK_COLORS; }
function getBorderColors() { return document.documentElement.classList.contains('light') ? LIGHT_BORDER : DARK_BORDER; }

function drawGrid() {
    if (!canvas.width || !grid.length) return;
    const isLight = document.documentElement.classList.contains('light');
    const COLORS = getColors();
    const { w, h } = cellSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const t = grid[r][c];
            ctx.fillStyle = COLORS[t] || (isLight ? '#f0f2f5' : '#111118');
            ctx.fillRect(c * w, r * h, w, h);
            // Glow for special cells
            if (t === CELL.START || t === CELL.END || t === CELL.PATH) {
                ctx.shadowColor = COLORS[t];
                ctx.shadowBlur = isLight ? 4 : 6;
                ctx.fillRect(c * w + 1, r * h + 1, w - 2, h - 2);
                ctx.shadowBlur = 0;
            }
            if (t === CELL.VISITED) {
                ctx.fillStyle = isLight ? 'rgba(26,46,204,0.15)' : 'rgba(0,80,160,0.4)';
                ctx.fillRect(c * w + 1, r * h + 1, w - 2, h - 2);
            }
            if (t === CELL.FRONTIER) {
                ctx.fillStyle = isLight ? 'rgba(212,0,58,0.15)' : 'rgba(180,0,255,0.5)';
                ctx.fillRect(c * w + 1, r * h + 1, w - 2, h - 2);
            }
            // Grid lines
            ctx.strokeStyle = isLight ? '#dde0e8' : '#131525';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(c * w, r * h, w, h);
        }
    }
}

function getCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const my = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    const { w, h } = cellSize();
    const c = Math.floor(mx / w), r = Math.floor(my / h);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
}

function isMobile() { return window.innerWidth <= 640; }

// ── Desktop mouse events ──────────────────────────────
canvas.addEventListener('mousedown', e => {
    if (graphRunning) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    if (e.shiftKey) {
        if (cell.r === startCell.r && cell.c === startCell.c) movingStart = true;
        else if (cell.r === endCell.r && cell.c === endCell.c) movingEnd = true;
        return;
    }
    isDrawing = true;
    const t = grid[cell.r][cell.c];
    drawMode = (t === CELL.WALL) ? 'erase' : 'wall';
    if (t !== CELL.START && t !== CELL.END) {
        grid[cell.r][cell.c] = drawMode === 'wall' ? CELL.WALL : CELL.EMPTY;
        drawGrid();
    }
});

canvas.addEventListener('mousemove', e => {
    if (graphRunning) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    if (movingStart) {
        grid[startCell.r][startCell.c] = CELL.EMPTY;
        startCell = { ...cell };
        grid[cell.r][cell.c] = CELL.START;
        drawGrid(); return;
    }
    if (movingEnd) {
        grid[endCell.r][endCell.c] = CELL.EMPTY;
        endCell = { ...cell };
        grid[cell.r][cell.c] = CELL.END;
        drawGrid(); return;
    }
    if (!isDrawing) return;
    if (grid[cell.r][cell.c] !== CELL.START && grid[cell.r][cell.c] !== CELL.END) {
        grid[cell.r][cell.c] = drawMode === 'wall' ? CELL.WALL : CELL.EMPTY;
        drawGrid();
    }
});

window.addEventListener('mouseup', () => { isDrawing = false; movingStart = false; movingEnd = false; });

// ── Mobile touch events with long press ──────────────
let lpTimer = null, lpCell = null, lpActive = false;
const lpRing = document.getElementById('lpRing');

function showLpRing(touch) {
    const rect = canvas.getBoundingClientRect();
    lpRing.style.left = (touch.clientX - rect.left) + 'px';
    lpRing.style.top = (touch.clientY - rect.top) + 'px';
    lpRing.classList.add('active');
}
function hideLpRing() { lpRing.classList.remove('active'); }

function startLongPress(e) {
    const touch = e.touches[0];
    lpCell = getCellFromEvent(e);
    if (!lpCell) return;
    const t = grid[lpCell.r][lpCell.c];
    // Long press only on start or end cells
    if (t !== CELL.START && t !== CELL.END) return;
    showLpRing(touch);
    lpTimer = setTimeout(() => {
        lpActive = true;
        hideLpRing();
        if (t === CELL.START) movingStart = true;
        else movingEnd = true;
        // Vibration tactile si supportée
        if (navigator.vibrate) navigator.vibrate(40);
    }, 500);
}

function cancelLongPress() {
    clearTimeout(lpTimer);
    lpTimer = null;
    hideLpRing();
}

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (graphRunning) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    lpActive = false;
    // Tente un long press
    startLongPress(e);
    // Commence à dessiner (annulé si long press déclenché)
    const t = grid[cell.r][cell.c];
    if (t !== CELL.START && t !== CELL.END) {
        drawMode = (t === CELL.WALL) ? 'erase' : 'wall';
        isDrawing = true;
        grid[cell.r][cell.c] = drawMode === 'wall' ? CELL.WALL : CELL.EMPTY;
        drawGrid();
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (graphRunning) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    // Si le doigt bouge pendant le long press, annuler
    if (lpTimer && !lpActive) {
        cancelLongPress();
    }
    // Déplacement départ/arrivée après long press
    if (movingStart) {
        grid[startCell.r][startCell.c] = CELL.EMPTY;
        startCell = { ...cell };
        grid[cell.r][cell.c] = CELL.START;
        drawGrid(); return;
    }
    if (movingEnd) {
        grid[endCell.r][endCell.c] = CELL.EMPTY;
        endCell = { ...cell };
        grid[cell.r][cell.c] = CELL.END;
        drawGrid(); return;
    }
    // Dessin de murs en glissant
    if (!isDrawing) return;
    if (grid[cell.r][cell.c] !== CELL.START && grid[cell.r][cell.c] !== CELL.END) {
        grid[cell.r][cell.c] = drawMode === 'wall' ? CELL.WALL : CELL.EMPTY;
        drawGrid();
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    cancelLongPress();
    isDrawing = false;
    movingStart = false;
    movingEnd = false;
    lpActive = false;
}, { passive: false });

// Graph algorithms helpers
const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
function isValid(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
function isPassable(r, c) { return grid[r][c] !== CELL.WALL && grid[r][c] !== CELL.START; }

async function reconstructPath(prev, end) {
    let cur = `${end.r},${end.c}`;
    let len = 0;
    while (prev[cur]) {
        const [r, c] = cur.split(',').map(Number);
        if (grid[r][c] !== CELL.END) grid[r][c] = CELL.PATH;
        cur = prev[cur]; len++;
        drawGrid();
        await graphSleep(graphDelay / 2);
    }
    return len;
}

// BFS
async function bfs() {
    const queue = [[startCell.r, startCell.c]];
    const visited = new Set([`${startCell.r},${startCell.c}`]);
    const prev = {};
    let nodesV = 0;
    while (queue.length && graphRunning) {
        const [r, c] = queue.shift(); nodesV++;
        document.getElementById('nodesVisited').textContent = nodesV;
        if (r === endCell.r && c === endCell.c) {
            const len = await reconstructPath(prev, endCell);
            document.getElementById('pathLen').textContent = len;
            return true;
        }
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            const key = `${nr},${nc}`;
            if (isValid(nr, nc) && !visited.has(key) && isPassable(nr, nc)) {
                visited.add(key); prev[key] = `${r},${c}`;
                if (!(nr === endCell.r && nc === endCell.c)) grid[nr][nc] = CELL.FRONTIER;
                queue.push([nr, nc]);
            }
        }
        if (grid[r][c] !== CELL.START && grid[r][c] !== CELL.END) grid[r][c] = CELL.VISITED;
        drawGrid();
        await graphSleep(graphDelay);
    }
    return false;
}

// DFS
async function dfs() {
    const stack = [[startCell.r, startCell.c]];
    const visited = new Set([`${startCell.r},${startCell.c}`]);
    const prev = {};
    let nodesV = 0;
    while (stack.length && graphRunning) {
        const [r, c] = stack.pop(); nodesV++;
        document.getElementById('nodesVisited').textContent = nodesV;
        if (r === endCell.r && c === endCell.c) {
            const len = await reconstructPath(prev, endCell);
            document.getElementById('pathLen').textContent = len;
            return true;
        }
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            const key = `${nr},${nc}`;
            if (isValid(nr, nc) && !visited.has(key) && isPassable(nr, nc)) {
                visited.add(key); prev[key] = `${r},${c}`;
                if (!(nr === endCell.r && nc === endCell.c)) grid[nr][nc] = CELL.FRONTIER;
                stack.push([nr, nc]);
            }
        }
        if (grid[r][c] !== CELL.START && grid[r][c] !== CELL.END) grid[r][c] = CELL.VISITED;
        drawGrid();
        await graphSleep(graphDelay);
    }
    return false;
}

// Priority Queue (min-heap)
class MinHeap {
    constructor() { this.h = []; }
    push(item) { this.h.push(item); this._up(this.h.length - 1); }
    pop() { const t = this.h[0]; const l = this.h.pop(); if (this.h.length) { this.h[0] = l; this._down(0); } return t; }
    get size() { return this.h.length; }
    _up(i) { while (i > 0) { const p = (i - 1) >> 1; if (this.h[p][0] > this.h[i][0]) { [this.h[p], this.h[i]] = [this.h[i], this.h[p]]; i = p; } else break; } }
    _down(i) { const n = this.h.length; while (true) { let s = i, l = 2 * i + 1, r = 2 * i + 2; if (l < n && this.h[l][0] < this.h[s][0]) s = l; if (r < n && this.h[r][0] < this.h[s][0]) s = r; if (s === i) break;[this.h[s], this.h[i]] = [this.h[i], this.h[s]]; i = s; } }
}

// Dijkstra
async function dijkstra() {
    const dist = {};
    const prev = {};
    const pq = new MinHeap();
    const key0 = `${startCell.r},${startCell.c}`;
    dist[key0] = 0; pq.push([0, startCell.r, startCell.c]);
    const settled = new Set();
    let nodesV = 0;
    while (pq.size && graphRunning) {
        const [d, r, c] = pq.pop();
        const key = `${r},${c}`;
        if (settled.has(key)) continue;
        settled.add(key); nodesV++;
        document.getElementById('nodesVisited').textContent = nodesV;
        if (r === endCell.r && c === endCell.c) {
            const len = await reconstructPath(prev, endCell);
            document.getElementById('pathLen').textContent = len;
            return true;
        }
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            const nk = `${nr},${nc}`;
            if (isValid(nr, nc) && isPassable(nr, nc)) {
                const nd = d + 1;
                if (nd < (dist[nk] || Infinity)) {
                    dist[nk] = nd; prev[nk] = key;
                    pq.push([nd, nr, nc]);
                    if (!(nr === endCell.r && nc === endCell.c)) grid[nr][nc] = CELL.FRONTIER;
                }
            }
        }
        if (grid[r][c] !== CELL.START && grid[r][c] !== CELL.END) grid[r][c] = CELL.VISITED;
        drawGrid();
        await graphSleep(graphDelay);
    }
    return false;
}

// A*
function heuristic(r, c) { return Math.abs(r - endCell.r) + Math.abs(c - endCell.c); }
async function astar() {
    const g = {}, f = {};
    const prev = {};
    const pq = new MinHeap();
    const key0 = `${startCell.r},${startCell.c}`;
    g[key0] = 0; f[key0] = heuristic(startCell.r, startCell.c);
    pq.push([f[key0], startCell.r, startCell.c]);
    const closed = new Set();
    let nodesV = 0;
    while (pq.size && graphRunning) {
        const [, r, c] = pq.pop();
        const key = `${r},${c}`;
        if (closed.has(key)) continue;
        closed.add(key); nodesV++;
        document.getElementById('nodesVisited').textContent = nodesV;
        if (r === endCell.r && c === endCell.c) {
            const len = await reconstructPath(prev, endCell);
            document.getElementById('pathLen').textContent = len;
            return true;
        }
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            const nk = `${nr},${nc}`;
            if (isValid(nr, nc) && isPassable(nr, nc) && !closed.has(nk)) {
                const ng = (g[key] || 0) + 1;
                if (ng < (g[nk] || Infinity)) {
                    g[nk] = ng; f[nk] = ng + heuristic(nr, nc);
                    prev[nk] = key;
                    pq.push([f[nk], nr, nc]);
                    if (!(nr === endCell.r && nc === endCell.c)) grid[nr][nc] = CELL.FRONTIER;
                }
            }
        }
        if (grid[r][c] !== CELL.START && grid[r][c] !== CELL.END) grid[r][c] = CELL.VISITED;
        drawGrid();
        await graphSleep(graphDelay);
    }
    return false;
}

async function runGraph() {
    graphRunning = true;
    graphPaused = false;
    setGraphBtn('start');
    document.getElementById('graphStartBtn').disabled = true;
    document.getElementById('graphResetBtn').disabled = true;
    document.getElementById('genMazeBtn').disabled = true;
    document.getElementById('graphStopBtn').disabled = false;
    setGStatus('graphStatusDot', 'graphStatusMsg', 'run', 'Recherche en cours…');
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
        if (grid[r][c] === CELL.VISITED || grid[r][c] === CELL.FRONTIER || grid[r][c] === CELL.PATH) grid[r][c] = CELL.EMPTY;
    drawGrid();
    const fns = { bfs, dfs, dijkstra, astar };
    const found = await fns[currentGAlgo]();
    if (graphRunning) {
        if (found) setGStatus('graphStatusDot', 'graphStatusMsg', 'done', 'Chemin trouvé !');
        else setGStatus('graphStatusDot', 'graphStatusMsg', '', 'Aucun chemin trouvé');
        graphPaused = false;
        setGraphBtn('start');
    }
    graphRunning = false;
    document.getElementById('graphStartBtn').disabled = false;
    document.getElementById('graphResetBtn').disabled = false;
    document.getElementById('genMazeBtn').disabled = false;
    document.getElementById('graphStopBtn').disabled = true;
}

function setGraphBtn(mode) {
    const btn = document.getElementById('graphStartBtn');
    if (mode === 'continue') {
        btn.textContent = '▶ Suite';
        btn.classList.remove('primary');
        btn.classList.add('continue');
    } else {
        btn.textContent = '▶ Start';
        btn.classList.remove('continue');
        btn.classList.add('primary');
    }
}

function graphResume() {
    graphPaused = false;
    graphRunning = true;
    setGraphBtn('start');
    document.getElementById('graphStartBtn').disabled = true;
    document.getElementById('graphResetBtn').disabled = true;
    document.getElementById('genMazeBtn').disabled = true;
    document.getElementById('graphStopBtn').disabled = false;
    setGStatus('graphStatusDot', 'graphStatusMsg', 'run', 'Reprise…');
    if (graphResumeResolve) { graphResumeResolve(); graphResumeResolve = null; }
}

// Recursive Division Maze
async function generateMaze() {
    if (graphRunning) return;

    // 1. Tout remplir de murs
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(CELL.WALL));
    drawGrid();
    await sleep(50);

    // 2. Recursive Backtracking (DFS) — on creuse des passages
    // On travaille sur les cellules impaires (1,1), (1,3), (3,1)... comme sommets du labyrinthe
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    // Départ sur une cellule impaire proche de startCell
    const sr = startCell.r % 2 === 0 ? startCell.r + 1 : startCell.r;
    const sc = startCell.c % 2 === 0 ? startCell.c + 1 : startCell.c;
    const clampedR = Math.min(Math.max(sr, 1), ROWS % 2 === 0 ? ROWS - 2 : ROWS - 2);
    const clampedC = Math.min(Math.max(sc, 1), COLS % 2 === 0 ? COLS - 2 : COLS - 2);

    // Stack iteratif pour éviter les débordements de pile sur grandes grilles
    const stack = [[clampedR, clampedC]];
    visited[clampedR][clampedC] = true;
    grid[clampedR][clampedC] = CELL.EMPTY;

    // Les 4 directions en sautant 2 cases (pour laisser un mur entre chaque cellule)
    const mazeDirs = [[-2, 0], [2, 0], [0, -2], [0, 2]];

    let steps = 0;
    while (stack.length) {
        const [r, c] = stack[stack.length - 1];

        // Cherche les voisins non visités
        const neighbors = [];
        for (const [dr, dc] of mazeDirs) {
            const nr = r + dr, nc = c + dc;
            if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && !visited[nr][nc]) {
                neighbors.push([nr, nc, r + dr / 2, c + dc / 2]); // voisin + mur à casser
            }
        }

        if (neighbors.length) {
            // Choisit un voisin au hasard
            const [nr, nc, wr, wc] = neighbors[Math.floor(Math.random() * neighbors.length)];
            visited[nr][nc] = true;
            grid[nr][nc] = CELL.EMPTY;   // creuse la cellule voisine
            grid[wr][wc] = CELL.EMPTY;   // creuse le mur entre les deux
            stack.push([nr, nc]);
        } else {
            stack.pop(); // impasse — on remonte
        }

        // Redessine périodiquement pour l'animation
        steps++;
        if (steps % 3 === 0) {
            drawGrid();
            await sleep(8);
        }
    }

    // 3. Remet le départ et l'arrivée
    // S'assure qu'ils tombent sur des cellules accessibles
    const fixCell = (cell) => {
        let { r, c } = cell;
        if (r % 2 === 0) r = Math.min(r + 1, ROWS - 2);
        if (c % 2 === 0) c = Math.min(c + 1, COLS - 2);
        return { r: Math.min(Math.max(r, 1), ROWS - 2), c: Math.min(Math.max(c, 1), COLS - 2) };
    };
    startCell = fixCell(startCell);
    endCell = fixCell(endCell);
    grid[startCell.r][startCell.c] = CELL.START;
    grid[endCell.r][endCell.c] = CELL.END;

    document.getElementById('nodesVisited').textContent = '0';
    document.getElementById('pathLen').textContent = '—';
    setGStatus('graphStatusDot', 'graphStatusMsg', '', 'Labyrinthe généré — Clique Start !');
    drawGrid();
}

// Graph controls
document.querySelectorAll('[data-galgo]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (graphRunning && !graphPaused) return;
        // Reset pause state if we were paused
        if (graphPaused) {
            graphPaused = false;
            if (graphResumeResolve) { graphResumeResolve(); graphResumeResolve = null; }
            setGraphBtn('start');
            document.getElementById('graphStopBtn').disabled = true;
            document.getElementById('graphResetBtn').disabled = false;
            document.getElementById('genMazeBtn').disabled = false;
            // Clear visited cells
            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
                if (grid[r][c] === CELL.VISITED || grid[r][c] === CELL.FRONTIER || grid[r][c] === CELL.PATH) grid[r][c] = CELL.EMPTY;
            drawGrid();
            setGStatus('graphStatusDot', 'graphStatusMsg', '', 'Prêt — Appuie sur Start');
        }
        document.querySelectorAll('[data-galgo]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGAlgo = btn.dataset.galgo;
        document.getElementById('graphInfo').innerHTML = graphInfoMap[currentGAlgo];
    });
});
document.getElementById('graphStartBtn').addEventListener('click', () => {
    if (graphPaused) graphResume();
    else if (!graphRunning) runGraph();
});
document.getElementById('graphStopBtn').addEventListener('click', () => {
    graphPaused = true;
    graphRunning = false;
    document.getElementById('graphStopBtn').disabled = true;
    document.getElementById('graphStartBtn').disabled = false;
    document.getElementById('graphResetBtn').disabled = false;
    document.getElementById('genMazeBtn').disabled = false;
    setGraphBtn('continue');
    setGStatus('graphStatusDot', 'graphStatusMsg', '', 'Arrêté — Suite ou Reset');
});
document.getElementById('graphResetBtn').addEventListener('click', () => {
    graphRunning = false; graphPaused = false;
    if (graphResumeResolve) { graphResumeResolve(); graphResumeResolve = null; }
    setGraphBtn('start');
    setTimeout(initGrid, 100);
});
document.getElementById('genMazeBtn').addEventListener('click', () => {
    graphRunning = false; graphPaused = false;
    if (graphResumeResolve) { graphResumeResolve(); graphResumeResolve = null; }
    setGraphBtn('start');
    generateMaze();
});
function applyGridSize(v) {
    v = Math.min(35, Math.max(10, parseInt(v) || 10));
    document.getElementById('gridSizeSlider').value = v;
    document.getElementById('gridSizeInput').value = v;
    document.getElementById('gridSizeVal').textContent = v;
    ROWS = COLS = v;
    startCell = { r: 1, c: 1 }; endCell = { r: ROWS - 2, c: COLS - 2 };
    initGrid();
}
function applyGraphSpeed(v) {
    v = Math.min(10, Math.max(1, parseInt(v) || 1));
    document.getElementById('gSpeedSlider').value = v;
    document.getElementById('gSpeedInput').value = v;
    graphDelay = Math.round(100 / v);
    document.getElementById('gSpeedVal').textContent = '×' + v;
}
document.getElementById('gridSizeSlider').addEventListener('input', e => applyGridSize(e.target.value));
document.getElementById('gridSizeInput').addEventListener('blur', e => applyGridSize(e.target.value));
document.getElementById('gridSizeInput').addEventListener('keydown', e => { if (e.key === 'Enter') applyGridSize(e.target.value); });
document.getElementById('gSpeedSlider').addEventListener('input', e => applyGraphSpeed(e.target.value));
document.getElementById('gSpeedInput').addEventListener('blur', e => applyGraphSpeed(e.target.value));
document.getElementById('gSpeedInput').addEventListener('keydown', e => { if (e.key === 'Enter') applyGraphSpeed(e.target.value); });

// ═══════════════════════════════════════════════════════
// INFO MODAL
// ═══════════════════════════════════════════════════════
const infoModal = document.getElementById('infoModal');
const modalContent = document.getElementById('modalContent');

function openModal(html) {
    modalContent.innerHTML = html;
    infoModal.classList.add('open');
}
function closeModal() {
    infoModal.classList.remove('open');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
infoModal.addEventListener('click', e => { if (e.target === infoModal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const slowAlgos = ['bubble', 'selection', 'insertion'];

function updateSortInfoBtns() {
    const isSlow = slowAlgos.includes(currentSortAlgo);
    document.getElementById('sortInfoBtn').style.opacity = isSlow ? '1' : '0.2';
    document.getElementById('sortInfoBtn2').style.opacity = isSlow ? '0.2' : '1';
}

document.getElementById('sortInfoBtn').addEventListener('click', () => {
    openModal(document.getElementById('sortInfo').innerHTML);
});
document.getElementById('sortInfoBtn2').addEventListener('click', () => {
    openModal(document.getElementById('sortInfo').innerHTML);
});
document.getElementById('graphInfoBtn').addEventListener('click', () => {
    openModal(document.getElementById('graphInfo').innerHTML);
});

// ═══════════════════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════════════════
document.getElementById('themeToggle').addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    document.getElementById('themeToggle').textContent = isLight ? '☾ Mode sombre' : '☀ Mode clair';
    drawGrid();
});

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
genArray(50);
updateSortInfoBtns();
sortDelay = Math.round(110 / 5);

// Pre-initialize grid so it's ready when user switches tab
initGrid();

window.addEventListener('resize', () => {
    if (document.getElementById('graphApp').classList.contains('visible')) {
        setTimeout(resizeCanvas, 50); // léger délai pour que le layout soit recalculé d'abord
    }
});
// Gère le changement d'orientation sur mobile
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (document.getElementById('graphApp').classList.contains('visible')) resizeCanvas();
    }, 200);
});