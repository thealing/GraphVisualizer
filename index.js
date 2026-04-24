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
		if (nodes[i].gen === 0) {
			nodes[i].svgElement.remove();
			delete nodes[i];
		}
	}
	for (const [k, v] of edges.entries()) {
	 	if (v.gen == 0) {
	 		v.svgElement.group.remove();
			v.arrow.remove();
			edges.delete(k);
		}
	}
	adj = {};
	for (const e of edges.values()) {
		adj[e.a] ??= [];
		adj[e.a].push(e.b);
		adj[e.b] ??= [];
		adj[e.b].push(e.a);
	}
	for (const e of edges.values()) {
		e.nodeSides = {};
	}
	if(true) // TODO: LR test
	{
		for(let AT=0;AT<100000;AT++) {
			const pos = {};
			for (const i in nodes) {
				pos[i] = getRandomPosition();
			}
			let b = false;
			const edgeArray = Array.from(edges.values());
			for (let i = 0; i < edgeArray.length && !b; i++) {
				for (let j = i + 1; j < edgeArray.length && !b; j++) {
					const e1 = edgeArray[i], e2 = edgeArray[j];
					if (e1.a == e2.a || e1.a == e2.b || e1.b == e2.a || e1.b == e2.b) {
						continue;
					}
					const cp = getClosestPoints(pos[e1.a], pos[e1.b], pos[e2.a], pos[e2.b]);
					if (cp.p2.sub(cp.p1).len() < 1e-3) {
						b = true;
					}
				}
			}
			if (!b) {
				for (const e of edges.values()) {
					const v = pos[e.b].sub(pos[e.a]).norm().left();
					for (const i in nodes) {
						e.nodeSides[i] = v.dot(pos[i].sub(pos[e.a])) > 0 ? 1 : -1;
					}
				}
				return;
			}
		}
		console.log("NOT FOUND BRUTEFROCE");
	}
}

function onRefresh() {
	for (const i in nodes) {
		nodes[i].svgElement.remove();
	}
	for (const e of edges.values()) {
	 	e.svgElement.group.remove();
		e.arrow.remove();
	}
	nodes = new Map();
	edges = new Map();
	onUpdate()
}

function replaceEdges(lines) {
	edgeListEdit.value = lines;
	onRefresh();
}

function onRandom() {
	updateInput();
	const n = Number(exampleCountInput.value);
	if (n <= 1) {
		replaceEdges("");
		return;
	}
	const type = exampleTypeInput.value;
	let edges = [];
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
		return randomInt(usedEdges.length, n * 3);
	}
	const edgeCount = partitionEdges();
	edges.length = Math.min(edges.length, edgeCount);
	const finalEdges = [];
	function genLine(e) {
		const [a, b] = e;
		if (drawArrows) {
			if (Math.random() > 0.8) {
				finalEdges.push([a, b]);
				finalEdges.push([b, a]);
				return;
			}
			if (Math.random() > 0.5) {
				finalEdges.push([b, a]);
				return;
			}
		}
		finalEdges.push([a, b]);
	}
	edges.forEach(genLine);
	finalEdges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	let lines = "";
	for (const [a, b] of finalEdges) {
		lines += (a + 1) + " " + (b + 1) + (weightedEdges ? " " + randomInt(1, 9) : "") + "\n";
	}
	replaceEdges(lines);
	console.log(Object.keys(nodes).length);
}

function onApply() {
	globalSpeed = Number(speedInput.value);
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
			if (e.key === 'Enter') {
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
		for (const i in nodes) {
			nodes[i].p.x += dx;
			nodes[i].p.y += dy;
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
		for (const i in nodes) {
			nodes[i].p.x += dx;
			nodes[i].p.y += dy;
		}
		e.preventDefault();
	}, { passive: false });
	window.addEventListener("mouseup", () => {
		draggingBackground = false;
	});
	window.addEventListener("touchend", () => {
		draggingBackground = false;
	});
	onApply();
	onUpdate();
	update();
}

function updateInput() {
	drawArrows = directedInput.checked;
	weightedEdges = weightedInput.checked;
}

function update() {
	updateInput();
	requestAnimationFrame(update);
	for (const i in nodes) {
		nodes[i].svgElement.setAttribute("transform", `translate(${nodes[i].p.x}, ${nodes[i].p.y})`);
		setNodeRadius(nodes[i].svgElement, nodeRadius);
	}
	for (const e of edges.values()) {
		const a = e.a;
		const b = e.b;
		const elem = e.svgElement;
		const v = nodes[b].p.sub(nodes[a].p);
		if (v.len() <= nodeRadius * 2) {
			elem.group.setAttribute("visibility", "hidden");
			e.arrow.setAttribute("visibility", "hidden");
			elem.text.setAttribute("visibility", "hidden");
			continue;
		}
		elem.group.setAttribute("visibility", "visible");
		elem.text.setAttribute("visibility", weightedEdges ? "visible" : "hidden");
		const d = v.norm();
		const start = nodes[a].p.add(d.mul(nodeRadius));
		const end = nodes[b].p.sub(d.mul(nodeRadius));
		const x1 = start.x;
		const y1 = start.y;
		const x2 = end.x;
		const y2 = end.y;
		const scale = Math.min((v.len() - nodeRadius * 2) * 5 / 6, nodeRadius) / 20;
		const dx = x2 - x1;
		const dy = y2 - y1;
		const bbox = elem.text.getBBox();
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
		elem.text.textContent = e.weight;
		elem.text.setAttribute("font-size", nodeRadius / 2);
		elem.text.setAttribute("x", mx - nx * offset);
		elem.text.setAttribute("y", my - ny * offset);
		elem.line.setAttribute("stroke-width", Math.min(nodeRadius / 25, scale * 3.5));
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
	const edgeArray = Array.from(edges.values());
	for (const i in nodes) {
		edgeArray.push(new Edge(i, i));
	}
	for (let s = 0; s < subSteps; s++) {
		for (const i in nodes) {
			nodes[i].a = nodes[i].p.clone();
		}
		for (const i in nodes) {
			const center = new Vector(displayWidth / 2, displayHeight / 2);
			const d = nodes[i].p.sub(center);
			const force = d.mul(0.02);
			force.x /= displayWidth / displayHeight;
			force.y *= displayWidth / displayHeight;
			if (!nodes[i].dragging && !nodes[i].fixed) {
				nodes[i].p.dec(force);
			}
		}
		for (const e of edges.values()) {
			const a = e.a;
			const b = e.b;
			const d = nodes[b].p.sub(nodes[a].p);
			const l = d.len();
			if (l < 1e-3) {
				continue;
			}
			const force = d.mul((springDistance / l - 1) * 0.04);
			if (!nodes[a].dragging && !nodes[a].fixed) {
				nodes[a].p.dec(force);
			}
			if (!nodes[b].dragging && !nodes[b].fixed) {
				nodes[b].p.inc(force);
			}
		}
		const range = edgeArray.length;
		const interMap = new Map();
		const minD = nodeDistanceMin;
		for (const i in nodes) {
			nodes[i].contactEdges = new Set();
			nodes[i].intersections = new Set();
		}
		for (let i = 0; i < edgeArray.length; i++) {
			const e1 = edgeArray[i];
			for (let j = i + 1; j < edgeArray.length; j++) {
				const e2 = edgeArray[j];
				if (e1.a == e2.a || e1.a == e2.b || e1.b == e2.a || e1.b == e2.b) {
					continue;
				}
				const cp = getClosestNodePoints(e1.a, e1.b, e2.a, e2.b);
				const d = cp.p2.sub(cp.p1);
				const l = d.lensq();
				if (l <= minD * minD) {
					const interKey = i * range + j;
					interMap.set(interKey, cp);
					if (l < 1e-6) {
						nodes[e1.a].contactEdges.add(e2);
						nodes[e1.b].contactEdges.add(e2);
						nodes[e2.a].contactEdges.add(e1);
						nodes[e2.b].contactEdges.add(e1);
						nodes[e1.a].intersections.add(e1.b * range + j);
						nodes[e1.b].intersections.add(e1.a * range + j);
						nodes[e2.a].intersections.add(e2.b * range + i);
						nodes[e2.b].intersections.add(e2.a * range + i);
					}
				}
			}
		}
		function getDirection(e, ei, f) {
			let v = new Set();
			let ra = false;
			let rb = false;
			function dfs(i) {
				const nb = nodes[i].intersections;
				for (const j of adj[i]) {
					if (v.has(j)) {
						continue;
					}
					v.add(j);
					if (j == f.a) {
						ra = true;
						continue;
					}
					if (j == f.b) {
						rb = true;
						continue;
					}
					if (nb.has(j * range + ei)) {
						continue;
					}
					dfs(j);
				}
			}
			dfs(e.a);
			const n = nodes[e.b].p.sub(nodes[e.a].p).norm().left();
			let d = 0;
			if (!ra) {
				d = n.dot(nodes[f.a].p.sub(nodes[e.a].p));
			}
			if (!rb) {
				d = n.dot(nodes[f.b].p.sub(nodes[e.a].p));
			}
			d += Math.sign(d) * minD;
			return n.mul(d);
		}
		for (const [k, cp] of interMap.entries()) {
			const i1 = Math.floor(k / range);
			const i2 = k % range;
			const e1 = edgeArray[i1];
			const e2 = edgeArray[i2];
			const d = cp.p2.sub(cp.p1);
			const l = d.len();
			let dir;
			if (l < 1e-3) {
				const d1 = getDirection(e2, i2, e1);
				const d2 = getDirection(e1, i1, e2);
				dir = new Vector();
				dir.inc(d1);
				dir.dec(d2);
			}
			else {
				if (nodes[e1.a].contactEdges.has(e2)) {
					continue;
				}
				if (nodes[e1.b].contactEdges.has(e2)) {
					continue;
				}
				if (nodes[e2.a].contactEdges.has(e1)) {
					continue;
				}
				if (nodes[e2.b].contactEdges.has(e1)) {
					continue;
				}
				dir = d.div(l);
				dir = dir.mul(minD - l);
			}
			const v = dir;
			let sd = 0.12;
			if (!nodes[e1.a].dragging && !nodes[e1.a].fixed) {
				nodes[e1.a].p.dec(v.mul(1 - cp.s).mul(sd));
			}
			if (!nodes[e1.b].dragging && !nodes[e1.b].fixed) {
				nodes[e1.b].p.dec(v.mul(cp.s).mul(sd));
			}
			if (!nodes[e2.a].dragging && !nodes[e2.a].fixed) {
				nodes[e2.a].p.inc(v.mul(1 - cp.t).mul(sd));
			}
			if (!nodes[e2.b].dragging && !nodes[e2.b].fixed) {
				nodes[e2.b].p.inc(v.mul(cp.t).mul(sd));
			}
		}
	}
}

function getClosestPoints(p1, p2, p3, p4) {
	const u = p2.sub(p1);
	const v = p4.sub(p3);
	const w = p1.sub(p3);
	const a = u.dot(u);
	const b = u.dot(v);
	const c = v.dot(v);
	const d = u.dot(w);
	const e = v.dot(w);
	const D = a * c - b * b;
	const E = 1e-6;
	if (D < E) {
		const s0 = Math.max(0, Math.min(1, a < E ? 0 : p3.sub(p1).dot(u) / a));
		const s1 = Math.max(0, Math.min(1, a < E ? 0 : p4.sub(p1).dot(u) / a));
		const t0 = Math.max(0, Math.min(1, c < E ? 0 : p1.sub(p3).dot(v) / c));
		const t1 = Math.max(0, Math.min(1, c < E ? 0 : p2.sub(p3).dot(v) / c));
		s = (s0 + s1) / 2;
		t = (t0 + t1) / 2;
	}
	else {
		s = (b * e - c * d) / D;
		t = (a * e - b * d) / D;
		if (s < 0 || s > 1) {
			s = Math.max(0, Math.min(1, s));
			t = (s * b + e) / c;
		}
		if (t < 0 || t > 1) {
			t = Math.max(0, Math.min(1, t));
			s = Math.max(0, Math.min(1, (t * b - d) / a));
		}
	}
	return { s, t, p1: p1.add(u.mul(s)), p2: p3.add(v.mul(t)) };
}

function getClosestNodePoints(a, b, c, d) {
	return getClosestPoints(nodes[a].p, nodes[b].p, nodes[c].p, nodes[d].p);
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

function setNodeRadius(group, radius) {
	const circle = group.querySelector("circle");
	const text = group.querySelector("text");
	circle.setAttribute("r", radius);
	circle.setAttribute("stroke-width", radius / 25);
	text.setAttribute("font-size", radius * 0.8);
}

function createSvgNode(x, y, i) {
	const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
	group.setAttribute("transform", `translate(${x}, ${y})`);
	const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	circle.setAttribute("cx", 0);
	circle.setAttribute("cy", 0);
	circle.setAttribute("r", nodeRadius);
	circle.setAttribute("fill", "lightgray");
	circle.setAttribute("stroke", "black");
	circle.setAttribute("stroke-width", 1);
	group.appendChild(circle);
	const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
	text.setAttribute("cx", 0);
	text.setAttribute("cy", 0);
	text.setAttribute("text-anchor", "middle");
	text.setAttribute("dy", "0.35em");
	text.setAttribute("fill", "black");
	text.textContent = i;
	group.appendChild(text);
	nodesLayer.appendChild(group);
	return group;
}

function createSvgEdge() {
	const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line.setAttribute("stroke", "black");
	line.setAttribute("stroke-width", 1);
	const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
	text.setAttribute("text-anchor", "middle");
	text.setAttribute("fill", "black");
	text.setAttribute("dy", "0.35em");
	text.setAttribute("text-rendering", "geometricPrecision");
	text.textContent = "0.0\n";
	group.appendChild(line);
	group.appendChild(text);
	edgesLayer.appendChild(group);
	return { group, line, text };
}

function createSvgArrow() {
	const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
	arrow.setAttribute("fill", "black");
	arrow.setAttribute("d", "M-7,-10 L0,0 L7,-10 Z");
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
	this.svgElement.addEventListener("mousedown", e => {
		this.dragging = true;
		this.grabOffset = this.p.sub(new Vector(e.clientX, e.clientY));
		document.body.style.cursor = "grabbing\n";
		e.stopPropagation();
	});
	this.svgElement.addEventListener("touchstart", e => {
		if (e.touches.length != 1) return;
		this.dragging = true;
		this.grabOffset = this.p.sub(new Vector(e.touches[0].clientX, e.touches[0].clientY));
		e.stopPropagation();
	}, { passive: false });
	document.addEventListener("mouseup", e => {
		if (this.dragging) {
			this.dragging = false;
			document.body.style.cursor = "grab\n";
		}
	});
	document.addEventListener("touchend", e => {
		if (this.dragging) {
			this.dragging = false;
		}
	});
 	document.addEventListener("mousemove", e => {
		if (this.dragging) {
			document.body.style.cursor = "grabbing\n";
			this.p = new Vector(e.clientX, e.clientY).add(this.grabOffset);
		}
	});
	document.addEventListener("touchmove", e => {
		if (this.dragging && e.touches.length == 1) {
			this.p = new Vector(e.touches[0].clientX, e.touches[0].clientY).add(this.grabOffset);
			e.preventDefault();
		}
	}, { passive: false });
	this.svgElement.addEventListener("mouseenter", e => {
		if (!this.dragging) {
			document.body.style.cursor = "grab\n";
		}
	});
	this.svgElement.addEventListener("mouseleave", e => {
		if (!this.dragging) {
			document.body.style.cursor = "default\n";
		}
	});
}

function Edge(a, b, weight) {
	this.a = a;
	this.b = b;
	this.weight = weight;
	this.gen = 1;
	if (a != b) {
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

	inc(v) {
		this.x += v.x;
		this.y += v.y;
	}

	dec(v) {
		this.x -= v.x;
		this.y -= v.y;
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
