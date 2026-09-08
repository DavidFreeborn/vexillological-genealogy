"use strict";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const types = {
  documented: { label: "Documented influence", color: "#4b6558", dash: "" },
  probable: { label: "Uncertain / debated", color: "#916928", dash: "1 5" },
  redesign: { label: "Redesign / succession", color: "#726083", dash: "" },
  family: { label: "Shared tradition", color: "#637d90", dash: "10 5" },
  similarity: { label: "Lookalike", color: "#b22d77", dash: "1 13" },
};
let presets = null;
let edgeIndexes = new WeakMap(),
  lineageIndexes = {
    forward: new Map(),
    backward: new Map(),
    shared: new Map(),
  };
const edgeKey = (e) => e.source + "|" + e.target + "|" + e.type;
let data,
  byId,
  families,
  state = { family: "all", view: "network", selected: null, focus: null },
  positions = new Map(),
  bounds = { w: 1000, h: 700 },
  camera = { x: 0, y: 0, k: 1 },
  visible = [],
  shownEdges = [];
const imageMarkup = (n, cls = "") =>
  n.image
    ? `<img class="${cls}" src="${esc(n.image)}" alt="Flag of ${esc(n.name)}">`
    : `<span class="unillustrated ${cls}">${esc((n.imageText || ["Historical text record"]).join(" · "))}</span>`;
const directed = (e) =>
  ["documented", "probable", "redesign", "claimed"].includes(e.type);
const date = (n) =>
  n.dateLabel ||
  (n.year
    ? n.end
      ? `${n.year}–${n.end}`
      : `Design from ${n.year}`
    : "Traditional design");
let scene = { nodes: [], edges: [], panels: [] },
  renderVersion = 0;
const engine = new ELK({
    workerUrl:
      typeof OFFLINE_WORKER_SOURCE !== "undefined"
        ? URL.createObjectURL(
            new Blob([OFFLINE_WORKER_SOURCE], { type: "text/javascript" }),
          )
        : "elk-worker.min.js",
  }),
  layoutCache = new Map();
function arrange(kind) {
  return kind === "atlas"
    ? FlagLayout.atlasLayout(
        visible,
        shownEdges,
        data.families,
        engine,
        $("family-links").checked ? data.traditions : [],
      )
    : FlagLayout.treeLayout(
        visible,
        shownEdges,
        engine,
        $("family-links").checked ? data.traditions : [],
        state.focus
          ? {}
          : { layoutRows: families.get(state.family)?.layoutRows },
      );
}
function eligible(n) {
  return $("historical").checked || n.status === "current";
}
function edgeEligible(e) {
  return (
    (!["probable", "claimed"].includes(e.type) || $("uncertain").checked) &&
    (e.type !== "similarity" || $("similarity").checked) &&
    (e.type !== "family" || $("family-links").checked)
  );
}
function getNodes() {
  let list = data.nodes.filter(eligible);
  if (state.focus)
    return FlagLayout.fullLineage(
      list,
      data.edges.filter(edgeEligible),
      state.focus,
    );
  if (state.family === "largest")
    return FlagLayout.largestComponent(list, data.edges.filter(edgeEligible));
  if (state.family !== "all")
    return FlagLayout.familyNodes(
      list,
      data.edges.filter(edgeEligible),
      families.get(state.family),
      true,
    );
  return list;
}
async function render(refit = true) {
  const version = ++renderVersion;
  visible = getNodes();
  const ids = new Set(visible.map((n) => n.id));
  shownEdges = data.edges.filter(
    (e) => ids.has(e.source) && ids.has(e.target) && edgeEligible(e),
  );
  lineageIndexes = {
    forward: new Map(),
    backward: new Map(),
    shared: new Map(),
  };
  const add = (map, a, b) => {
    if (!map.has(a)) map.set(a, []);
    map.get(a).push(b);
  };
  for (const e of shownEdges)
    if (directed(e)) {
      add(lineageIndexes.forward, e.source, e.target);
      add(lineageIndexes.backward, e.target, e.source);
    } else {
      add(lineageIndexes.shared, e.source, e.target);
      add(lineageIndexes.shared, e.target, e.source);
    }
  const fam = families.get(state.family);
  $("view-title").textContent = state.focus
    ? byId.get(state.focus).name
    : state.family === "all"
      ? "Whole atlas"
      : state.family === "largest"
        ? "Largest connected component"
        : fam.name;
  $("view-description").textContent = state.focus
    ? "Ancestors, descendants and recorded relatives."
    : state.family === "all"
      ? ""
      : state.family === "largest"
        ? "The largest connected tree of influence and redesign."
        : fam.description;
  let related = $("related-views");
  if (!related) {
    related = document.createElement("div");
    related.id = "related-views";
    $("view-description").after(related);
  }
  related.replaceChildren();
  if (!state.focus)
    for (const id of fam?.relatedViews || []) {
      const b = document.createElement("button");
      b.className = "tag";
      b.textContent = families.get(id).name + " ↗";
      b.onclick = () => chooseFamily(id);
      related.append(b);
    }
  document.querySelectorAll("[data-family]").forEach((b) => {
    b.classList.toggle(
      "active",
      b.dataset.family === state.family && !state.focus,
    );
    b.setAttribute("aria-pressed", b.classList.contains("active"));
  });
  if ($("family-select")) $("family-select").value = state.family;
  $("network-tab").classList.toggle("active", state.view === "network");
  $("gallery-tab").classList.toggle("active", state.view === "gallery");
  $("network-tab").setAttribute("aria-pressed", state.view === "network");
  $("gallery-tab").setAttribute("aria-pressed", state.view === "gallery");
  $("network").toggleAttribute("hidden", state.view !== "network");
  $("gallery").hidden = state.view !== "gallery";
  document.querySelector(".map-tools").hidden = state.view !== "network";
  $("empty").hidden = visible.length > 0;
  $("empty").textContent = "No flags match these filters.";
  if (state.view === "gallery") {
    renderGallery();
    return;
  }
  $("loading").hidden = false;
  try {
    const key = JSON.stringify([
      state.family,
      state.focus,
      $("family-links").checked,
      visible.map((n) => n.id),
      shownEdges.map((e) => edgeIndexes.get(e)),
    ]);
    let next = layoutCache.get(key);
    if (
      !next &&
      presets?.revision === data.layoutRevision &&
      !state.focus &&
      $("historical").checked &&
      $("uncertain").checked &&
      $("family-links").checked &&
      !$("similarity").checked
    )
      next = presets.scenes[state.family];
    if (!next) {
      next =
        state.family === "all" && !state.focus
          ? await arrange("atlas")
          : await arrange("tree");
      layoutCache.set(key, next);
      if (layoutCache.size > 32)
        layoutCache.delete(layoutCache.keys().next().value);
    }
    if (version !== renderVersion) return;
    scene = next;
    bounds = { w: scene.w, h: scene.h };
    positions.clear();
    scene.nodes.forEach((n) => {
      if (!positions.has(n.id)) positions.set(n.id, n);
    });
    draw();
    if (refit) openView();
  } catch (e) {
    console.error(e);
    $("empty").hidden = false;
    $("empty").textContent =
      "The network could not be arranged. The flag index remains available.";
  } finally {
    if (version === renderVersion) $("loading").hidden = true;
  }
}
function wrap(s, len = 19) {
  const words = s.split(" "),
    lines = [""];
  for (const w of words) {
    let i = lines.length - 1;
    if ((lines[i] + " " + w).trim().length > len && lines[i]) lines.push(w);
    else lines[i] += (lines[i] ? " " : "") + w;
  }
  return lines.length > 2
    ? [lines[0], lines.slice(1).join(" ").slice(0, 22) + "…"]
    : lines;
}
const shortFamily = {
  nordic: "Nordic cross",
  british: "British ensigns",
  american: "Stars & stripes",
  french: "Tricolours",
  slavic: "Slavic colours",
  african: "Pan-African",
  arab: "Pan-Arab",
  gulf: "Gulf",
  latin: "Latin America",
  crescent: "Crescents",
  red: "Revolutionary red",
  un: "United Nations",
  nusantara: "Nusantara",
  german: "German flags",
  european: "European emblems",
  "southern-cross": "Southern Cross",
  "us-states": "US states",
  "canada-provinces": "Canada",
  "german-states": "German states",
  "australian-states": "Australia",
  "europe-regions": "European regions",
  independent: "Other traditions",
};
function draw() {
  let html = "";
  for (const p of scene.panels || [])
    html += `<g data-cluster="${p.family}" tabindex="0" role="button" aria-label="Open ${esc(p.name)}" style="cursor:pointer"><path class="panel-rule" d="M${p.x},${p.y + 230} H${p.x + p.w}"/><text class="panel-title" x="${p.x + 20}" y="${p.y + 170}">${esc(shortFamily[p.family] || p.name)}</text></g>`;
  for (const section of scene.sections || [])
    html += `<text class="atlas-section" x="${section.x}" y="${section.y}">${esc(section.name)}</text>`;
  for (const [i, b] of (scene.bands || []).entries())
    html += `<g class="tradition-band ${b.tradition.startsWith("lookalike-") ? "comparison-band" : ""}" data-band="${i}" tabindex="0" role="button" aria-label="${esc(b.name)}"><title>${esc(b.name)}: ${b.members.map((id) => esc(byId.get(id).name)).join(", ")}</title><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="5"/></g>`;
  scene.edges.forEach((route, i) => {
    const e = route.edge,
      t = types[e.type];
    const path = route.points
      .map((p, j) => `${j ? "L" : "M"}${p.x},${p.y}`)
      .join(" ");
    html += `<g class="edge-group" data-route="${i}" tabindex="0" role="button" aria-label="${esc(byId.get(e.source).name)} to ${esc(byId.get(e.target).name)}: ${esc(t.label)}"><title>${esc(byId.get(e.source).name)} ${directed(e) ? "→" : "↔"} ${esc(byId.get(e.target).name)}: ${esc(t.label)}. ${esc(e.note)}</title><path class="edge-halo" d="${path}"/><path class="edge" d="${path}" stroke="${t.color}" stroke-dasharray="${t.dash}" ${directed(e) ? 'marker-end="url(#arrow)"' : ""}/><path class="edge-hit" d="${path}"/></g>`;
  });
  for (const b of scene.bands || [])
    if (b.showLabel)
      html += `<g class="band-caption" pointer-events="none"><rect x="${b.x + 6}" y="${b.y + 2}" width="${Math.min(b.w - 12, b.name.length * 7 + 16)}" height="22" fill="#f5f8fa"/><text x="${b.x + 12}" y="${b.y + 17}">${esc(b.name)}</text></g>`;
  for (const p of scene.nodes) {
    const n = byId.get(p.id),
      lines = wrap(n.name, 19),
      portal = p.panel && p.panel !== n.family;
    html += `<g class="flag-node ${state.selected === n.id ? "selected" : ""}" data-node="${n.id}" tabindex="0" role="button" aria-label="${esc(n.name)}, ${esc(date(n))}${portal ? ", repeated ancestor" : ""}" transform="translate(${p.x},${p.y})"><title>${esc(n.name)} · ${esc(date(n))}${portal ? " · Shared ancestor" : ""}</title><rect class="node-card" width="144" height="124"/>${n.image ? `<image href="${esc(n.image)}" x="19" y="7" width="106" height="61" preserveAspectRatio="xMidYMid meet"/>` : `<text class="unillustrated-node" x="72" y="25">${(n.imageText || ["Text record"]).map((line, i) => `<tspan x="72" dy="${i ? 17 : 10}">${esc(line)}</tspan>`).join("")}</text>`}${lines.map((l, i) => `<text class="node-label" x="72" y="${86 + i * 17}">${esc(l)}</text>`).join("")}<text class="node-year" x="72" y="${lines.length > 1 ? 120 : 106}">${esc(date(n))}</text>${portal ? '<path d="M135 7 L139 7 L139 12" fill="none" stroke="#466550"/>' : ""}</g>`;
  }
  $("world").innerHTML = html;
  panelElements = [...$("world").querySelectorAll(".panel-title")];
  lastScale = -1;
  transform();
  $("world")
    .querySelectorAll("[data-band]")
    .forEach((g) => {
      const open = () => showTradition(scene.bands[+g.dataset.band]);
      g.onclick = (ev) => {
        if (dragMoved) return;
        ev.stopPropagation();
        open();
      };
      g.onkeydown = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          open();
        }
      };
    });
  $("world")
    .querySelectorAll("[data-node]")
    .forEach((g) => {
      g.onclick = (ev) => {
        if (dragMoved) return;
        ev.stopPropagation();
        select(g.dataset.node);
      };
      g.onkeydown = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          select(g.dataset.node);
        }
      };
    });
  $("world")
    .querySelectorAll("[data-route]")
    .forEach((g) => {
      const e = scene.edges[+g.dataset.route].edge;
      g.onclick = (ev) => {
        if (dragMoved) return;
        ev.stopPropagation();
        edgeDetail(e);
        highlightEdge(e);
      };
      g.onkeydown = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          edgeDetail(e);
          highlightEdge(e);
        }
      };
    });
  $("world")
    .querySelectorAll("[data-cluster]")
    .forEach((g) => {
      g.onclick = () => {
        if (!dragMoved) chooseFamily(g.dataset.cluster);
      };
      g.onkeydown = (ev) => {
        if (ev.key === "Enter") chooseFamily(g.dataset.cluster);
      };
    });
  highlight(state.selected);
}
function lineageSet(id) {
  const set = new Set(id ? [id] : []);
  if (!id) return set;
  for (const map of [lineageIndexes.forward, lineageIndexes.backward]) {
    const q = [id],
      seen = new Set(q);
    for (let i = 0; i < q.length; i++)
      for (const next of map.get(q[i]) || [])
        if (!seen.has(next)) {
          seen.add(next);
          set.add(next);
          q.push(next);
        }
  }
  for (const next of lineageIndexes.shared.get(id) || []) set.add(next);
  return set;
}
function highlight(id) {
  const set = lineageSet(id);
  $("world")
    .querySelectorAll("[data-node]")
    .forEach(
      (g) => (
        g.classList.toggle("muted", !!id && !set.has(g.dataset.node)),
        g.classList.toggle("selected", g.dataset.node === id)
      ),
    );
  $("world")
    .querySelectorAll("[data-route]")
    .forEach((g) => {
      const e = scene.edges[+g.dataset.route].edge,
        on = set.has(e.source) && set.has(e.target);
      g.classList.toggle("muted", !!id && !on);
      g.classList.toggle("active", !!id && on);
    });
}
function highlightEdge(edge) {
  $("world")
    .querySelectorAll("[data-node]")
    .forEach((g) =>
      g.classList.toggle(
        "muted",
        ![edge.source, edge.target].includes(g.dataset.node),
      ),
    );
  $("world")
    .querySelectorAll("[data-route]")
    .forEach((g) => {
      const on = edgeKey(scene.edges[+g.dataset.route].edge) === edgeKey(edge);
      g.classList.toggle("muted", !on);
      g.classList.toggle("active", on);
    });
}
function renderGallery() {
  const ns = [...visible].sort((a, b) => a.name.localeCompare(b.name));
  $("gallery").innerHTML =
    `<h2 class="gallery-group-title">${ns.length} flags <span>· alphabetical index</span></h2><div class="gallery-grid">${ns.map((n) => `<button class="flag-tile ${state.selected === n.id ? "selected" : ""}" data-id="${n.id}">${imageMarkup(n)}<strong>${esc(n.name)}</strong><small>${esc(date(n))}${n.status === "historical" ? " · historical" : ""}</small></button>`).join("")}</div>`;
  $("gallery")
    .querySelectorAll("[data-id]")
    .forEach((b) => (b.onclick = () => select(b.dataset.id)));
}
function chooseFamily(id) {
  state.family = id;
  state.focus = null;
  state.selected = null;
  $("detail").hidden = true;
  location.hash = "family=" + id;
  render();
}
function select(id) {
  state.selected = id;
  const n = byId.get(id);
  const es = data.edges.filter((e) => e.source === id || e.target === id);
  $("detail").hidden = false;
  $("detail").innerHTML =
    `<button class="close" id="close-detail" aria-label="Close details">×</button>${imageMarkup(n, "detail-flag")}<span class="tag">${n.role || (n.status === "current" ? "National flag" : n.status === "historical" ? "Historical flag" : "Regional / related flag")}</span><h2>${esc(n.name)}</h2><div class="detail-date">${esc(date(n))}</div><p>${esc(n.note)}</p><div>${n.families.map((f) => `<button class="tag" data-goto-family="${f}">${esc(families.get(f).name)}</button>`).join("")}</div><div class="detail-actions"><button id="trace">Trace full lineage ↗</button></div><div class="detail-subtitle">${es.length} recorded connections</div>${es.length ? es.map((e) => relation(e, id)).join("") : ""}<div class="detail-subtitle">Flag history & illustration</div>${n.imageCredit ? `<p style="font-size:12px">Image: ${esc(n.imageCredit)}</p>` : ""}<ul class="source-list">${n.sources.map((u, i) => `<li><a class="source" href="${esc(u)}" target="_blank" rel="noopener">${i ? "Additional reference" : "Read flag history"} ↗</a></li>`).join("")}${n.imageSource ? `<li><a class="source" href="${esc(n.imageSource)}" target="_blank" rel="noopener">Illustration source & licence ↗</a></li>` : ""}</ul>`;
  $("close-detail").onclick = closeDetail;
  $("trace").onclick = () => {
    state.focus = id;
    state.view = "network";
    location.hash = "flag=" + id;
    render();
  };
  $("detail")
    .querySelectorAll("[data-other]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          select(b.dataset.other);
          if (!visible.some((n) => n.id === b.dataset.other)) {
            state.focus = b.dataset.other;
            render();
          }
        }),
    );
  $("detail")
    .querySelectorAll("[data-goto-family]")
    .forEach((b) => (b.onclick = () => chooseFamily(b.dataset.gotoFamily)));
  if (state.view === "network") {
    highlight(state.selected);
  } else renderGallery();
}
function showTradition(b) {
  const t = (data.traditions || []).find((t) => t.id === b.tradition),
    members = t ? t.members : b.members,
    ns = members.map((id) => byId.get(id)).filter(Boolean);
  $("detail").hidden = false;
  state.selected = null;
  $("detail").innerHTML =
    `<button class="close" id="close-detail" aria-label="Close details">×</button><span class="tag">${t ? "Shared tradition" : "Visual resemblance"}</span><h2>${esc(b.name)}</h2>${t ? `<p>${esc(t.description)}</p>` : ""}<div class="tradition-members">${ns.map((n) => `<button data-member="${n.id}">${imageMarkup(n)}<span>${esc(n.name)}</span></button>`).join("")}</div>${(t?.sources || []).map((u) => `<p><a class="source" href="${esc(u)}" target="_blank" rel="noopener">Tradition source ↗</a></p>`).join("")}`;
  $("close-detail").onclick = closeDetail;
  $("detail")
    .querySelectorAll("[data-member]")
    .forEach((b) => (b.onclick = () => select(b.dataset.member)));
  const set = new Set(members);
  $("world")
    .querySelectorAll("[data-node]")
    .forEach((g) => g.classList.toggle("muted", !set.has(g.dataset.node)));
  $("world")
    .querySelectorAll("[data-route]")
    .forEach((g) => g.classList.remove("muted", "active"));
}
function relation(e, id) {
  const other = e.source === id ? e.target : e.source,
    from = e.source === id;
  return `<div class="relation"><small style="color:${types[e.type].color}">${esc(types[e.type].label)}</small><div style="margin-top:7px"><button data-other="${other}">${directed(e) ? (from ? "To: " : "From: ") : "Related: "}${esc(byId.get(other).name)} ${directed(e) ? "→" : "↔"}</button></div><p>${esc(e.note)}</p><a class="source" href="${esc(e.url)}" target="_blank" rel="noopener">Relationship source ↗</a>${e.claimSource ? ` · <a class="source" href="${esc(e.claimSource)}" target="_blank" rel="noopener">Original claim ↗</a>` : ""}</div>`;
}
function edgeDetail(e) {
  $("detail").hidden = false;
  $("detail").innerHTML =
    `<button class="close" id="close-detail" aria-label="Close details">×</button><div class="eyebrow" style="margin-top:40px;color:${types[e.type].color}">${esc(types[e.type].label)}</div><div style="display:flex;gap:18px;align-items:center;margin:25px 0">${imageMarkup(byId.get(e.source), "edge-detail-image")}<span>${directed(e) ? "→" : "↔"}</span>${imageMarkup(byId.get(e.target), "edge-detail-image")}</div><h2>${esc(byId.get(e.source).name)}</h2><p>${directed(e) ? "to" : "and"}</p><h2>${esc(byId.get(e.target).name)}</h2><p>${esc(e.note)}</p><a class="source" href="${esc(e.url)}" target="_blank" rel="noopener">Read the relationship source ↗</a>${e.claimSource ? `<p><a class="source" href="${esc(e.claimSource)}" target="_blank" rel="noopener">Original unconfirmed claim ↗</a></p>` : ""}<div class="detail-actions"><button id="edge-source">Explore source</button><button id="edge-target">Explore ${directed(e) ? "descendant" : "relative"}</button></div>`;
  $("close-detail").onclick = closeDetail;
  $("edge-source").onclick = () => select(e.source);
  $("edge-target").onclick = () => select(e.target);
}
function centerOn(id) {
  const pos = positions.get(id),
    r = $("network").getBoundingClientRect();
  if (!pos) return;
  camera.x = r.width / 2 - (pos.x + 72) * camera.k;
  camera.y = (r.height - 45) / 2 - (pos.y + 62) * camera.k;
  transform();
}
function closeDetail() {
  $("detail").hidden = true;
  state.selected = null;
  if (state.view === "network") {
    highlight(state.selected);
  } else renderGallery();
}
function openView() {
  fit();
  if (state.family === "all" || state.focus || camera.k >= 0.72) return;
  camera.k = 0.72;
  const r = $("network").getBoundingClientRect();
  const ids = families.get(state.family)?.cameraAnchors || [];
  let anchors = scene.nodes.filter((n) => ids.includes(n.id));
  if (!anchors.length) {
    const y = Math.min(...scene.nodes.map((n) => n.y));
    anchors = scene.nodes.filter((n) => n.y < y + 180);
  }
  const left = Math.min(...anchors.map((n) => n.x)),
    right = Math.max(...anchors.map((n) => n.x + 144));
  camera.x = r.width / 2 - ((left + right) / 2) * camera.k;
  camera.y = 72 - Math.min(...anchors.map((n) => n.y)) * camera.k;
  transform();
}
function fit() {
  const r = $("network").getBoundingClientRect();
  if (!r.width || !r.height) return;
  camera.k = Math.min(
    (r.width - 55) / bounds.w,
    (r.height - 100) / bounds.h,
    1.35,
  );
  camera.x = (r.width - bounds.w * camera.k) / 2;
  camera.y = Math.max(16, (r.height - 50 - bounds.h * camera.k) / 2);
  transform();
}
let paintFrame = 0,
  lastScale = -1,
  panelElements = [];
function transform() {
  if (paintFrame) return;
  paintFrame = requestAnimationFrame(() => {
    paintFrame = 0;
    const world = $("world");
    world.setAttribute(
      "transform",
      `translate(${camera.x},${camera.y}) scale(${camera.k})`,
    );
    if (lastScale !== camera.k) {
      lastScale = camera.k;
      world.classList.toggle("overview", camera.k < 0.2);
      world.style.setProperty(
        "--label-size",
        `${Math.min(21, Math.max(16, 14 / camera.k))}px`,
      );
      for (const t of panelElements)
        t.style.fontSize = `${Math.max(28, Math.min(170, 14 / camera.k))}px`;
    }
  });
}

function zoom(f, x, y) {
  const r = $("network").getBoundingClientRect();
  x ??= r.width / 2;
  y ??= r.height / 2;
  const old = camera.k;
  camera.k = Math.max(0.025, Math.min(4, old * f));
  camera.x = x - ((x - camera.x) * camera.k) / old;
  camera.y = y - ((y - camera.y) * camera.k) / old;
  transform();
}
let drag = null,
  dragMoved = false;
const pointers = new Map();
let pinch = null;
$("network").addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = Math.hypot(a.x - b.x, a.y - b.y);
    drag = null;
  } else {
    drag = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y };
    dragMoved = false;
  }
  if (!e.target.closest("[data-node],[data-route],[data-band],[data-cluster]"))
    $("network").setPointerCapture(e.pointerId);
});
$("network").addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()],
      dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch) {
      const r = $("network").getBoundingClientRect();
      zoom(dist / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    }
    pinch = dist;
    dragMoved = true;
    return;
  }
  if (!drag) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) {
    dragMoved = true;
    $("network").setPointerCapture(e.pointerId);
  }
  camera.x = drag.cx + dx;
  camera.y = drag.cy + dy;
  transform();
});
function stopPointer(e) {
  pointers.delete(e.pointerId);
  drag = null;
  pinch = null;
  setTimeout(() => (dragMoved = false), 0);
}
$("network").addEventListener("pointerup", stopPointer);
$("network").addEventListener("pointercancel", stopPointer);
$("network").addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const r = $("network").getBoundingClientRect();
    zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  },
  { passive: false },
);
$("readable").onclick = () => {
  zoom(1 / camera.k);
  if (state.selected) centerOn(state.selected);
};
$("network").addEventListener("keydown", (e) => {
  if (e.target !== $("network")) return;
  const delta = {
    ArrowLeft: [60, 0],
    ArrowRight: [-60, 0],
    ArrowUp: [0, 60],
    ArrowDown: [0, -60],
  }[e.key];
  if (delta) {
    e.preventDefault();
    camera.x += delta[0];
    camera.y += delta[1];
    transform();
  }
  if (e.key === "+" || e.key === "=") zoom(1.25);
  if (e.key === "-") zoom(0.8);
  if (e.key === "0") fit();
});
$("zoom-in").onclick = () => zoom(1.25);
$("zoom-out").onclick = () => zoom(0.8);
$("fit").onclick = fit;
$("network-tab").onclick = () => {
  state.view = "network";
  render();
};
$("gallery-tab").onclick = () => {
  state.view = "gallery";
  render();
};
$("reset").onclick = () => {
  state.focus = null;
  state.selected = null;
  $("detail").hidden = true;
  render();
};
["historical", "uncertain", "similarity", "family-links"].forEach(
  (id) => ($(id).onchange = () => render()),
);
$("search").addEventListener("input", () => {
  const q = $("search").value.trim().toLowerCase();
  $("search-results").hidden = !q;
  if (!q) return;
  const found = data.nodes
    .filter((n) =>
      (n.name + " " + n.id + " " + n.note).toLowerCase().includes(q),
    )
    .sort(
      (a, b) =>
        (b.name.toLowerCase().startsWith(q) ? 1 : 0) -
        (a.name.toLowerCase().startsWith(q) ? 1 : 0),
    )
    .slice(0, 30);
  $("search-results").innerHTML = found.length
    ? found
        .map(
          (n) =>
            `<button class="result" data-result="${n.id}">${imageMarkup(n)}<span>${esc(n.name)}<small>${esc(date(n))}</small></span></button>`,
        )
        .join("")
    : '<div class="no-results">No matching flag.</div>';
  $("search-results")
    .querySelectorAll("[data-result]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.result;
          $("search-results").hidden = true;
          $("search").value = "";
          state.family = byId.get(id).family;
          state.focus = id;
          state.view = "network";
          $("historical").checked = true;
          location.hash = "flag=" + id;
          render();
          select(id);
        }),
    );
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    $("search").focus();
  }
  if (e.key === "Escape") {
    $("search-results").hidden = true;
    if (!$("info-dialog").open) closeDetail();
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap") && !e.target.closest("#search-results"))
    $("search-results").hidden = true;
});
$("about").onclick = () => $("info-dialog").showModal();
$("close-info").onclick = () => $("info-dialog").close();
$("info-dialog").addEventListener("click", (e) => {
  if (e.target === $("info-dialog")) {
    const r = $("info-dialog").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("info-dialog").close();
  }
});
let previousStageSize = null;
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  if (data && state.view === "network" && width > 0 && height > 0) {
    if (previousStageSize) {
      // Preserve the world point at the centre when the viewport or panel changes.
      camera.x += (width - previousStageSize.width) / 2;
      camera.y += (height - previousStageSize.height) / 2;
    }
    transform();
  }
  previousStageSize = width > 0 && height > 0 ? { width, height } : null;
}).observe($("stage"));
Promise.all([
  fetch("data.json"),
  typeof OFFLINE_LAYOUTS !== "undefined"
    ? Promise.resolve(OFFLINE_LAYOUTS)
    : fetch("layouts.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
])
  .then(([r, p]) => {
    presets = p;
    return r;
  })
  .then((r) => {
    if (!r.ok) throw Error("Data unavailable");
    return r.json();
  })
  .then((d) => {
    data = d;
    edgeIndexes = new WeakMap(d.edges.map((e, i) => [e, i]));
    byId = new Map(d.nodes.map((n) => [n.id, n]));
    families = new Map(d.families.map((f) => [f.id, f]));
    $("families").innerHTML =
      `<select id="family-select" aria-label="Flag family"><option value="all">Whole atlas</option><option value="largest">Largest connected component</option>${d.families.map((f) => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}</select>` +
      d.families
        .map(
          (f) =>
            `${f.kind === "region" && d.families[d.families.indexOf(f) - 1]?.kind !== "region" ? '<div class="regional-nav-label">Regional flags</div>' : ""}${f.id === "independent" ? '<div class="other-nav-section">' : ""}<button class="family-btn" data-family="${f.id}">${esc(f.name)}</button>${f.id === "independent" ? "</div>" : ""}`,
        )
        .join("");
    $("family-select").onchange = (e) => chooseFamily(e.target.value);
    document
      .querySelectorAll("[data-family]")
      .forEach((b) => (b.onclick = () => chooseFamily(b.dataset.family)));
    const hash = new URLSearchParams(location.hash.slice(1));
    if (hash.get("family") === "german") hash.set("family", "french");
    if (
      families.has(hash.get("family")) ||
      ["all", "largest"].includes(hash.get("family"))
    )
      state.family = hash.get("family");
    if (byId.has(hash.get("flag"))) {
      state.focus = hash.get("flag");
      state.selected = state.focus;
    }
    render();
    if (state.selected) select(state.selected);
  })
  .catch((e) => {
    $("view-title").textContent = "The atlas could not load";
    $("view-description").textContent = "Please reload the page to try again.";
    console.error(e);
  });
