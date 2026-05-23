const speedInput = document.getElementById("speed-input");

const nodeSizeInput = document.getElementById("node-size-input");

const nodeMarginInput = document.getElementById("node-margin-input");

const distanceInput = document.getElementById("distance-input");

const directedInput = document.getElementById("directed-input");

const weightedInput = document.getElementById("weighted-input");

const manualInput = document.getElementById("manual-input");

const edgeListEdit = document.getElementById("edge-list-edit");

const displaySvg = document.getElementById("display-svg");

const exampleCountInput = document.getElementById("example-count-input");

const exampleTypeInput = document.getElementById("example-type-input");

var displayWidth = displaySvg.clientWidth;

var displayHeight = displaySvg.clientHeight;

var nodes = new Map();

var edges = new Map();

function onGraphSvgResize() {
	displayWidth = displaySvg.clientWidth || displaySvg.getBoundingClientRect().width;
	displayHeight = displaySvg.clientHeight || displaySvg.getBoundingClientRect().height;
}

function onUpdate() {
	for (const e of edges.values()) {
	 	e.gen = 0;
	}
	for (const i in nodes) {
		nodes[i].gen = 0;
	}
	const lines = edgeListEdit.value.trim().split('\n');
	for (const line of lines) {
		const [a, b, w] = line.trim().split(' ').map(Number);
		if (a == undefined || b == undefined) {
			continue;
		}
		addNode(a);
		addNode(b);
		addEdge(a, b, w);
	}
	for (const i in nodes) {
		if (nodes[i].gen == 0) {
			deleteNode(i);
			delete nodes[i];
		}
	}
	for (const [k, v] of edges.entries()) {
	 	if (v.gen == 0) {
			deleteEdge(v);
			edges.delete(k);
		}
	}
	undirectedEdges = [];
	unorderedNeighbors = {};
	const edgeMap = new Set();
	for (const e of edges.values()) {
		const key = Math.min(e.a, e.b) + '-' + Math.max(e.a, e.b);
		if (edgeMap.has(key)) {
			continue;
		}
		edgeMap.add(key);
		undirectedEdges.push(e);
		unorderedNeighbors[e.a] ??= [];
		unorderedNeighbors[e.a].push(e.b);
		unorderedNeighbors[e.b] ??= [];
		unorderedNeighbors[e.b].push(e.a);
	}
	const nodeCollection = Object.keys(nodes).map(Number);
	const planarEdges = undirectedEdges.map(e => [e.a, e.b]);
	planarOrdering = getPlanarOrdering(nodeCollection, planarEdges);
	dfsTreeHeights = [];
	dfsTreeParents = [];
	dfsTreeSizes = [];
	dfsEnterTimes = [];
	dfsLeaveTimes = [];
	dfsChildren = [];
	if (planarOrdering) {
		console.log(planarOrdering);
		let time = 1;
		function dfsTree(i) {
			dfsEnterTimes[i] = time;
			time++;
			dfsTreeSizes[i] = 1;
			for (const j of planarOrdering[i]) {
				if (dfsTreeHeights[j] != null) {
					continue;
				}
				dfsTreeHeights[j] = dfsTreeHeights[i] + 1;
				dfsTreeParents[j] = i;
				dfsTree(j);
				dfsTreeSizes[i] += dfsTreeSizes[j];
			}
			dfsLeaveTimes[i] = time;
			time++;
		}
		for (const i of nodeCollection) {
			if (dfsTreeHeights[i] != null) {
				continue;
			}
			dfsTreeHeights[i] = 0;
			dfsTree(i);
		}
		for (const i of nodeCollection) {
			dfsChildren[i] = planarOrdering[i].filter(j => dfsTreeHeights[j] == dfsTreeHeights[i] + 1);
		}
	}
}

function onRefresh() {
	for (const i in nodes) {
		deleteNode(i);
	}
	for (const e of edges.values()) {
	 	deleteEdge(e);
	}
	nodes = new Map();
	edges = new Map();
	onUpdate()
}

function deleteNode(i) {
	const node = nodes[i];
	for (const type in node.listeners) {
		node.svgElement.removeEventListener(type, node.listeners[type]);
	}
	for (const type in node.documentListeners) {
		document.removeEventListener(type, node.documentListeners[type]);
	}
	nodes[i].svgElement.remove();
}

function deleteEdge(e) {
	e.svgElement.group.remove();
	e.arrow.remove();
}

function replaceEdges(lines) {
	edgeListEdit.value = lines;
	onRefresh();
}

function onRandom() {
	updateInput();
	const n = clampValue(exampleCountInput);
	if (n <= 1) {
		replaceEdges("");
		return;
	}
	const type = exampleTypeInput.value;
	let edges = [];
	let filterEdges = true;
	if (type == "any") {
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				edges.push([i, j]);
			}
		}
	}
	if (type == "planar") {
		let faces = [[0, 1, 2]];
		edges = [[0, 1], [1, 2], [2, 0]];
		for (let i = 3; i < n; i++) {
			let faceIndex = randomInt(0, faces.length - 1);
			let [a, b, c] = faces[faceIndex];
			edges.push([i, a], [i, b], [i, c]);
			faces.splice(faceIndex, 1, [i, a, b], [i, b, c], [i, c, a]);
		}
	}
	if (type == "tree") {
		for (let i = 1; i < n; i++) {
			const p = randomInt(0, i - 1);
			edges.push([p, i]);
		}
		filterEdges = false;
	}
	for (let i = 0; i < edges.length; i++) {
		const j = randomInt(i, edges.length - 1);
		[edges[i], edges[j]] = [edges[j], edges[i]];
	}
	function partitionEdges() {
		const edgeMap = [];
		for (let i = 0; i < n; i++) {
			edgeMap[i] = [];
		}
		for (let i = 0; i < edges.length; i++) {
			const e = edges[i];
			edgeMap[e[0]].push([e[1], e]);
			edgeMap[e[1]].push([e[0], e]);
		}
		const v = new Set();
		const w = new Set();
		for (let i = 0; i < n; i++) {
			const b = Math.random() < 0.5;
			v.add(i);
			const a = edgeMap[i].find(p => v.has(p[0]) == b) ?? edgeMap[i].find(p => !w.has(p[1]));
			if (!a) {
				continue;
			}
			v.add(a[0]);
			w.add(a[1]);
		}
		const usedEdges = edges.filter(e => w.has(e));
		const otherEdges = edges.filter(e => !w.has(e));
		edges = usedEdges.concat(otherEdges);
		return randomInt(usedEdges.length, Math.ceil(n * 2.3));
	}
	const edgeCount = partitionEdges();
	if (filterEdges) {
		edges.length = Math.min(edges.length, edgeCount);
	}
	const directedEdges = [];
	function genLine(e) {
		const [a, b] = e;
		if (drawArrows) {
			if (Math.random() > 0.8) {
				directedEdges.push([a, b]);
				directedEdges.push([b, a]);
				return;
			}
			if (Math.random() > 0.5) {
				directedEdges.push([b, a]);
				return;
			}
		}
		directedEdges.push([a, b]);
	}
	edges.forEach(genLine);
	directedEdges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	let lines = "";
	for (const [a, b] of directedEdges) {
		lines += (a + 1) + " " + (b + 1) + (weightedEdges ? " " + randomInt(1, 9) : "") + "\n";
	}
	replaceEdges(lines);
}

function onApply() {
	globalSpeed = clampValue(speedInput);
	nodeRadius = Number(nodeSizeInput.value);
	nodeDistanceMin = Number(nodeMarginInput.value);
	nodeDistanceMin += nodeRadius * 2;
	springDistance = Number(distanceInput.value);
	springDistance += nodeRadius * 2;
	globalSpeed = Number(speedInput.value);
}

function init() {
	new ResizeObserver(function(entries) {
		onGraphSvgResize();
	}).observe(displaySvg);
	window.addEventListener("resize", onGraphSvgResize);
	const numericInputs = document.querySelectorAll('#toolbar input[type="number"]');
	numericInputs.forEach(input => {
		input.addEventListener('keydown', (e) => {
			if (e.key == 'Enter') {
				onApply();
			}
		});
		input.addEventListener('change', () => {
			onApply();
		});
	});
	nodesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
	edgesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
	displaySvg.appendChild(nodesLayer);
	displaySvg.appendChild(edgesLayer);
	draggingBackground = false;
	globalNodeOffset = new Vector();
	globalSpeed = 1;
	let lastX = 0;
	let lastY = 0;
	displaySvg.addEventListener("mousedown", (e) => {
		if (e.button != 0) {
			return;
		}
		draggingBackground = true;
		lastX = e.clientX;
		lastY = e.clientY;
		e.stopPropagation();
	});
	displaySvg.addEventListener("touchstart", (e) => {
		if (e.touches.length != 1) {
			return;
		}
		draggingBackground = true;
		lastX = e.touches[0].clientX;
		lastY = e.touches[0].clientY;
		e.stopPropagation();
	}, { passive: false });
	window.addEventListener("mousemove", (e) => {
		if (!draggingBackground) {
			return;
		}
		const dx = e.clientX - lastX;
		const dy = e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;
		if (manualInput.checked) {
			globalNodeOffset.x += dx;
			globalNodeOffset.y += dy;
		}
		else {
			for (const i in nodes) {
				nodes[i].p.x += dx;
				nodes[i].p.y += dy;
			}
		}
	});
	window.addEventListener("touchmove", (e) => {
		if (!draggingBackground || e.touches.length != 1) {
			return;
		}
		const dx = e.touches[0].clientX - lastX;
		const dy = e.touches[0].clientY - lastY;
		lastX = e.touches[0].clientX;
		lastY = e.touches[0].clientY;
		if (manualInput.checked) {
			globalNodeOffset.x += dx;
			globalNodeOffset.y += dy;
		}
		else {
			for (const i in nodes) {
				nodes[i].p.x += dx;
				nodes[i].p.y += dy;
			}
		}
		e.preventDefault();
	}, { passive: false });
	window.addEventListener("mouseup", () => {
		draggingBackground = false;
	});
	window.addEventListener("touchend", () => {
		draggingBackground = false;
	});
	canvasContext = document.createElement('canvas').getContext('2d');
	const displayStyle = window.getComputedStyle(displaySvg);
	displayFont = displayStyle.fontFamily;
	canvasFontProperty = "";
	untanglerForce = 1000;
	onApply();
	onUpdate();
	update();
}

function updateInput() {
	drawArrows = directedInput.checked;
	weightedEdges = weightedInput.checked;
}

function getBounds(element) {
	const style = window.getComputedStyle(element);
	const fontSize = element.attributeCache["font-size"] ?? "1";
	const newFont = `${fontSize}px ${displayFont}`;
	if (canvasFontProperty != newFont) {
		canvasFontProperty = newFont;
		canvasContext.font = newFont;
	}
	const m = canvasContext.measureText(element.textContent);
	const w = m.width + 2, h = parseFloat(fontSize);
	return { width: w, height: h };
}

function update() {
	updateInput();
	requestAnimationFrame(update);
	for (const i in nodes) {
		const position = nodes[i].p.add(globalNodeOffset);
		nodes[i].svgElement.setAttribute("transform", `translate(${position.x}, ${position.y})`);
		setNodeRadius(nodes[i].svgElement, nodeRadius);
	}
	for (const e of edges.values()) {
		const a = e.a;
		const b = e.b;
		const elem = e.svgElement;
		const v = nodes[b].p.sub(nodes[a].p);
		if (v.len() <= nodeRadius * 2) {
			setAttributeCache(elem.group, "visibility", "hidden");
			setAttributeCache(e.arrow, "visibility", "hidden");
			setAttributeCache(elem.text, "visibility", "hidden");
			continue;
		}
		setAttributeCache(elem.group, "visibility", "visible");
		setAttributeCache(elem.text, "visibility", weightedEdges ? "visible" : "hidden");
		const d = v.norm();
		const start = nodes[a].p.add(d.mul(nodeRadius)).add(globalNodeOffset);
		const end = nodes[b].p.sub(d.mul(nodeRadius)).add(globalNodeOffset);
		const x1 = start.x;
		const y1 = start.y;
		const x2 = end.x;
		const y2 = end.y;
		const scale = Math.min(Math.max(0, (v.len() - nodeRadius * 2) * 5 / 6), nodeRadius) / 20;
		const dx = x2 - x1;
		const dy = y2 - y1;
		const bbox = getBounds(elem.text);
		const len = Math.hypot(dx, dy) || 1;
		const ux = dx / len;
		const uy = dy / len;
		const dot = Math.abs(ux) * (bbox.width / 2) + Math.abs(uy) * (bbox.height / 2);
		const arrowRadius = 10 * scale;
		const minEndDistance = arrowRadius + dot;
		const distance = Math.max(len / 3, Math.min(drawArrows ? len * 2 / 3 : len * 0.5, len - minEndDistance));
		const lerp = distance / len;
		const mx = x1 + dx * lerp;
		const my = y1 + dy * lerp;
		const nx = -dy / len;
		const ny = dx / len;
		const halfExtent = Math.abs(nx) * (bbox.width / 2) + Math.abs(ny) * (bbox.height / 2);
		const offset = halfExtent + nodeRadius / 10;
		elem.line.setAttribute("x1", start.x);
		elem.line.setAttribute("y1", start.y);
		if (drawArrows) {
			elem.line.setAttribute("x2", end.x - ny * scale * 7);
			elem.line.setAttribute("y2", end.y + nx * scale * 7);
		}
		else {
			elem.line.setAttribute("x2", end.x);
			elem.line.setAttribute("y2", end.y);
		}
		const w = e.weight ?? "";
		if (elem.textStringContent != w) {
			elem.textStringContent = w;
			elem.text.textContent = w;
		}
		setAttributeCache(elem.text, "font-size", nodeRadius / 2);
		setAttributeCache(elem.line, "stroke-width", Math.min(nodeRadius / 25, scale * 3.5));
		elem.text.setAttribute("x", mx - nx * offset);
		elem.text.setAttribute("y", my - ny * offset);
		e.arrow.setAttribute("transform", `translate(${end.x}, ${end.y}) rotate(${Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI - 90}) scale(${scale})`);
		e.arrow.setAttribute("visibility", drawArrows ? "visible" : "hidden");
	}
	if (draggingBackground) {
		return;
	}
	const manualMode = manualInput.checked;
	const speed = globalSpeed;
	if (manualMode || speed <= 0) {
		const minDistance = nodeDistanceMin;
		for (const a in nodes) {
			for (const b in nodes) {
				if (b <= a) {
					continue;
				}
				const d = nodes[b].p.sub(nodes[a].p);
				const l = d.len();
				if (l >= minDistance) {
					continue;
				}
				const v = d.norm().mul(minDistance - l);
				if (!nodes[a].dragging && !nodes[a].fixed) {
					nodes[a].p = nodes[a].p.add(v.div(-2));
				}
				if (!nodes[b].dragging && !nodes[b].fixed) {
					nodes[b].p = nodes[b].p.add(v.div(2));
				}
			}
		}
		return;
	}
	const dt = speed;
	const subSteps = Math.ceil(dt);
	const stepSize = dt / subSteps;
	const edgeArray = Array.from(undirectedEdges);
	for (const i in nodes) {
		const e = new Edge(i, i, 0, true);
		edgeArray.push(e);
	}
	for (let s = 0; s < subSteps; s++) {
		let nodeCount = 0;
		for (const i in nodes) {
			nodeCount++;
			nodes[i].a = new Vector();
			nodes[i].ac = 0;
			nodes[i].allowEdges = new Set();
			nodes[i].blockEdges = new Set();
		}
		function applyImpulse(i, impulse) {
			if (!nodes[i].dragging && !nodes[i].fixed) {
				nodes[i].a = nodes[i].a.add(impulse);
				nodes[i].ac++;
			}
		}
		function finalizeImpulses() {
			for (const i in nodes) {
				nodes[i].v = nodes[i].v.add(nodes[i].a.mul(stepSize / nodes[i].ac));
				nodes[i].ac = 0;
			}
			for (const i in nodes) {
				const l = nodes[i].v.len();
				const limit = nodeRadius * 0.7;
				if (l > limit) {
					nodes[i].v = nodes[i].v.mul(limit / l);
				}
			}
		}
		{
			const center = new Vector(0, 0);
			for (const i in nodes) {
				center.x += nodes[i].p.x;
				center.y += nodes[i].p.y;
			}
			center.x /= nodeCount;
			center.y /= nodeCount;
			const displayCenter = new Vector(displayWidth / 2, displayHeight / 2);
			for (const i in nodes) {
				const dir = displayCenter.sub(center);
				const distance = dir.len();
				const width2 = displayWidth * displayWidth;
				const height2 = displayHeight * displayHeight;
				const denom = width2 + height2;
				const error = new Vector(dir.x * height2 / denom, dir.y * width2 / denom);
				for (const k of ['x', 'y']) {
					const e = new Vector();
					e[k] = error[k];
					const l = Math.abs(error[k]);
					if (l > 1e-3) {
						const n = e.div(l);
						const tv = l * 0.1;
						const rv = n.dot(nodes[i].v);
						const impulse = n.mul(tv - rv);
						applyImpulse(i, impulse);
					}
				}
			}
		}
		for (const i in nodes) {
			const displayCenter = new Vector(displayWidth / 2, displayHeight / 2);
			const dir = displayCenter.sub(nodes[i].p)
			const width2 = displayWidth * displayWidth;
			const height2 = displayHeight * displayHeight;
			const denom = width2 + height2;
			const error = new Vector(dir.x * height2 / denom, dir.y * width2 / denom);
			const n = dir.norm();
			const tv = error.mul(0.05);
			const rv = n.mul(n.dot(nodes[i].v));
			const impulse = tv.sub(rv);
			applyImpulse(i, impulse);
		}
		for (const e of undirectedEdges) {
			const a = e.a;
			const b = e.b;
			const d = nodes[b].p.sub(nodes[a].p);
			const l = d.len();
			if (l > 1e-3) {
				const n = d.div(l);
				const error = n.mul(springDistance - l);
				if (springDistance > l) {
					const tv = error.mul(0.2);
					const rv = n.mul(n.dot(nodes[b].v.sub(nodes[a].v)));
					const impulse = tv.sub(rv).mul(0.5);
					applyImpulse(a, impulse.neg());
					applyImpulse(b, impulse);
				}
			}
		}
		const edgePoints = new Float64Array(edgeArray.length * 4);
		const edgeNodes = new Float64Array(edgeArray.length * 2);
		for (let i = 0; i < edgeArray.length; i++) {
			const e = edgeArray[i];
			edgePoints[i * 4 + 0] = nodes[e.a].p.x;
			edgePoints[i * 4 + 1] = nodes[e.a].p.y;
			edgePoints[i * 4 + 2] = nodes[e.b].p.x;
			edgePoints[i * 4 + 3] = nodes[e.b].p.y;
			edgeNodes[i * 2 + 0] = Number(e.a);
			edgeNodes[i * 2 + 1] = Number(e.b);
		}
		const edgeContacts = [];
		const edgeIntersections = [];
		for (let i = 0; i < edgeArray.length; i++) {
			const x1 = edgePoints[i * 4 + 0], y1 = edgePoints[i * 4 + 1];
			const x2 = edgePoints[i * 4 + 2], y2 = edgePoints[i * 4 + 3];
			const na1 = edgeNodes[i * 2 + 0], nb1 = edgeNodes[i * 2 + 1];
			for (let j = i + 1; j < edgeArray.length; j++) {
				const na2 = edgeNodes[j * 2 + 0];
				if (na1 == na2 || nb1 == na2) {
					continue;
				}
				const nb2 = edgeNodes[j * 2 + 1];
				if (na1 == nb2 || nb1 == nb2) {
					continue;
				}
				let dx, dy, lsq, s, t;
				{
					const x3 = edgePoints[j * 4 + 0], y3 = edgePoints[j * 4 + 1];
					const x4 = edgePoints[j * 4 + 2], y4 = edgePoints[j * 4 + 3];
					const ux = x2 - x1;
					const uy = y2 - y1;
					const vx = x4 - x3;
					const vy = y4 - y3;
					const wx = x1 - x3;
					const wy = y1 - y3;
					const a = ux * ux + uy * uy;
					const b = ux * vx + uy * vy;
					const c = vx * vx + vy * vy;
					const D = a * c - b * b;
					const E = 1e-6;
					if (D < E) {
						if (a < E && c < E) {
							s = 0;
							t = 0;
						}
						else if (a < E) {
							s = 0;
							t = ((x1 - x3) * vx + (y1 - y3) * vy) / c;
							if (t < 0) {
								t = 0;
							}
							if (t > 1) {
								t = 1;
							}
						}
						else if (c < E) {
							s = ((x3 - x1) * ux + (y3 - y1) * uy) / a;
							t = 0;
							if (s < 0) {
								s = 0;
							}
							if (s > 1) {
								s = 1;
							}
						}
						else {
							continue;
						}
					}
					else {
						const d = ux * wx + uy * wy;
						const e = vx * wx + vy * wy;
						const invD = 1 / D;
						s = (b * e - c * d) * invD;
						t = (a * e - b * d) * invD;
						if (s < 0) {
							s = 0;
							t = (s * b + e) / c;
						}
						if (s > 1) {
							s = 1;
							t = (s * b + e) / c;
						}
						if (t < 0) {
							t = 0;
							s = (t * b - d) / a;
							if (s < 0) {
								s = 0;
							}
							if (s > 1) {
								s = 1;
							}
						}
						if (t > 1) {
							t = 1;
							s = (t * b - d) / a;
							if (s < 0) {
								s = 0;
							}
							if (s > 1) {
								s = 1;
							}
						}
					}
					dx = (x3 + vx * t) - (x1 + ux * s);
					dy = (y3 + vy * t) - (y1 + uy * s);
					lsq = dx * dx + dy * dy;
					if (lsq >= nodeDistanceMin * nodeDistanceMin) {
						continue;
					}
				}
				const e1 = edgeArray[i];
				const e2 = edgeArray[j];
				if (lsq < 1e-6 && na1 != nb1 && na2 != nb2) {
					const entry = [e1, e2, s, t];
					edgeIntersections.push(entry);
				}
				else {
					const entry = [e1, e2, dx, dy, lsq, s, t];
					edgeContacts.push(entry);
				}
			}
		}
		function getNormal(a, b) {
			return nodes[b].p.sub(nodes[a].p).norm().left();
		}
		function getDirectedNormal(a, b, i) {
			const n = nodes[b].p.sub(nodes[a].p).norm().left();
			const d = nodes[i].p.sub(nodes[a].p).dot(n);
			const s = Math.sign(d);
			return n.mul(s);
		}
		function isDescent(u, v) {
			return dfsEnterTimes[u] <= dfsEnterTimes[v] && dfsLeaveTimes[u] >= dfsLeaveTimes[v];
		}
		function getChildTowards(p, target) {
			if (p == target) {
				return target;
			}
			const children = dfsChildren[p];
			const targetTime = dfsEnterTimes[target];
			let low = 0;
			let high = children.length - 1;
			while (low <= high) {
				const mid = (low + high) >> 1;
				const child = children[mid];
				if (dfsEnterTimes[child] <= targetTime && dfsLeaveTimes[child] >= targetTime) {
					if (dfsTreeHeights[child] == dfsTreeHeights[p] + 1) {
						return child;
					}
					break;
				}
				if (dfsEnterTimes[child] > targetTime) {
					high = mid - 1;
				}
				else {
					low = mid + 1;
				}
			}
			return target;
		}
		function orientEdge(a, b) {
			if (dfsTreeHeights[b] < dfsTreeHeights[a]) {
				[a, b] = [b, a];
			}
			if (dfsTreeHeights[b] != dfsTreeHeights[a] + 1) {
				[a, b] = [b, a];
			}
			return [a, b];
		}
		collisionSet = new Set();
		
		{ // SLOP
			function isAncestor(u, v) {
        return dfsEnterTimes[u] <= dfsEnterTimes[v] && dfsLeaveTimes[u] >= dfsLeaveTimes[v];
			}

			
			
			// Helper: Find LCA of two nodes
			function getHCA(u, v) {
					let curr = u;
					while (curr != null) {
							if (isAncestor(curr, v)) return { p: curr, c1: getChildTowards(curr,u),c2:getChildTowards(curr,v) };
							// Find parent in DFS tree (node with height H-1 connected to curr)
							let parent = null;
							for (const neighbor of planarOrdering[curr]) {
									if (dfsTreeHeights[neighbor] === dfsTreeHeights[curr] - 1 && isAncestor(neighbor, curr)) {
											parent = neighbor;
											break;
									}
							}
							curr = parent;
					}
					return null;
			}
		}
		
		function getExpectedSide(a, b1, b2, b3) {
			const neighbors = planarOrdering[a];
			const index1 = neighbors.indexOf(b1);
			const index2 = neighbors.indexOf(b2);
			const index3 = neighbors.indexOf(b3);
			const s2 = (index2 - index1 + neighbors.length) % neighbors.length;
			const s3 = (index3 - index1 + neighbors.length) % neighbors.length;
			return s2 < s3;
		}
		function getActualSide(a, b1, b2, b3) {
			const p = nodes[a].p;
			const v1 = nodes[b1].p.sub(p);
			const v2 = nodes[b2].p.sub(p);
			const v3 = nodes[b3].p.sub(p);
			const c12 = v1.cross(v2);
			const c23 = v2.cross(v3);
			const c13 = v1.cross(v3);
			if (c13 > 0) {
				return c12 <= 0 || c23 <= 0;
			}
			else {
				return c12 <= 0 && c23 <= 0;
			}
		}
		function isRotationCorrect(center, p1, p2, p3) {
			const actualSide = getActualSide(center, p1, p2, p3);
			const expectedSide = getExpectedSide(center, p1, p2, p3);
			return actualSide == expectedSide;
		}
		function moveThroughEdge(i, e1, e2) {
			nodes[i].allowEdges.add(e2);
			nodes[e2.a].blockEdges.add(e1);
			nodes[e2.b].blockEdges.add(e1);
		}
		function setMovingNode(e1, e2, n) {
			const move1 = nodes[e1.a].p.sub(nodes[e2.a].p).dot(n) > 0;
			const node = move1 ? e1.a : e1.b;
			moveThroughEdge(node, e1, e2);
		}
		function getDirection(e1, e2) {
			const [a1, b1] = orientEdge(e1.a, e1.b);
			const [a2, b2] = orientEdge(e2.a, e2.b);
			const t1 = dfsTreeHeights[a1] + 1 == dfsTreeHeights[b1];
			const t2 = dfsTreeHeights[a2] + 1 == dfsTreeHeights[b2];
			if (t1 && t2) {
				if (isDescent(b1, a2)) {
					moveThroughEdge(b2, e2, e1);
					const n = getDirectedNormal(a1, b1, a2);
					return n;
				}
				if (isDescent(b2, a1)) {
					moveThroughEdge(b1, e1, e2);
					const n = getDirectedNormal(a2, b2, b1);
					return n;
				}
				const hca = getHCA(b1, b2);
				if (hca != null) {
					const root = dfsTreeParents[hca.p];
					if (root == null) {
						nodes[b1].allowEdges.add(e2);
						nodes[b2].allowEdges.add(e1);
						nodes[a1].blockEdges.add(e2);
						nodes[a2].blockEdges.add(e1);
						const n1 = getDirectedNormal(a1, b1, b2);
						const n2 = getDirectedNormal(a2, b2, b1);
						return n2.sub(n1);
					}
					const actualSide = getActualSide(hca.p, root, hca.c1, hca.c2);
					const expectedSide = getExpectedSide(hca.p, root, hca.c1, hca.c2);
					const difference = expectedSide != actualSide;
					let n1 = getNormal(a1, b1);
					let n2 = getNormal(a2, b2);
					if (expectedSide) {
						n1 = n1.neg();
						n2 = n2.neg();
					}
					let move1 = nodes[a1].p.sub(nodes[a2].p).dot(n2) > 0;
					let move2 = nodes[a2].p.sub(nodes[a1].p).dot(n1) < 0;
					if (move1 && !difference) {
						move1 = false;
						n2 = n2.neg();
					}
					if (move2 && !difference) {
						move2 = false;
						n1 = n1.neg();
					}
					let error = new Vector(0, 0);
					if (!move1 || a1 != hca.p) {
						const node = move1 ? a1 : b1;
						moveThroughEdge(node, e1, e2);
						error = error.add(n2);
					}
					if (!move2 || a2 != hca.p) {
						const node = move2 ? a2 : b2;
						moveThroughEdge(node, e2, e1);
						error = error.add(n1);
					}
					return error;
				}
			}
			else if (t1) {
				return new Vector(0, 0); // SKIP
				if (isDescent(a2, a1)) {
					const root = dfsTreeParents[a2];
					const child = getChildTowards(a2, a1);
					const actualSide = getActualSide(a2, root, child, b2);
					const expectedSide = getExpectedSide(a2, root, child, b2);
					const difference = expectedSide != actualSide;
					const node = difference ? a1 : b1;
					moveThroughEdge(node, e1, e2);
					let n = getDirectedNormal(a2, b2, node);
					return n;
				}
				if (isDescent(b2, a1)) {
					const root = dfsTreeParents[b2];
					if (root == null) {
						moveThroughEdge(b1, e1, e2);
						return getDirectedNormal(a2, b2, b1);
					}
					let outside;
					{
						const hca = getHCA(a1, a2);
						const root = dfsTreeParents[hca.p];
						outside = getActualSide(hca.p, hca.c1, hca.c2, root);
					}
					if (outside) {
						moveThroughEdge(b1, e1, e2);
						return getDirectedNormal(a2, b2, b1);
					}
					const child = getChildTowards(b2, a1);
					const difference = isRotationCorrect(b2, root, child, a2);
					const node = difference ? a1 : b1;
					moveThroughEdge(node, e1, e2);
					let n = getDirectedNormal(a2, b2, node);
					return n;
				}
				const root = dfsTreeParents[b2];
				if (root == null) {
					moveThroughEdge(b1, e1, e2);
					return getDirectedNormal(a2, b2, b1);
				}
				const ancestorEdge = isDescent(b1, b2);
				let node;
				if (ancestorEdge) {
					node = a1;
				}
				else {
					const child = getChildTowards(b2, a2);
					const actualSide = getActualSide(b2, root, child, a2);
					const expectedSide = getExpectedSide(b2, root, child, a2);
					const difference = expectedSide != actualSide;
					node = difference ? a1 : b1;
				}
				moveThroughEdge(node, e1, e2);
				let n = getDirectedNormal(a2, b2, node);
				return n;
			}
			else if (t2) {
				const error = getDirection(e2, e1);
				return error.neg();
			}
			else {
				if (isDescent(b1, b2)) {
					const hca = getHCA(a1, a2);
					const center = hca.p;
					if (!isDescent(b2, center)) {
						return new Vector(0, 0);
					}
					const d1 = (center == a1) ? b1 : hca.c1;
					const d2 = (center == a2) ? b2 : hca.c2;
					const d3 = dfsTreeParents[center];
					const correctA = isRotationCorrect(center, d1, d2, d3);
					let correctB = true;
					if (center != b2) {
						const p1 = getChildTowards(b2, center);
						const p2 = dfsTreeParents[b2];
						correctB = isRotationCorrect(b2, a2, p1, p2);
					}
					let correctC = true;
					const root = dfsTreeParents[b1];
					if (root != null) {
						const child = getChildTowards(b1, b2);
						correctC = isRotationCorrect(b1, root, child, a1);
					}
					if (correctC) {
						if (!correctA) {
							moveThroughEdge(a2, e2, e1);
							return getDirectedNormal(a1, b1, b2);
						}
						if (!correctB) {
							moveThroughEdge(a1, e1, e2);
							return getDirectedNormal(a2, b2, a1);
						}
					}
					else {
						moveThroughEdge(b2, e2, e1);
						return getDirectedNormal(a1, b1, a2);
					}
				}
				else if (isDescent(b2, b1)) {
					const error = getDirection(e2, e1);
					return error.neg();
				}
				return new Vector(0, 0);
			}
			const n = getNormal(a2, b2);
			setMovingNode(e1, e2, n);
			return n;
		}
		function applyEdgeImpulse(e1, e2, s, t, error) {
			const r = error.len();
			if (r < 1e-3) {
				return;
			}
			const n = error.div(r);
			const v1 = nodes[e1.a].v.mul(1 - s).add(nodes[e1.b].v.mul(s));
			const v2 = nodes[e2.a].v.mul(1 - t).add(nodes[e2.b].v.mul(t));
			const dv = v2.sub(v1);
			const da = r - n.dot(dv);
			if (da <= 0) {
				return;
			}
			const impulse = n.mul(da * 0.5);
			applyImpulse(e1.a, impulse.mul(-1 + s));
			applyImpulse(e1.b, impulse.mul(-s));
			applyImpulse(e2.a, impulse.mul(1 - t));
			applyImpulse(e2.b, impulse.mul(t));
		}
		for (let [e1, e2, s, t] of edgeIntersections) {
			let error = getDirection(e1, e2);
			if (error.x != 0 || error.y != 0) {
				collisionSet.add(e1.a + "-" + e1.b + " x " + e2.a + "-" + e2.b + " : " + error.x.toFixed(2) + "," + error.y.toFixed(2));
			}
			error = error.mul(5000);
			applyEdgeImpulse(e1, e2, s, t, error);
		}
		for (let [e1, e2, dx, dy, lsq, s, t] of edgeContacts) {
			const d = new Vector(dx, dy);
			const l = Math.sqrt(lsq);
			const error = d.mul(nodeDistanceMin / l - 1);
			applyEdgeImpulse(e1, e2, s, t, error);
		}
		for (const u in nodes) {
			break; //!!!!
			const nb = adj[u];
			const n = nb.length;
			if (n < 3) {
				continue;
			}
			const a = new Array(n);
			for (let i = 0; i < n; i++) {
				a[i] = i;
			}
			a.sort((i, j) => {
				const p0 = nodes[u].p;
				const p1 = nodes[nb[i]].p;
				const p2 = nodes[nb[j]].p;
				const angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
				const angle2 = Math.atan2(p2.y - p0.y, p2.x - p0.x);
				return angle1 - angle2;
			});
			for (let i = 0; i < n; i++) {
				let j = (i + 1) % n;
				const currentIndex = a[i];
				const nextIndex = a[j];
				const expectedNext = (currentIndex + j - i + n) % n;
				if (nextIndex != expectedNext) {
					const force = 5 * -Math.sign(currentIndex - nextIndex);
					const v1 = nb[currentIndex];
					const v2 = nb[nextIndex];
					const dx1 = nodes[v1].p.x - nodes[u].p.x;
					const dy1 = nodes[v1].p.y - nodes[u].p.y;
					const dx2 = nodes[v2].p.x - nodes[u].p.x;
					const dy2 = nodes[v2].p.y - nodes[u].p.y;
					const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) + 1e-6;
					const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 1e-6;
					const tx1 = -dy1 / d1, ty1 = dx1 / d1;
					const tx2 = -dy2 / d2, ty2 = dx2 / d2;
					const rv1 = ((nodes[v1].v.x - nodes[u].v.x) * tx1 + (nodes[v1].v.y - nodes[u].v.y) * ty1) / d1;
					const rv2 = ((nodes[v2].v.x - nodes[u].v.x) * tx2 + (nodes[v2].v.y - nodes[u].v.y) * ty2) / d2;
					const rv = rv2 - rv1;
					const da = (force / n) - rv; 
					const l = da * 0.5;
					const imp1 = new Vector(tx1 * -l * d1, ty1 * -l * d1);
					const imp2 = new Vector(tx2 * l * d2, ty2 * l * d2);
					applyImpulse(v1, imp1);
					applyImpulse(v2, imp2);
					applyImpulse(u, imp1.add(imp2).neg());
				}
			}
		}
		finalizeImpulses();
		for (const i in nodes) {
			if (!nodes[i].dragging && !nodes[i].fixed) {
				nodes[i].p = nodes[i].p.add(nodes[i].v.mul(stepSize));
			}
		}
	}
}

function getRandomPosition() {
	const m = displayWidth / 4;
	return new Vector(randomInt(m, displayWidth - m), randomInt(displayHeight / 4, displayHeight * 3 / 4));
}

function addNode(i) {
	if (!nodes[i]) {
		const p = getRandomPosition();
		nodes[i] = new Node(p.x, p.y, i);
	}
	nodes[i].gen = 1;
}

function addEdge(a, b, w) {
	const k = a + "-" + b;
	const e = edges.get(k);
	if (e) {
		e.weight = w;
		e.gen = 1;
	}
	else {
		edges.set(k, new Edge(a, b, w));
	}
}

function clampValue(numericInput) {
	const min = parseFloat(numericInput.getAttribute('min')) ?? -Infinity;
	const max = parseFloat(numericInput.getAttribute('max')) ?? Infinity;
	let value = parseFloat(numericInput.value);
	if (isNaN(value)) {
		value = 0;
	}
	value = Math.max(min, Math.min(max, value));
	if (numericInput.value != value) {
		numericInput.value = value;
	}
	return value;
}

function setAttributeCache(e, attribute, value) {
	e.attributeCache ??= {};
	if (e.attributeCache[attribute] != value) {
		e.attributeCache[attribute] = value;
		e.setAttribute(attribute, value);
	}
}

function setNodeRadius(group, radius) {
	const circle = group.querySelector("circle");
	const text = group.querySelector("text");
	setAttributeCache(circle, "r", radius);
	setAttributeCache(circle, "stroke-width", radius / 25);
	setAttributeCache(text, "font-size", radius * 0.8);
}

function createSvgNode(x, y, i) {
	const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
	setAttributeCache(group, "transform", `translate(${x}, ${y})`);
	const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	setAttributeCache(circle, "cx", 0);
	setAttributeCache(circle, "cy", 0);
	setAttributeCache(circle, "r", nodeRadius);
	setAttributeCache(circle, "fill", "lightgray");
	setAttributeCache(circle, "stroke", "black");
	setAttributeCache(circle, "stroke-width", 1);
	group.appendChild(circle);
	const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
	setAttributeCache(text, "cx", 0);
	setAttributeCache(text, "cy", 0);
	setAttributeCache(text, "text-anchor", "middle");
	setAttributeCache(text, "dy", "0.35em");
	setAttributeCache(text, "fill", "black");
	text.textContent = i;
	group.appendChild(text);
	nodesLayer.appendChild(group);
	return group;
}

function createSvgEdge() {
	const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	setAttributeCache(line, "stroke", "black");
	setAttributeCache(line, "stroke-width", 1);
	const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
	setAttributeCache(text, "text-anchor", "middle");
	setAttributeCache(text, "fill", "black");
	setAttributeCache(text, "dy", "0.35em");
	setAttributeCache(text, "text-rendering", "geometricPrecision");
	text.textContent = "0.0\n";
	group.appendChild(line);
	group.appendChild(text);
	edgesLayer.appendChild(group);
	return { group, line, text };
}

function createSvgArrow() {
	const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
	setAttributeCache(arrow, "fill", "black");
	setAttributeCache(arrow, "d", "M-7,-10 L0,0 L7,-10 Z");
	edgesLayer.appendChild(arrow);
	return arrow;
}

function Node(x, y, i) {
	this.p = new Vector(x, y);
	this.v = new Vector();
	this.a = new Vector();
	this.fixed = false;
	this.dragging = false;
	this.grabOffset = new Vector();
	this.svgElement = createSvgNode(this.p.x, this.p.y, i);
	this.listeners = {};
	this.documentListeners = {};
	this.listeners["mousedown"] = e => {
		this.dragging = true;
		this.grabOffset = this.p.sub(new Vector(e.clientX, e.clientY));
		document.body.style.cursor = "grabbing\n";
		e.stopPropagation();
	};
	this.listeners["touchstart"] = e => {
		if (e.touches.length != 1) return;
		this.dragging = true;
		this.grabOffset = this.p.sub(new Vector(e.touches[0].clientX, e.touches[0].clientY));
		e.stopPropagation();
	};
	this.documentListeners["mouseup"] = e => {
		if (this.dragging) {
			this.dragging = false;
			document.body.style.cursor = "grab\n";
		}
	};
	this.documentListeners["touchend"] = e => {
		if (this.dragging) {
			this.dragging = false;
		}
	};
	this.documentListeners["mousemove"] = e => {
		if (this.dragging) {
			document.body.style.cursor = "grabbing\n";
			this.p = new Vector(e.clientX, e.clientY).add(this.grabOffset);
		}
	};
	this.documentListeners["touchmove"] = e => {
		if (this.dragging && e.touches.length == 1) {
			this.p = new Vector(e.touches[0].clientX, e.touches[0].clientY).add(this.grabOffset);
			e.preventDefault();
		}
	};
	this.listeners["mouseenter"] = e => {
		if (!this.dragging) {
			document.body.style.cursor = "grab\n";
		}
	};
	this.listeners["mouseleave"] = e => {
		if (!this.dragging) {
			document.body.style.cursor = "default\n";
		}
	};
	for (const type in this.listeners) {
		const options = type == "touchstart" ? { passive: false } : undefined;
		this.svgElement.addEventListener(type, this.listeners[type], options);
	}
	for (const type in this.documentListeners) {
		const options = type == "touchmove" ? { passive: false } : undefined;
		document.addEventListener(type, this.documentListeners[type], options);
	}
}

function Edge(a, b, weight, headless) {
	this.a = a;
	this.b = b;
	if (!headless) {
		this.weight = weight;
		this.gen = 1;
		this.svgElement = createSvgEdge();
		this.arrow = createSvgArrow();
	}
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Vector {
	constructor(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}
	
	neg() {
		return new Vector(-this.x, -this.y);
	}

	add(v) {
		return new Vector(this.x + v.x, this.y + v.y);
	}

	sub(v) {
		return new Vector(this.x - v.x, this.y - v.y);
	}

	clone() {
		return new Vector(this.x, this.y);
	}

	mul(s) {
		return new Vector(this.x * s, this.y * s);
	}

	div(s) {
		return new Vector(this.x / s, this.y / s);
	}

	len() {
		return Math.sqrt(this.lensq());
	}
	
	lensq() {
		return this.x ** 2 + this.y ** 2;
	}

	norm() {
		return this.div(this.len());
	}
	
	left() {
		return new Vector(-this.y, this.x);
	}
	
	right() {
		return new Vector(this.y, -this.x);
	}
	
	dist(v) {
		return Math.sqrt(this.distsq(v));
	}

	distsq(v) {
		return (this.x - v.x) ** 2 + (this.y - v.y) ** 2;
	}

	dot(v) {
		return this.x * v.x + this.y * v.y;
	}
	
	cross(v) {
		return this.x * v.y - this.y * v.x;
	}
}

init();
