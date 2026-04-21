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
	if(false)
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
	
	if(true)
	{
		const pos = {};
		let x = 0;
		function dfs(i, p, y) {
			pos[i] = new Vector(x, y);
			// nodes[i].p = new Vector(x, y);
			for (const j of adj[i]) {
				if (j == p) {
					continue;
				}
				dfs(j, i, y + 50);
			}
			x += 50;
		}
		for (const i in nodes) {
			dfs(i, -1, 0);
			break;
		}
		const edgeArray = Array.from(edges.values());
		for (let i = 0; i < edgeArray.length; i++) {
			for (let j = i + 1; j < edgeArray.length; j++) {
				const e1 = edgeArray[i], e2 = edgeArray[j];
				if (e1.a == e2.a || e1.a == e2.b || e1.b == e2.a || e1.b == e2.b) {
					continue;
				}
				const cp = getClosestPoints(pos[e1.a], pos[e1.b], pos[e2.a], pos[e2.b]);
				if (cp.p2.sub(cp.p1).len() < 1e-3) {
					console.log("BAD");
				}
			}
		}
		for (const e of edges.values()) {
			const v = pos[e.b].sub(pos[e.a]).norm().left();
			for (const i in nodes) {
				const d = v.dot(pos[i].sub(pos[e.a]));
				e.nodeSides[i] = Math.sign(d) <= 0 ? -1 : 1;
			}
		}
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

function onRandom() {
	let n = randomInt(15, 15);
	let lines = "";
	const edges = [];
	
	// FIXED
	n = Number(exampleCountInput.value);

	// To create a tree, we connect each node i to a random node already in the tree
	for (let i = 1; i < n; i++) {
			// Pick a random node 'j' that is already part of the connected component
			const j = randomInt(0, i - 1);
			const w = randomInt(1, 9);
			
			// Randomly flip order so it's not always (low, high)
			if (Math.random() > 0.5) {
					lines += `${i} ${j} ${w}\n`;
			} else {
					lines += `${j} ${i} ${w}\n`;
			}
	}

	edgeListEdit.value = lines;
	onRefresh();
}

function onRandom2() {
	const n = randomInt(12, 12);
	const degree = new Array(n).fill(0);
	const existingEdges = new Set();
	let lines = "";
	function addEdgeInternal(a, b) {
		if (a === b || existingEdges.has(`${a}-${b}`)) {
			return false;
		}
		if (degree[a] >= 4 || degree[b] >= 4) {
			return false;
		}
		existingEdges.add(`${a}-${b}`);
		degree[a]++;
		degree[b]++;
		const w = randomInt(1, 9);
		lines += `${a} ${b} ${w}\n`;
		return true;
	}
	const extraEdges = Math.floor(n * 1.5);
	let added = 0;
	while (added < extraEdges) {
		const a = randomInt(0, n - 1);
		const b = randomInt(0, n - 1);
		if (addEdgeInternal(a, b)) {
			added++;
		}
	}
	edgeListEdit.value = lines;
	onRefresh();
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

function update() {
	drawArrows = directedInput.checked;
	weightedEdges = weightedInput.checked;
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
		// edgeArray.push(new Edge(i, i));
	}
	for (let s = 0; s < subSteps; s++) {
		for (const i in nodes) {
			nodes[i].a = new Vector();
		}
		for (const e of edges.values()) {
			const a = e.a;
			const b = e.b;
			const d = nodes[b].p.sub(nodes[a].p);
			const l = d.len() || 0.001;
			const force = d.mul((springDistance / l - 1) * 0.003);
			nodes[a].a = nodes[a].a.add(force.neg());
			nodes[b].a = nodes[b].a.add(force);
		}
		for (const i in nodes) {
			const center = new Vector(displayWidth / 2, displayHeight / 2);
			const d = nodes[i].p.sub(center);
			const force = d.mul(0.0005);
			force.x /= displayWidth / displayHeight;
			force.y *= displayWidth / displayHeight;
			nodes[i].a = nodes[i].a.add(force.neg());
		}
		function getDirection(e, n) {
			if (!e.nodeSides) {
				return null;
			}
			const r = e.nodeSides[n];
			const v = nodes[e.b].p.sub(nodes[e.a].p).norm().left();
			const d = v.dot(nodes[n].p.sub(nodes[e.a].p));
			if (Math.sign(d) == r) {
				return null;
			}
			return v.mul(d);
		}
		for (let i = 0; i < edgeArray.length; i++) {
			for (let j = i + 1; j < edgeArray.length; j++) {
				const e1 = edgeArray[i], e2 = edgeArray[j];
				if (e1.a == e2.a || e1.a == e2.b || e1.b == e2.a || e1.b == e2.b) {
					continue;
				}
				const cp = getClosestNodePoints(e1.a, e1.b, e2.a, e2.b);
				const d = cp.p2.sub(cp.p1);
				const minD = nodeDistanceMin;
				const l = d.len();
				if (l <= minD) {
					let dir;
					function maximize(d) {
						dir = dir.sub(d);
					}
					if (l < 1e-3) {
						dir = new Vector();
						const d1a = getDirection(e2, e1.a);
						const d1b = getDirection(e2, e1.b);
						const d2a = getDirection(e1, e2.a);
						const d2b = getDirection(e1, e2.b);
						if (d1a) {
							maximize(d1a);
						}
						if (d1b) {
							maximize(d1b);
						}
						if (d2a) {
							maximize(d2a.neg());
						}
						if (d2b) {
							maximize(d2b.neg());
						}
					}
					else {
						dir = d.div(l);
						dir = dir.mul(minD - l);
					}
					const m = 0.06;
					const v = dir.mul(m);
					const sd = 0.5;
					if (!nodes[e1.a].dragging && !nodes[e1.a].fixed) {
						nodes[e1.a].a = nodes[e1.a].a.sub(v.mul(1 - cp.s).mul(sd));
					}
					if (!nodes[e1.b].dragging && !nodes[e1.b].fixed) {
						nodes[e1.b].a = nodes[e1.b].a.sub(v.mul(cp.s).mul(sd));
					}
					if (!nodes[e2.a].dragging && !nodes[e2.a].fixed) {
						nodes[e2.a].a = nodes[e2.a].a.add(v.mul(1 - cp.t).mul(sd));
					}
					if (!nodes[e2.b].dragging && !nodes[e2.b].fixed) {
						nodes[e2.b].a = nodes[e2.b].a.add(v.mul(cp.t).mul(sd));
					}
				}
			}
		}
		for (const a in nodes) {
			for (const b in nodes) {
				if (b <= a) continue;
				const d = nodes[b].p.sub(nodes[a].p);
				const l = d.len() || 0.01;
				if (l < nodeDistanceMin) {
					const m = (nodeDistanceMin - l) * 0.04;
					const f = d.mul(m / l);
					if (!nodes[a].dragging && !nodes[a].fixed) {
						nodes[a].a = nodes[a].a.sub(f);
					}
					if (!nodes[b].dragging && !nodes[b].fixed) {
						nodes[b].a = nodes[b].a.add(f);
					}
				}
			}
		}
		for (const i in nodes) {
			nodes[i].v = nodes[i].v.add(nodes[i].a.mul(stepSize));
			nodes[i].v = nodes[i].v.mul(Math.pow(0.95, stepSize));
			const l = nodes[i].v.len();
			const limit = nodeRadius * 0.7;
			if (l > limit) {
				nodes[i].v = nodes[i].v.mul(limit / l);
			}
		}
		for (const i in nodes) {
			if (!nodes[i].dragging && !nodes[i].fixed) {
				nodes[i].p = nodes[i].p.add(nodes[i].v.mul(stepSize));
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
	const m = displayWidth / 3;
	return new Vector(randomInt(m, displayWidth - m), randomInt(displayHeight / 3, displayHeight * 2 / 3));
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
