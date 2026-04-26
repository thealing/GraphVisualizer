function isPlanar(nodes, edges) {
	const adj = [];
	for (let i = 0; i < edges.length; i++) {
		const [a, b] = edges[i];
		adj[a] ??= [];
		adj[a].push([b, i]);
		adj[b] ??= [];
		adj[b].push([a, i]);
	}
	const v = [];
	const w = [];
	const u = [];
	const f = new Set();
	function dfs1(n1, e1) {
		for (const [n2, e2] of adj[n1]) {
			if (u[e2] != null) {
				continue;
			}
			u[e2] = v[n1];
			if (v[n2] == null) {
				v[n2] = v[n1] + 1;
				w[e2] = v[n1];
				f.add(e2);
				dfs1(n2, e2);
			}
			else {
				w[e2] = v[n2];
			}
			if (w[e2] < w[e1]) {
				u[e1] = w[e1];
				w[e1] = w[e2];
			}
			if (w[e2] > w[e1]) {
				u[e1] = Math.min(u[e1], w[e2]);
			}
			else {
				u[e1] = Math.min(u[e1], u[e2]);
			}
		}
	}
	for (const i of nodes) {
		if (v[i] == null) {
			v[i] = 0;
			dfs1(i, -1);
		}
	}
	console.log(v);
	let ss=""
	for(let i = 0; i < edges.length;i++)ss+="("+edges[i][0]+", "+edges[i][1]+") : "+w[i]+" | ";
	console.log(ss);
	for (const i of nodes) {
		function isDirectedEdge(p) {
			const j = p[0];
			return f.has(p[1]) ? v[j] == v[i] + 1 : v[j] < v[i] - 1;
		}
		function getOrder(e) {
			let order = w[e] * 2;
			if (f.has(e) && u[e] < v[i]) {
				order += 1;
			}
			return order;
		}
		adj[i] = adj[i].filter(isDirectedEdge);
		adj[i].sort((a, b) => getOrder(a[1]) + (a[0]-b[0]) * 0.001 - getOrder(b[1]));
		// console.log(i+" : "+adj[i].map(e=>e[0]).join(", "));
	}
	function Interval(l, h) {
		this.l = l ?? -1;
		this.h = h ?? -1;
		this.empty = () => {
			return this.l == -1 && this.h == -1;
		};
	}
	function getLowestEnd(p) {
		for (let i = 0; i < 2; i++) {
			if (p[i].empty()) {
				return w[p[1 - i].l];
			}
		}
		return Math.min(w[p[0].l], w[p[1].l]);
	}
	function isConflicting(c, e) {
		return !c.empty() && w[c.h] > w[e];
	}
	const s = [];
	s.top = function() {
		return this[this.length - 1];
	}
	const l = [];
	const r = [];
	function merge(c1, c2) {
		if (c1.empty()) {
			c1.h = c2.h;
		}
		else {
			r[c1.l] = c2.h;
		}
		c1.l = c2.l;
	}
	function addConstraints(e1, e2, sb) {
		console.log("ENTER " + edges[e1]?.join() + " " + edges[e2]?.join() + " " + s.length);
		const pr = new Interval();
		do {
			const q = s.pop();
			if (!q[0].empty()) {
				q.reverse();
			}
			if (!q[0].empty()) {
				console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! NOT PLANAR 1");
			}
			if (w[q[1].l] > w[e1]) {
				merge(pr, q[1]);
			}
			else {
				r[q[1].l] = l[e1];
			}
		}
		while (s.length > sb);
		const pl = new Interval();
		while (s.length > 0) {
			const q = s.top();
			if (isConflicting(q[1], e2)) {
				q.reverse();
			}
			else if (!isConflicting(q[0], e2)) {
				break;
			}
			if (isConflicting(q[1], e2)) {
				console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! NOT PLANAR 2");
			}
			s.pop();
			r[pr.l] = q[1].h;
			if (q[1].l != -1) {
				pr.l = q[1].l;
			}
			merge(pl, q[0]);
		}
		if (!pl.empty() || !pr.empty()) {
			const p = [pl, pr];
			s.push(p);
			console.log("ADDED " + edges[p[0].l]?.join() + " " + edges[p[0].h]?.join() + " - " + edges[p[1].l]?.join() + " " + edges[p[1].h]?.join());
		}
	}
	function removeConstraints(n) {
		console.log("LEAVE " + n);
		while (true) {
			if (s.length == 0) {
				return;
			}
			const q = s.top();
			if (getLowestEnd(q) != v[n]) {
				break;
			}
			s.pop();
		}
		console.log("SIZE ONE " + s.length);
		const q = s.top();
		for (let i = 0; i < 2; i++) {
			while (true) {
				const e = q[i].h;
				if (e == -1) {
					const f = q[i].l;
					if (f != -1) {
						r[f] = q[1 - i].l;
						q[i].l = -1;
					}
					break;
				}
				if (w[e] != v[n]) {
					break;
				}
				q[i].h = r[e] ?? -1;
			}
		}
		console.log("SIZE TWO " + s.length);
	}
	function dfs2(n1, e1) {
		let first = true;
		for (const [n2, e2] of adj[n1]) {
			const sb = s.length;
			if (f.has(e2)) {
				dfs2(n2, e2);
				removeConstraints(n1);
				if (w[e2] < v[n1] && s.length > 0) {
					const q = s.top();
					const h0 = q[0].h;
					const h1 = q[1].h;
					if (h0 != -1 && (h1 == -1 || w[h0] > w[h1])) {
						r[e2] = h0;
					}
					else {
						r[e2] = h1;
					}
				}
			}
			else {
				l[e2] = e2;
				const c1 = new Interval();
				const c2 = new Interval(e2, e2);
				s.push([c1, c2]);
			}
			if (w[e2] < v[n1]) {
				if (first) {
					first = false;
					l[e1] = l[e2];
				}
				else {
					addConstraints(e1, e2, sb);
				}
			}
		}
	}
	for (const i of nodes) {
		if (v[i] == 0) {
			dfs2(i, -1);
		}
	}
}
