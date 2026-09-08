/* Downward ancestry; shared traditions use horizontal bands. */
(function (root) {
  const W = 144,
    H = 124,
    directed = (e) => !["family", "similarity"].includes(e.type);
  function reducedEdges(edges) {
    const direct = edges.filter(directed),
      adj = new Map();
    for (const e of direct) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source).push(e);
    }
    return direct.filter((edge) => {
      const seen = new Set([edge.source]),
        queue = [edge.source];
      for (let i = 0; i < queue.length; i++)
        for (const e of adj.get(queue[i]) || []) {
          if (e === edge || (edge.type !== "probable" && e.type === "probable"))
            continue;
          if (e.target === edge.target) return false;
          if (!seen.has(e.target)) {
            seen.add(e.target);
            queue.push(e.target);
          }
        }
      return true;
    });
  }
  async function componentLayout(nodes, edges, engine, traditions = []) {
    if (nodes.length === 1)
      return {
        nodes: [{ id: nodes[0].id, x: 20, y: 20 }],
        edges: [],
        w: W + 40,
        h: H + 40,
      };
    const ids = new Set(nodes.map((n) => n.id));
    const ranks = new Map(nodes.map((n) => [n.id, 0]));
    const childIndex = new Map(),
      reachCache = new Map();
    for (const e of edges) {
      if (!childIndex.has(e.source)) childIndex.set(e.source, []);
      childIndex.get(e.source).push(e.target);
    }
    const reach = (a, b) => {
      if (!reachCache.has(a)) {
        const q = [a],
          seen = new Set(q);
        for (let i = 0; i < q.length; i++)
          for (const id of childIndex.get(q[i]) || [])
            if (!seen.has(id)) {
              seen.add(id);
              q.push(id);
            }
        reachCache.set(a, seen);
      }
      return reachCache.get(a).has(b);
    };
    const candidates = traditions
      .filter(
        (t) => t.alignRow && !(t.excludeWhen || []).some((id) => ids.has(id)),
      )
      .map((t) => ({ ...t, members: t.members.filter((id) => ids.has(id)) }))
      .filter(
        (t) =>
          t.members.length > 1 &&
          !t.members.some((a) => t.members.some((b) => a !== b && reach(a, b))),
      )
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const taken = new Set(),
      groups = [];
    for (const t of candidates)
      if (!t.members.some((id) => taken.has(id))) {
        groups.push(t);
        t.members.forEach((id) => taken.add(id));
      }
    for (let k = 0; k < nodes.length; k++) {
      let changed = false;
      for (const e of edges)
        if (ranks.get(e.target) <= ranks.get(e.source)) {
          ranks.set(e.target, ranks.get(e.source) + 1);
          changed = true;
        }
      for (const t of groups) {
        const level = Math.max(
          ...t.members.map((id) => ranks.get(id)),
          ...(t.rankAfter || [])
            .filter((id) => ranks.has(id))
            .map((id) => ranks.get(id) + 1),
        );
        for (const id of t.members)
          if (ranks.get(id) < level) {
            ranks.set(id, level);
            changed = true;
          }
      }
      if (!changed) break;
    }
    const units = [],
      unitFor = new Map();
    for (const t of groups) {
      const u = {
        id: "group-" + t.id,
        members: t.members,
        w: t.members.length * (W + 52) - 52,
        rank: ranks.get(t.members[0]),
        ports: [],
      };
      units.push(u);
      t.members.forEach((id, i) =>
        unitFor.set(id, { unit: u, offset: i * (W + 52) }),
      );
    }
    for (const n of nodes)
      if (!taken.has(n.id)) {
        const u = {
          id: n.id,
          members: [n.id],
          w: W,
          rank: ranks.get(n.id),
          ports: [],
        };
        units.push(u);
        unitFor.set(n.id, { unit: u, offset: 0 });
      }
    const counts = new Map(),
      used = new Map();
    for (const e of edges)
      for (const key of [e.source + ":S", e.target + ":N"])
        counts.set(key, (counts.get(key) || 0) + 1);
    edges.forEach((e, i) => {
      for (const [id, side, prefix] of [
        [e.source, "S", "s"],
        [e.target, "N", "t"],
      ]) {
        const key = id + ":" + side,
          num = used.get(key) || 0;
        used.set(key, num + 1);
        const at = unitFor.get(id);
        at.unit.ports.push({
          id: prefix + i,
          width: 0,
          height: 0,
          x: at.offset + (W * (num + 1)) / (counts.get(key) + 1),
          y: side === "S" ? H : 0,
          layoutOptions: { "elk.port.side": side === "S" ? "SOUTH" : "NORTH" },
        });
      }
    });
    const graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.layered.layering.strategy": groups.length
          ? "INTERACTIVE"
          : "LONGEST_PATH_SOURCE",
        "elk.separateConnectedComponents": "false",
        "elk.spacing.nodeNode": "52",
        "elk.layered.spacing.nodeNodeBetweenLayers": "42",
        "elk.layered.spacing.edgeNodeBetweenLayers": "18",
        "elk.spacing.edgeNode": "24",
        "elk.spacing.edgeEdge": "12",
        "elk.layered.spacing.edgeEdgeBetweenLayers": "12",
        "elk.layered.mergeEdges": "false",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
        "elk.padding": "[top=30,left=30,bottom=30,right=30]",
      },
      children: units.map((u) => ({
        id: u.id,
        width: u.w,
        height: H,
        x: 0,
        y: u.rank * 250,
        layoutOptions: { "elk.portConstraints": "FIXED_POS" },
        ports: u.ports,
      })),
      edges: edges.map((e, i) => ({
        id: "" + i,
        sources: ["s" + i],
        targets: ["t" + i],
      })),
    };
    let r = await engine.layout(JSON.parse(JSON.stringify(graph)));
    if (nodes.length > 200) {
      const quality = (g) => {
        let total = 0;
        const lines = [];
        for (const e of g.edges)
          for (const section of e.sections) {
            const p = [
              section.startPoint,
              ...(section.bendPoints || []),
              section.endPoint,
            ];
            for (let i = 1; i < p.length; i++) {
              total +=
                Math.abs(p[i].x - p[i - 1].x) + Math.abs(p[i].y - p[i - 1].y);
              lines.push([p[i - 1], p[i]]);
            }
          }
        let crossings = 0;
        for (const [a, b] of lines)
          if (a.x === b.x)
            for (const [c, d] of lines)
              if (
                c.y === d.y &&
                a.x > Math.min(c.x, d.x) &&
                a.x < Math.max(c.x, d.x) &&
                c.y > Math.min(a.y, b.y) &&
                c.y < Math.max(a.y, b.y)
              )
                crossings++;
        return total + crossings * 600;
      };
      let score = quality(r);
      for (const seed of [2, 3]) {
        const candidate = await engine.layout(
          JSON.parse(
            JSON.stringify({
              ...graph,
              layoutOptions: {
                ...graph.layoutOptions,
                "elk.randomSeed": String(seed),
              },
            }),
          ),
        );
        const next = quality(candidate);
        if (next < score) {
          r = candidate;
          score = next;
        }
      }
    }
    const arranged = new Map(r.children.map((n) => [n.id, n]));
    const result = {
      nodes: nodes.map((n) => {
        const at = unitFor.get(n.id),
          u = arranged.get(at.unit.id);
        return { id: n.id, x: u.x + at.offset, y: u.y };
      }),
      edges: r.edges.map((e) => ({
        edge: edges[+e.id],
        points: e.sections.flatMap((s) => [
          s.startPoint,
          ...(s.bendPoints || []),
          s.endPoint,
        ]),
      })),
      w: r.width,
      h: r.height,
    };
    const placed = new Map(result.nodes.map((n) => [n.id, n]));
    const fixed = new Set(groups.flatMap((g) => g.members));
    const hits = (a, b, n) => {
      const x0 = n.x - 6,
        x1 = n.x + W + 6,
        y0 = n.y - 6,
        y1 = n.y + H + 6;
      return Math.abs(a.x - b.x) < 1e-6
        ? a.x > x0 &&
            a.x < x1 &&
            Math.max(a.y, b.y) > y0 &&
            Math.min(a.y, b.y) < y1
        : a.y > y0 &&
            a.y < y1 &&
            Math.max(a.x, b.x) > x0 &&
            Math.min(a.x, b.x) < x1;
    };
    for (const route of result.edges) {
      const e = route.edge,
        from = placed.get(e.source),
        to = placed.get(e.target);
      if (
        fixed.has(to.id) ||
        edges.some((x) => x.source === to.id) ||
        edges.filter((x) => x.target === to.id).length !== 1 ||
        edges.filter((x) => x.source === from.id).length !== 1
      )
        continue;
      const moved = { ...to, x: from.x };
      if (
        result.nodes.some(
          (n) =>
            n.id !== to.id &&
            n.id !== from.id &&
            moved.x < n.x + W + 12 &&
            moved.x + W + 12 > n.x &&
            moved.y < n.y + H + 12 &&
            moved.y + H + 12 > n.y,
        )
      )
        continue;
      const a = { x: from.x + W / 2, y: from.y + H },
        b = { x: from.x + W / 2, y: to.y };
      if (
        b.y < a.y ||
        result.nodes.some(
          (n) => ![to.id, from.id].includes(n.id) && hits(a, b, n),
        )
      )
        continue;
      if (
        result.edges.some(
          (r) =>
            r !== route &&
            r.points.slice(1).some((b, i) => hits(r.points[i], b, moved)),
        )
      )
        continue;
      to.x = moved.x;
      route.points = [a, b];
    }
    return result;
  }

  function largestComponent(nodes, edges) {
    const ids = new Set(nodes.map((n) => n.id)),
      adj = new Map(nodes.map((n) => [n.id, []]));
    for (const e of edges)
      if (directed(e) && ids.has(e.source) && ids.has(e.target)) {
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
      }
    const seen = new Set();
    let largest = [];
    for (const n of nodes) {
      if (seen.has(n.id)) continue;
      const component = [n.id];
      seen.add(n.id);
      for (let i = 0; i < component.length; i++)
        for (const id of adj.get(component[i]))
          if (!seen.has(id)) {
            seen.add(id);
            component.push(id);
          }
      if (component.length > largest.length) largest = component;
    }
    const chosen = new Set(largest);
    return nodes.filter((n) => chosen.has(n.id));
  }
  function familyNodes(nodes, edges, family, expanded = true) {
    if (!expanded) {
      const base = new Set(
        nodes.filter((n) => n.families.includes(family.id)).map((n) => n.id),
      );
      if (family.id === "independent")
        return nodes.filter((n) => base.has(n.id));
      const set = new Set(base);
      for (const e of edges)
        if (directed(e) && base.has(e.target)) set.add(e.source);
      for (const e of edges)
        if (
          e.type === "similarity" &&
          (base.has(e.source) || base.has(e.target))
        ) {
          set.add(e.source);
          set.add(e.target);
        }
      return nodes.filter((n) => set.has(n.id));
    }
    const ids = new Set(nodes.map((n) => n.id)),
      base = new Set(
        nodes.filter((n) => n.families.includes(family.id)).map((n) => n.id),
      );
    if (family.id === "independent") return nodes.filter((n) => base.has(n.id));
    if (family.roots) {
      base.clear();
      for (const id of family.roots) if (ids.has(id)) base.add(id);
    }
    const ancestry = edges.filter(directed);
    let changed = true;
    if (family.followDescendants !== false) {
      while (changed) {
        changed = false;
        for (const e of ancestry)
          if (
            base.has(e.source) &&
            ids.has(e.target) &&
            !base.has(e.target) &&
            !(family.exclude || []).includes(e.target)
          ) {
            base.add(e.target);
            changed = true;
          }
      }
    }
    for (const id of family.include || []) if (ids.has(id)) base.add(id);
    const set = new Set(base);
    changed = family.ancestorMode !== "none";
    while (changed) {
      changed = false;
      for (const e of ancestry)
        if (
          set.has(e.target) &&
          ids.has(e.source) &&
          !set.has(e.source) &&
          (family.ancestorMode !== "influence" || e.type !== "redesign")
        ) {
          set.add(e.source);
          changed = true;
        }
    }
    for (const e of edges)
      if (
        e.type === "similarity" &&
        (base.has(e.source) || base.has(e.target))
      ) {
        set.add(e.source);
        set.add(e.target);
      }
    return nodes.filter(
      (n) => set.has(n.id) && !(family.exclude || []).includes(n.id),
    );
  }
  function fullLineage(nodes, edges, id) {
    const ancestry = edges.filter(directed),
      set = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of ancestry)
        if (set.has(e.source) && !set.has(e.target)) {
          set.add(e.target);
          changed = true;
        }
    }
    changed = true;
    while (changed) {
      changed = false;
      for (const e of ancestry)
        if (set.has(e.target) && !set.has(e.source)) {
          set.add(e.source);
          changed = true;
        }
    }
    return nodes.filter((n) => set.has(n.id));
  }
  function traditionBands(nodes, traditions) {
    const bands = [];
    for (const t of traditions.filter((t) => t.displayBand !== false)) {
      const members = new Set(t.members),
        ns = nodes.filter((n) => members.has(n.id));
      if (ns.length < 2) continue;
      const rows = new Map();
      for (const n of ns) {
        const key = Math.round(n.y / 2) * 2;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push(n);
      }
      for (const row of rows.values()) {
        row.sort((a, b) => a.x - b.x);
        let run = [];
        const finish = () => {
          if (run.length > 1) {
            const left = run[0],
              right = run.at(-1);
            bands.push({
              priority: t.priority || 0,
              tradition: t.id,
              name: t.name,
              showLabel: !!t.showLabel,
              members: run.map((n) => n.id),
              x: left.x - 14,
              y: left.y - 30,
              w: right.x + W - left.x + 28,
              h: H + 44,
            });
          }
          run = [];
        };
        for (const n of row) {
          if (run.length) {
            const last = run.at(-1);
            if (
              (!t.alignRow && n.x - last.x > W + 190) ||
              nodes.some(
                (other) =>
                  !members.has(other.id) &&
                  other.x > last.x &&
                  other.x < n.x &&
                  Math.abs(other.y - n.y) < H,
              )
            )
              finish();
          }
          run.push(n);
        }
        finish();
      }
    }
    // Keep one visible band per place; additional memberships remain in the detail panel.
    const accepted = [];
    for (const b of bands.sort(
      (a, b) =>
        (b.priority || 0) - (a.priority || 0) ||
        b.members.length - a.members.length,
    )) {
      if (
        !accepted.some(
          (a) =>
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y,
        )
      )
        accepted.push(b);
    }
    return accepted;
  }
  async function treeLayout(
    nodes,
    edges,
    engine,
    traditions = [],
    options = {},
  ) {
    // Per-view row guides arrange neighbouring branches without implying kinship.
    traditions = [
      ...traditions,
      ...(options.layoutRows || []).map((members, i) => ({
        id: "view-row-" + i,
        members,
        alignRow: true,
        displayBand: false,
        priority: 100,
      })),
    ];
    const seal = traditions.find((t) => t.id === "seal-blue"),
      sealNodes = seal
        ? nodes.filter(
            (n) =>
              seal.members.includes(n.id) &&
              !edges.some(
                (e) =>
                  directed(e) &&
                  e.target === n.id &&
                  seal.members.includes(e.source),
              ),
          )
        : [];
    if (sealNodes.length >= 8) {
      const group = new Set(sealNodes.map((n) => n.id)),
        childEdges = edges.filter(
          (e) =>
            directed(e) &&
            group.has(e.source) &&
            nodes.some((n) => n.id === e.target),
        );
      const children = new Set(childEdges.map((e) => e.target)),
        blocked = new Set([...group, ...children]);
      const out = await treeLayout(
        nodes.filter((n) => !blocked.has(n.id)),
        edges,
        engine,
        traditions.filter((t) => t !== seal),
        {
          ...options,
          packingWidth: options.packingWidth
            ? options.packingWidth - 1300
            : undefined,
        },
      );
      const parents = new Set(childEdges.map((e) => e.source));
      const ordinary = sealNodes.filter((n) => !parents.has(n.id));
      const last = sealNodes.filter((n) => parents.has(n.id));
      const cols = 6,
        startY = 60,
        startX = out.w + 60;
      let row = 0,
        col = 0;
      for (const n of ordinary) {
        out.nodes.push({
          id: n.id,
          x: startX + col * 196,
          y: startY + row * 174,
        });
        if (++col === cols) {
          col = 0;
          row++;
        }
      }
      if (col) row++;
      col = 0;
      for (const n of last) {
        out.nodes.push({
          id: n.id,
          x: startX + col * 196,
          y: startY + row * 174,
        });
        col++;
      }
      const bottom = startY + row * 174 + H;
      out.bands.push({
        tradition: seal.id,
        name: seal.name,
        showLabel: false,
        members: sealNodes.map((n) => n.id),
        x: startX - 15,
        y: startY - 20,
        w: 5 * 196 + W + 30,
        h: bottom - startY + 40,
      });
      for (const e of childEdges) {
        const from = out.nodes.find((n) => n.id === e.source),
          to = { id: e.target, x: from.x, y: bottom + 80 };
        if (!out.nodes.some((n) => n.id === to.id)) out.nodes.push(to);
        out.edges.push({
          edge: e,
          points: [
            { x: from.x + W / 2, y: from.y + H },
            { x: to.x + W / 2, y: to.y },
          ],
        });
      }
      out.w = startX + 6 * 196 + 30;
      out.h = Math.max(out.h, bottom + (children.size ? H + 120 : 40));
      out.associations.push(
        ...edges.filter(
          (e) => !directed(e) && group.has(e.source) && group.has(e.target),
        ),
      );
      return out;
    }
    const ids = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    const ancestry = reducedEdges(edges);
    const parent = new Map(nodes.map((n) => [n.id, n.id]));
    function find(id) {
      while (parent.get(id) !== id) id = parent.get(id);
      return id;
    }
    for (const e of ancestry) parent.set(find(e.target), find(e.source));
    // Shared traditions join layout regions, without creating ancestry arrows.
    for (const t of traditions.filter((t) => t.unifyLayout)) {
      const members = t.members.filter((id) => ids.has(id));
      for (const id of members.slice(1)) parent.set(find(id), find(members[0]));
    }
    const components = new Map();
    for (const n of nodes) {
      const id = find(n.id);
      if (!components.has(id)) components.set(id, []);
      components.get(id).push(n);
    }
    const blocks = [];
    for (const ns of components.values()) {
      const set = new Set(ns.map((n) => n.id)),
        b = await componentLayout(
          ns,
          ancestry.filter((e) => set.has(e.source)),
          engine,
          traditions,
        );
      b.key = ns
        .map((n) => n.id)
        .sort()
        .join(",");
      b.group =
        traditions.find((t) => ns.some((n) => t.members.includes(n.id)))?.id ||
        "~";
      blocks.push(b);
    }
    const out = {
      nodes: [],
      edges: [],
      associations: edges.filter((e) => !directed(e)),
      bands: [],
      w: 0,
      h: 0,
    };
    const trees = blocks
      .filter((b) => b.nodes.length > 1)
      .sort(
        (a, b) =>
          b.nodes.length - a.nodes.length || a.group.localeCompare(b.group),
      );
    let x = 40,
      y = 60,
      rowH = 0,
      count = 0;
    for (const b of trees) {
      if (
        count >= (options.packingWidth ? 12 : 4) ||
        (count &&
          x + b.w >
            (options.packingWidth ||
              Math.max(2600, ...trees.map((t) => t.w + 100))))
      ) {
        x = 40;
        y += rowH + 40;
        rowH = 0;
        count = 0;
      }
      out.nodes.push(...b.nodes.map((n) => ({ ...n, x: n.x + x, y: n.y + y })));
      out.edges.push(
        ...b.edges.map((e) => ({
          ...e,
          points: e.points.map((p) => ({ x: p.x + x, y: p.y + y })),
        })),
      );
      out.w = Math.max(out.w, x + b.w + 40);
      out.h = Math.max(out.h, y + b.h + 40);
      x += b.w + 60;
      rowH = Math.max(rowH, b.h);
      count++;
    }
    const loose = blocks
      .filter((b) => b.nodes.length === 1)
      .sort(
        (a, b) => a.group.localeCompare(b.group) || a.key.localeCompare(b.key),
      );
    let looseY = out.h ? out.h + 35 : 60,
      looseX = 40,
      col = 0,
      lastGroup = null;
    for (const b of loose) {
      if (
        !options.packingWidth &&
        lastGroup !== null &&
        b.group !== lastGroup &&
        col
      ) {
        col = 0;
        looseX = 40;
        looseY += H + 40;
      }
      const n = b.nodes[0];
      n.x = looseX;
      n.y = looseY;
      out.nodes.push(n);
      out.w = Math.max(out.w, n.x + W + 40);
      out.h = Math.max(out.h, n.y + H + 40);
      looseX += W + 64;
      if (
        ++col ===
        (options.packingWidth
          ? Math.min(20, Math.max(9, Math.floor(options.packingWidth / 208)))
          : 9)
      ) {
        col = 0;
        looseX = 40;
        looseY += H + 40;
      }
      lastGroup = b.group;
    }
    // Pure comparisons share a row; they never create extra generations or routed lines.
    const peerPlacements = edges.filter((e) => e.type === "similarity");
    for (const t of traditions) {
      const present = out.nodes.filter((n) => t.members.includes(n.id));
      if (present.length < 2 || present.length > 3) continue;
      const anchored = present
        .filter((n) => !loose.some((b) => b.nodes[0] === n))
        .sort((a, b) => a.y - b.y);
      if (anchored.length)
        for (const n of present.filter((n) =>
          loose.some((b) => b.nodes[0] === n),
        ))
          peerPlacements.push({ source: anchored[0].id, target: n.id });
    }
    for (const e of peerPlacements) {
      const n = out.nodes.find((n) => n.id === e.target),
        other = out.nodes.find((n) => n.id === e.source);
      if (!loose.some((b) => b.nodes[0] === n)) continue;
      for (let k = 1; k < 100; k++) {
        const xx = other.x + k * (W + 64);
        if (
          out.nodes.some(
            (z) =>
              z !== n &&
              xx < z.x + W + 25 &&
              xx + W + 25 > z.x &&
              other.y < z.y + H + 30 &&
              other.y + H + 30 > z.y,
          )
        )
          continue;
        if (
          out.edges.some((r) =>
            r.points.some((v, i) => {
              if (!i) return false;
              const u = r.points[i - 1];
              return u.x === v.x
                ? u.x > xx - 20 &&
                    u.x < xx + W + 20 &&
                    Math.max(u.y, v.y) > other.y - 30 &&
                    Math.min(u.y, v.y) < other.y + H + 14
                : u.y > other.y - 30 &&
                    u.y < other.y + H + 14 &&
                    Math.max(u.x, v.x) > xx - 20 &&
                    Math.min(u.x, v.x) < xx + W + 20;
            }),
          )
        )
          continue;
        n.x = xx;
        n.y = other.y;
        out.w = Math.max(out.w, n.x + W + 40);
        break;
      }
    }
    const comparisons = edges
      .filter((e) => e.type === "similarity")
      .map((e, i) => ({
        id: "lookalike-" + i,
        name: "Visual resemblance",
        members: [e.source, e.target],
      }));
    out.bands = traditionBands(out.nodes, [...traditions, ...comparisons]);
    out.w = Math.max(
      0,
      ...out.nodes.map((n) => n.x + W + 40),
      ...out.edges.flatMap((e) => e.points.map((p) => p.x + 40)),
    );
    out.h = Math.max(
      0,
      ...out.nodes.map((n) => n.y + H + 40),
      ...out.edges.flatMap((e) => e.points.map((p) => p.y + 40)),
    );
    return out;
  }
  async function atlasLayout(nodes, edges, families, engine, traditions = []) {
    const main = largestComponent(nodes, edges),
      selected = new Set(main.map((n) => n.id));
    const upper = await treeLayout(main, edges, engine, traditions);
    const rest = nodes.filter((n) => !selected.has(n.id));
    const lower = await treeLayout(rest, edges, engine, traditions, {
      packingWidth: Math.min(10000, upper.w),
    });
    const gap = 180,
      dy = upper.h + gap;
    const out = {
      ...upper,
      nodes: [
        ...upper.nodes,
        ...lower.nodes.map((n) => ({ ...n, y: n.y + dy })),
      ],
      edges: [
        ...upper.edges,
        ...lower.edges.map((r) => ({
          ...r,
          points: r.points.map((p) => ({ ...p, y: p.y + dy })),
        })),
      ],
      bands: [
        ...upper.bands,
        ...lower.bands.map((b) => ({ ...b, y: b.y + dy })),
      ],
      associations: [...upper.associations, ...lower.associations],
      w: Math.max(upper.w, lower.w),
      h: dy + lower.h,
      sections: [
        { name: "Largest connected component", x: 40, y: 28 },
        { name: "Other chains and flags", x: 40, y: dy - 60 },
      ],
    };
    return out;
  }
  root.FlagLayout = {
    treeLayout,
    atlasLayout,
    largestComponent,
    familyNodes,
    fullLineage,
    reducedEdges,
    W,
    H,
  };
  if (typeof module !== "undefined") module.exports = root.FlagLayout;
})(typeof window !== "undefined" ? window : globalThis);
