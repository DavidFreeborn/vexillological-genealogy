const fs = require("fs"),
  assert = require("assert"),
  ELK = require("../dist/elk.bundled.js"),
  L = require("../dist/layout.js");
const data = JSON.parse(fs.readFileSync("dist/data.json")),
  ids = new Set(data.nodes.map((n) => n.id));
assert.equal(ids.size, data.nodes.length);
assert.equal(data.nodes.filter((n) => n.status === "current").length, 195);
for (const n of data.nodes) {
  assert(
    n.image ? fs.existsSync("dist/" + n.image) : n.imageText?.length,
    n.id,
  );
  assert(data.families.some((f) => f.id === n.family));
  assert(n.sources.length);
}
for (const e of data.edges) {
  assert(ids.has(e.source) && ids.has(e.target));
  assert(e.url);
}
function audit(s) {
  for (const r of s.edges) {
    const pts = r.points;
    assert(pts.length >= 2);
    if (!["family", "similarity"].includes(r.edge.type))
      assert(
        pts.at(-1).y >= pts[0].y,
        "Upward ancestry: " + r.edge.source + " to " + r.edge.target,
      );
    for (const n of s.nodes.filter(
      (n) =>
        n.panel === r.panel && ![r.edge.source, r.edge.target].includes(n.id),
    ))
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i];
        assert(
          Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.y - b.y) < 1e-6,
          JSON.stringify({
            edge: r.edge.source + " to " + r.edge.target,
            a,
            b,
          }),
        );
        const hit =
          (a.x === b.x &&
            a.x > n.x + 0.01 &&
            a.x < n.x + 144 - 0.01 &&
            Math.max(a.y, b.y) > n.y + 0.01 &&
            Math.min(a.y, b.y) < n.y + 124 - 0.01) ||
          (a.y === b.y &&
            a.y > n.y + 0.01 &&
            a.y < n.y + 124 - 0.01 &&
            Math.max(a.x, b.x) > n.x + 0.01 &&
            Math.min(a.x, b.x) < n.x + 144 - 0.01);
        assert(
          !hit,
          `Route crosses ${n.id}: ${r.edge.source} to ${r.edge.target}`,
        );
      }
  }
}
const presets = { revision: data.layoutRevision, scenes: {} };
(async () => {
  let checks = 0;
  for (const shared of [false, true]) {
    const edges = data.edges.filter(
        (e) => e.type !== "similarity" && (shared || e.type !== "family"),
      ),
      traditions = shared ? data.traditions : [];
    const scene = await L.atlasLayout(
      data.nodes,
      edges,
      data.families,
      new ELK(),
      traditions,
    );
    audit(scene);
    assert.equal(scene.nodes.length, ids.size, "Whole atlas repeats flags");
    const mainIds = new Set(
      L.largestComponent(data.nodes, edges).map((n) => n.id),
    );
    assert(
      Math.max(
        ...scene.nodes.filter((n) => mainIds.has(n.id)).map((n) => n.y + 124),
      ) <
        Math.min(
          ...scene.nodes.filter((n) => !mainIds.has(n.id)).map((n) => n.y),
        ),
      "Smaller chains must follow the largest component",
    );
    for (const e of edges.filter(
      (e) => !["family", "similarity"].includes(e.type),
    )) {
      const seen = new Set([e.source]),
        q = [e.source];
      for (let i = 0; i < q.length; i++)
        for (const r of scene.edges)
          if (
            r.edge.source === q[i] &&
            !seen.has(r.edge.target) &&
            (e.type === "probable" || r.edge.type !== "probable")
          ) {
            seen.add(r.edge.target);
            q.push(r.edge.target);
          }
      assert(
        seen.has(e.target),
        "Whole atlas lost " + e.source + " to " + e.target,
      );
    }

    if (shared) presets.scenes.all = scene;
    assert.equal(new Set(scene.nodes.map((n) => n.id)).size, ids.size);
    checks++;
    for (const f of [...data.families, { id: "largest" }]) {
      const ns =
        f.id === "largest"
          ? L.largestComponent(data.nodes, edges)
          : L.familyNodes(data.nodes, edges, f);
      const s = await L.treeLayout(ns, edges, new ELK(), traditions, {
        layoutRows: f.layoutRows,
      });
      audit(s);
      if (shared) presets.scenes[f.id] = s;
      const chosen = new Set(ns.map((n) => n.id));
      const expected = edges.filter(
        (e) =>
          !["family", "similarity"].includes(e.type) &&
          chosen.has(e.source) &&
          chosen.has(e.target),
      );
      assert.equal(
        s.edges.length,
        L.reducedEdges(expected).length,
        "Missing ancestry in " + f.id,
      );
      for (const claim of expected) {
        const q = [claim.source],
          seen = new Set(q);
        for (let i = 0; i < q.length; i++)
          for (const r of s.edges) {
            const e = r.edge;
            if (
              e.source === q[i] &&
              (claim.type === "probable" || e.type !== "probable") &&
              !seen.has(e.target)
            ) {
              seen.add(e.target);
              q.push(e.target);
            }
          }
        assert(
          seen.has(claim.target),
          "Lost ancestry path: " + claim.source + " → " + claim.target,
        );
      }
      if (f.id === "largest")
        assert.equal(
          L.largestComponent(
            ns,
            s.edges.map((r) => r.edge),
          ).length,
          ns.length,
        );
      if (f.id === "us-states" && shared)
        assert.equal(
          s.bands.filter((b) => b.tradition === "seal-blue").length,
          1,
        );
      for (let i = 0; i < s.nodes.length; i++)
        for (let j = i + 1; j < s.nodes.length; j++) {
          const a = s.nodes[i],
            b = s.nodes[j];
          assert(
            !(
              a.x < b.x + 144 &&
              a.x + 144 > b.x &&
              a.y < b.y + 124 &&
              a.y + 124 > b.y
            ),
            "Overlapping flags",
          );
        }
      console.log(
        f.id,
        ns.length,
        Math.round(s.w),
        Math.round(s.h),
        "bands",
        s.bands.length,
      );
      checks++;
    }
  }
  for (const id of ["nordic", "european", "french", "nusantara"]) {
    const f = data.families.find((f) => f.id === id);
    if (!f) continue;
    const ns = L.familyNodes(data.nodes, data.edges, f);
    audit(await L.treeLayout(ns, data.edges, new ELK(), data.traditions));
    checks++;
  }
  for (const [family, tradition, count] of [
    ["nordic", "nordic-cross", 3],
    ["african", "african-foundations", 3],
    ["red", "soviet-republics", 15],
    ["turkic", "turkic-sky", 5],
  ]) {
    const scene = presets.scenes[family];
    if (tradition === "nordic-cross")
      assert(
        scene.bands.some((b) =>
          ["fi", "se", "no"].every((id) => b.members.includes(id)),
        ),
      );
    else
      assert(
        scene.bands.some(
          (b) => b.tradition === tradition && b.members.length === count,
        ),
        tradition + " split",
      );
  }
  fs.writeFileSync("dist/layouts.json", JSON.stringify(presets));
  const covered = new Set(
    data.families
      .filter((f) => f.id !== "independent")
      .flatMap((f) =>
        L.familyNodes(
          data.nodes,
          data.edges.filter((e) => e.type !== "similarity"),
          f,
        ).map((n) => n.id),
      ),
  );
  assert(
    data.nodes
      .filter((n) => n.families.includes("independent"))
      .every((n) => !covered.has(n.id)),
    "Other flags overlap named collections",
  );
  for (const [root, predecessor] of [
    ["us-mn", "us-mn-1983"],
    ["russia1991", "rsfsr1954"],
    ["cz", "czechoslovakia"],
  ])
    assert(
      L.fullLineage(data.nodes, data.edges, root).some(
        (n) => n.id === predecessor,
      ),
      root + " predecessor missing",
    );
  console.log(
    `${data.nodes.length} flags, ${data.edges.length} relationships. ${checks} layouts checked: zero route crossings through flags; zero upward ancestry arrows; complete atlas coverage.`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
