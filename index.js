const distanceInput = document.getElementById("distance-input");

const directedInput = document.getElementById("directed-input");

const edgeListEdit = document.getElementById("edge-list-edit");

const displaySvg = document.getElementById("display-svg");

var nodeRadius = 25;

var nodeDistanceMin = nodeRadius * 3;

var springDistance = 1;

var springStiffness = 0.01;

var displayWidth = displaySvg.clientWidth;

var displayHeight = displaySvg.clientHeight;

var nodes = new Map();

var edges = new Map();

function onGraphSvgResize(width, height) {
	displayWidth = width;
	displayHeight = height;
}

function onRefresh() {
	for (const i in nodes) {
		nodes[i].svgElement.remove();
	}
	for (const [[a, b], e] of edges.entries()) {
	 	e.svgElement.remove();
		e.arrow.remove();
	}
	nodes = new Map();
	edges = new Map();
	const lines = edgeListEdit.value.trim().split('\n');
	for (const line of lines) {
		const [a, b] = line.trim().split(' ').map(Number);
		if (a == undefined || b == undefined) {
			continue;
		}
		addNode(a);
		addNode(b);
		addEdge(a, b);
	}
}

function init() {
	new ResizeObserver(function(entries) {
		for (const entry of entries) {
			onGraphSvgResize(entry.contentRect.width, entry.contentRect.height);
		}
	}).observe(displaySvg);
	setInterval(update, 5);
}

function update() {
		springDistance = distanceInput.value;
		drawArrows = directedInput.checked;
		for (const i in nodes) {
			nodes[i].svgElement.setAttribute("transform", `translate(${nodes[i].p.x}, ${nodes[i].p.y})`);
			nodes[i].a = new Vector();
		}
		for (const [[a, b], e] of edges.entries()) {
			const elem = e.svgElement;
			const d = nodes[b].p.sub(nodes[a].p).norm();
		 	const start = nodes[a].p.add(d.mul(nodeRadius));
		 	const end = nodes[b].p.sub(d.mul(nodeRadius));
			elem.setAttribute("x1", start.x);
			elem.setAttribute("y1", start.y);
			elem.setAttribute("x2", end.x);
			elem.setAttribute("y2", end.y);
			e.arrow.setAttribute("transform", `translate(${end.x}, ${end.y}) rotate(${Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI - 90})`);
			e.arrow.setAttribute("visibility", drawArrows ? "visible" : "hidden");
		}
		for (const [[a, b], e] of edges.entries()) {
			const d = nodes[b].p.sub(nodes[a].p);
			const l = d.len();
			if (l == 0) {
				continue;
			}
			const force = d.mul((springDistance / l - 1) * 0.01);
			nodes[a].a = nodes[a].a.add(force.neg());
			nodes[b].a = nodes[b].a.add(force);
		}
		for (const i in nodes) {
			const d = new Vector(displayWidth / 2, displayHeight / 2).sub(nodes[i].p);
			const force = d.mul(-0.0005);
			nodes[i].a = nodes[i].a.add(force.neg());
		}
		for (const a in nodes) {
		 	for (const b in nodes) {
				if (b <= a) {
					continue;
				}
				const d = nodes[b].p.sub(nodes[a].p);
				const l = d.len();
				if (l >= nodeDistanceMin) {
					const force = d.norm().mul(0.01);
					nodes[a].a = nodes[a].a.add(force.neg());
					nodes[b].a = nodes[b].a.add(force);
					continue;
				}
				const v = d.norm().mul(nodeDistanceMin - l);
				if (!nodes[a].dragging && !nodes[a].fixed) {
					nodes[a].p = nodes[a].p.add(v.div(-2));
				}
				if (!nodes[b].dragging && !nodes[b].fixed) {
					nodes[b].p = nodes[b].p.add(v.div(2));
				}
			}
		}
		for (const i in nodes) {
			nodes[i].v = nodes[i].v.add(nodes[i].a);
			nodes[i].v = nodes[i].v.mul(0.9);
		}
		for (const i in nodes) {
			if (!nodes[i].dragging && !nodes[i].fixed) {
				nodes[i].p = nodes[i].p.add(nodes[i].v);
			}
		}
}

function addNode(i) {
	if (nodes[i]) {
		return;
	}
	nodes[i] = new Node(displayWidth / 2, displayHeight / 2, i);
}

function addEdge(a, b) {
	edges.set([a, b], new Edge());
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
	text.setAttribute("dominant-baseline", "middle");
	text.setAttribute("fill", "black");
	text.textContent = i;
	group.appendChild(text);
	displaySvg.appendChild(group);
	return group;
}

function createSvgEdge() {
	const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line.setAttribute("stroke", "black");
	line.setAttribute("stroke-width", 1);
	displaySvg.appendChild(line);
	return line;
}

function createSvgArrow() {
	const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
	arrow.setAttribute("fill", "black");
	arrow.setAttribute("d", "M-7,-10 L0,0 L7,-10 Z");
	displaySvg.appendChild(arrow);
	return arrow;
}

function Node(x, y, i) {
	this.p = new Vector(displayWidth / 2 + Math.random(), displayHeight / 2 + Math.random());
	this.v = new Vector();
	this.a = new Vector();
	this.fixed = false;
	this.dragging = false;
	this.grabOffset = new Vector();
	this.svgElement = createSvgNode(this.p.x, this.p.y, i);
	this.svgElement.addEventListener("mousedown", e => {
		this.dragging = true;
		this.grabOffset = this.p.sub(new Vector(e.clientX, e.clientY));
		document.body.style.cursor = "grabbing";
	});
	document.addEventListener("mouseup", e => {
		if (this.dragging) {
			this.dragging = false;
			document.body.style.cursor = "grab";
		}
	});
 	document.addEventListener("mousemove", e => {
		if (this.dragging) {
			document.body.style.cursor = "grabbing";
			this.p = new Vector(e.clientX, e.clientY).add(this.grabOffset);
		}
	});
	this.svgElement.addEventListener("mouseenter", e => {
		if (!this.dragging) {
			document.body.style.cursor = "grab";
		}
	});
	this.svgElement.addEventListener("mouseleave", e => {
		if (!this.dragging) {
			document.body.style.cursor = "default";
		}
	});
}

function Edge() {
	this.svgElement = createSvgEdge();
	this.arrow = createSvgArrow();
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
		return Math.sqrt(this.distsq());
	}
	
	distsq(v) {
		return (this.x - v.x) ** 2 + (this.y - v.y) ** 2;
	}

	dot(v) {
		return this.x * v.x + this.y * v.y;
	}
	
	cross(v) {
		return this.x * v.y - this.x * v.y;
	}
}

init();
