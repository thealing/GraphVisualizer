const speedInput = document.getElementById("speed-input");

const nodeSizeInput = document.getElementById("node-size-input");

const nodeMarginInput = document.getElementById("node-margin-input");

const distanceInput = document.getElementById("distance-input");

const directedInput = document.getElementById("directed-input");

const weightedInput = document.getElementById("weighted-input");

const manualInput = document.getElementById("manual-input");

const edgeListEdit = document.getElementById("edge-list-edit");

const displaySvg = document.getElementById("display-svg");

var displayWidth = displaySvg.clientWidth;

var displayHeight = displaySvg.clientHeight;

var nodes = new Map();

var edges = new Map();

function onGraphSvgResize(width, height) {
	displayWidth = width;
	displayHeight = height;
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
		for (const entry of entries) {
			onGraphSvgResize(entry.contentRect.width, entry.contentRect.height);
		}
	}).observe(displaySvg);
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
	window.addEventListener("mouseup", () => {
		draggingBackground = false;
	});
	onApply();
	edgeListEdit.value = "";
	edgeListEdit.value += "0 4 2\n";
	edgeListEdit.value += "0 1 4\n";
	edgeListEdit.value += "9 8 2\n";
	edgeListEdit.value += "8 9 1\n";
	edgeListEdit.value += "6 9 7\n";
	edgeListEdit.value += "6 7 2\n";
	edgeListEdit.value += "3 7 5\n";
	edgeListEdit.value += "2 3 3\n";
	edgeListEdit.value += "2 6 6\n";
	edgeListEdit.value += "1 2 7\n";
	edgeListEdit.value += "1 5 9\n";
	edgeListEdit.value += "5 8 4\n";
	edgeListEdit.value += "5 6 8\n";
	edgeListEdit.value += "5 1 7\n";
	edgeListEdit.value += "4 8 3\n";
	edgeListEdit.value += "4 5 1\n";
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
		const offset = halfExtent + springDistance / 100;
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
	for (let s = 0; s < subSteps; s++) {
		for (const i in nodes) {
			nodes[i].a = new Vector();
		}
		for (const e of edges.values()) {
			const a = e.a;
			const b = e.b;
			const d = nodes[b].p.sub(nodes[a].p);
			const l = d.len() || 0.001;
			const rv = nodes[b].v.sub(nodes[a].v);
			const uD = d.div(l);
			const damping = uD.mul(rv.dot(uD) * 0.02);
			const force = d.mul((springDistance / l - 1) * 0.003).sub(damping);
			nodes[a].a = nodes[a].a.add(force.neg());
			nodes[b].a = nodes[b].a.add(force);
		}
		for (const i in nodes) {
			const center = new Vector(displayWidth / 2, displayHeight / 2);
			const d = nodes[i].p.sub(center);
			const force = d.mul(0.0002);
			nodes[i].a = nodes[i].a.add(force.neg());
		}
		for (let i = 0; i < edgeArray.length; i++) {
			for (let j = i + 1; j < edgeArray.length; j++) {
				const e1 = edgeArray[i];
				const e2 = edgeArray[j];
				if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;
				const cp = getClosestPoints(nodes[e1.a].p, nodes[e1.b].p, nodes[e2.a].p, nodes[e2.b].p);
				const d = cp.pB.sub(cp.pA);
				let l = d.len();
				const minD = nodeDistanceMin;
				if (l < minD) {
					let dir;
					if (l < 0.01) {
						const edge1Dir = nodes[e1.b].p.sub(nodes[e1.a].p).norm();
						dir = new Vector(-edge1Dir.y, edge1Dir.x);
						l = 0.01;
					} else {
						dir = d.div(l);
					}
					const forceMag = (minD - l) * 0.02;
					const v = dir.mul(forceMag);
					const sd = 0.5;
					if (!nodes[e1.a].dragging && !nodes[e1.a].fixed) nodes[e1.a].v = nodes[e1.a].v.sub(v.mul(1 - cp.s).mul(sd));
					if (!nodes[e1.b].dragging && !nodes[e1.b].fixed) nodes[e1.b].v = nodes[e1.b].v.sub(v.mul(cp.s).mul(sd));
					if (!nodes[e2.a].dragging && !nodes[e2.a].fixed) nodes[e2.a].v = nodes[e2.a].v.add(v.mul(1 - cp.t).mul(sd));
					if (!nodes[e2.b].dragging && !nodes[e2.b].fixed) nodes[e2.b].v = nodes[e2.b].v.add(v.mul(cp.t).mul(sd));
				}
			}
		}
		for (const a in nodes) {
			for (const b in nodes) {
				if (b <= a) continue;
				const d = nodes[b].p.sub(nodes[a].p);
				const l = d.len() || 0.01;
				if (l < nodeDistanceMin) {
					const forceMag = (nodeDistanceMin - l) * 0.05;
					const v = d.mul(forceMag / l);
					if (!nodes[a].dragging && !nodes[a].fixed) nodes[a].v = nodes[a].v.sub(v);
					if (!nodes[b].dragging && !nodes[b].fixed) nodes[b].v = nodes[b].v.add(v);
				}
			}
		}
		for (const i in nodes) {
			nodes[i].v = nodes[i].v.add(nodes[i].a);
			nodes[i].v = nodes[i].v.mul(0.95);
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

function addNode(i) {
	if (!nodes[i]) {
		const m = displayWidth / 3;
		nodes[i] = new Node(randomInt(m, displayWidth - m), randomInt(displayHeight / 3, displayHeight * 2 / 3), i);
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
	document.addEventListener("mouseup", e => {
		if (this.dragging) {
			this.dragging = false;
			document.body.style.cursor = "grab\n";
		}
	});
 	document.addEventListener("mousemove", e => {
		if (this.dragging) {
			document.body.style.cursor = "grabbing\n";
			this.p = new Vector(e.clientX, e.clientY).add(this.grabOffset);
		}
	});
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
	this.svgElement = createSvgEdge();
	this.arrow = createSvgArrow();
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
	let sc, tc;
	if (D < 1e-6) {
		sc = 0.0;
		tc = (b > c ? d / b : e / c);
	} else {
		sc = (b * e - c * d) / D;
		tc = (a * e - b * d) / D;
	}
	if (sc < 0.0) sc = 0.0;
	else if (sc > 1.0) sc = 1.0;
	tc = (sc * b + e) / c;
	if (tc < 0.0) {
		tc = 0.0;
		sc = Math.max(0.0, Math.min(1.0, -d / a));
	} else if (tc > 1.0) {
		tc = 1.0;
		sc = Math.max(0.0, Math.min(1.0, (b - d) / a));
	}
	return {
		pA: p1.add(u.mul(sc)),
		pB: p3.add(v.mul(tc)),
		s: sc,
		t: tc
	};
}

init();
