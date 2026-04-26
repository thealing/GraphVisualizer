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
		adj[i].sort((a, b) => getOrder(a[1]) - getOrder(b[1]));
	}
	function getLowestEnd(p) {
		for (let i = 0; i < 2; i++) {
			if (p[i].length == 0) {
				return w[p[1 - i][0]];
			}
		}
		return Math.min(w[p[0][0]], w[p[1][0]]);
	}
	function isConflicting(c, e) {
		return c.length > 0 && w[c[1]] > w[e];
	}
	const s = [];
	s.top = function() {
		return this[this.length - 1];
	}
	const l = [];
	const r = [];
	function merge(c1, c2) {
		if (c1.length == 0) {
			c1[1] = c2[1];
		}
		else {
			r[c1[0]] = c2[1];
		}
		c1[0] = c2[0];
	}
	function addConstraints(e1, e2, sb) {
		let p = [[], []];
		do {
			const q = s.pop();
			if (q[0].length > 0) {
				q.reverse();
			}
			if (q[0].length > 0) {
				console.log("NOT PLANAR 1");
			}
			if (w[q[1][0]] > w[e1]) {
				merge(p[1], q[1]);
			}
			else {
				r[q[1][0]] = l[e1];
			}
		}
		while (s.length > sb);
		while (s.length > 0) {
			const q = s.top();
			if (isConflicting(q[1], e2)) {
				q.reverse();
			}
			else if (!isConflicting(q[0], e2)) {
				break;
			}
			if (isConflicting(q[1], e2)) {
				console.log("NOT PLANAR 2");
			}
			s.pop();
			merge(p[0], q[0]);
			merge(p[1], q[1]);
		}
		// console.log(p);
		if (p[0].length != 0 || p[1].length != 0) {
			s.push(p);
		}
	}
	function removeConstraints(n) {
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
		const q = s.top();
		for (let i = 0; i < 2; i++) {
			while (true) {
				const e = q[i][1];
				if (e == null) {
					const f = q[i][0];
					if (f != null) {
						r[f] = q[1 - i][0];
						q[i].length = 0;
					}
					break;
				}
				if (w[e] != v[n]) {
					break;
				}
				q[i][1] = r[e];
			}
		}
	}
	function dfs2(n1, e1) {
		let first = true;
		for (const [n2, e2] of adj[n1]) {
			if (e2 == e1) {
				continue;
			}
			const sb = s.length;
			if (f.has(e2)) {
				dfs2(n2, e2);
			}
			else {
				l[e2] = e2;
				s.push([[], [e2, e2]]);
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
		if (e1 != -1) {
			removeConstraints(n1);
			if (w[e1] < v[n1] && s.length > 0) {
				const q = s.top();
				const le = q[0][1];
				const he = q[1][1];
				if (le != null && (he == null || w[le] > w[he])) {
					r[e1] = le;
				}
				else {
					r[e1] = he;
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
