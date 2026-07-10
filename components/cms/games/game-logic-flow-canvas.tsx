"use client";

import { useMemo } from "react";
import {
  bonusTriggerLabel,
  groupLinksByLayerOnLink,
  parseBonusTrigger,
  parseLinkOverrides,
  roleLabelShort,
} from "@/lib/cms/game-link-config";
import { LAYER_DEFINITIONS, type StudioLayer } from "@/lib/cms/layer-model";
import { parseGpsOverride } from "@/lib/cms/gps-defaults";
import type { StudioGameTaskLink } from "@/lib/cms/types";

const NODE_W = 168;
const NODE_H = 92;
const NODE_GAP = 20;
const LAYER_HEADER = 36;
const LAYER_GAP = 56;
const PAD_X = 24;
const PAD_Y = 16;

type Point = { x: number; y: number };

type FlowEdge = {
  id: string;
  from: Point;
  to: Point;
  kind: "sequence" | "bonus" | "cross";
  label?: string;
};

type Props = {
  links: StudioGameTaskLink[];
  activeLayers: StudioLayer[];
};

function nodeTopLeft(layerIndex: number, nodeIndex: number): Point {
  return {
    x: PAD_X + nodeIndex * (NODE_W + NODE_GAP),
    y: PAD_Y + layerIndex * (NODE_H + LAYER_HEADER + LAYER_GAP),
  };
}

function nodeCenter(layerIndex: number, nodeIndex: number): Point {
  const tl = nodeTopLeft(layerIndex, nodeIndex);
  return { x: tl.x + NODE_W / 2, y: tl.y + NODE_H / 2 };
}

function nodeRight(layerIndex: number, nodeIndex: number): Point {
  const tl = nodeTopLeft(layerIndex, nodeIndex);
  return { x: tl.x + NODE_W, y: tl.y + NODE_H / 2 };
}

function nodeLeft(layerIndex: number, nodeIndex: number): Point {
  const tl = nodeTopLeft(layerIndex, nodeIndex);
  return { x: tl.x, y: tl.y + NODE_H / 2 };
}

function bezierPath(from: Point, to: Point, bend = 0.45): string {
  const dx = Math.max(Math.abs(to.x - from.x) * bend, 40);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

function crossLayerPath(from: Point, to: Point): string {
  const midY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

function buildEdges(
  activeLayers: StudioLayer[],
  grouped: Record<StudioLayer, StudioGameTaskLink[]>,
  taskTitleById: Map<string, string>,
): FlowEdge[] {
  const edges: FlowEdge[] = [];
  const layerIndex = (layer: StudioLayer) => activeLayers.indexOf(layer);

  const missionIdx = layerIndex(2);
  const bonusIdx = layerIndex(3);
  const geoIdx = layerIndex(1);

  if (missionIdx >= 0) {
    const missionLinks = grouped[2];
    for (let i = 0; i < missionLinks.length - 1; i += 1) {
      edges.push({
        id: `seq-${missionLinks[i].id}-${missionLinks[i + 1].id}`,
        from: nodeRight(missionIdx, i),
        to: nodeLeft(missionIdx, i + 1),
        kind: "sequence",
      });
    }
  }

  if (geoIdx >= 0 && missionIdx >= 0 && grouped[1].length > 0 && grouped[2].length > 0) {
    const geoCount = grouped[1].length;
    const missionCount = grouped[2].length;
    const pairs = Math.min(geoCount, missionCount);
    for (let i = 0; i < pairs; i += 1) {
      edges.push({
        id: `geo-mission-${grouped[1][i].id}-${grouped[2][i].id}`,
        from: nodeCenter(geoIdx, i),
        to: nodeCenter(missionIdx, i),
        kind: "cross",
        label: i === 0 ? "Freischaltung" : undefined,
      });
    }
  }

  if (bonusIdx >= 0) {
    const missionLinks = grouped[2];
    const missionByTaskId = new Map(missionLinks.map((l, i) => [l.task_id, i]));

    for (const link of grouped[3]) {
      const bonusNodeIndex = grouped[3].indexOf(link);
      const trigger = parseBonusTrigger(parseLinkOverrides(link.overrides));
      const bonusCenter = nodeCenter(bonusIdx, bonusNodeIndex);
      const label = bonusTriggerLabel(trigger, taskTitleById);

      if (trigger.type === "after_task_solved" && trigger.source_task_id) {
        const srcIndex = missionByTaskId.get(trigger.source_task_id);
        if (srcIndex !== undefined && missionIdx >= 0) {
          edges.push({
            id: `bonus-${trigger.source_task_id}-${link.id}`,
            from: nodeCenter(missionIdx, srcIndex),
            to: nodeLeft(bonusIdx, bonusNodeIndex),
            kind: "bonus",
            label,
          });
          continue;
        }
      }

      if (trigger.type === "game_start") {
        edges.push({
          id: `bonus-start-${link.id}`,
          from: { x: PAD_X - 8, y: bonusCenter.y },
          to: nodeLeft(bonusIdx, bonusNodeIndex),
          kind: "bonus",
          label,
        });
      } else if (trigger.type === "team_points_at_least") {
        edges.push({
          id: `bonus-points-${link.id}`,
          from: { x: PAD_X - 8, y: bonusCenter.y - 20 },
          to: nodeLeft(bonusIdx, bonusNodeIndex),
          kind: "bonus",
          label,
        });
      } else if (trigger.type === "elapsed_minutes") {
        edges.push({
          id: `bonus-time-${link.id}`,
          from: { x: PAD_X - 8, y: bonusCenter.y + 20 },
          to: nodeLeft(bonusIdx, bonusNodeIndex),
          kind: "bonus",
          label,
        });
      }
    }
  }

  return edges;
}

function canvasSize(activeLayers: StudioLayer[], grouped: Record<StudioLayer, StudioGameTaskLink[]>) {
  const maxNodes = Math.max(
    1,
    ...activeLayers.map((layer) => grouped[layer].length),
  );
  const width = PAD_X * 2 + maxNodes * NODE_W + (maxNodes - 1) * NODE_GAP + 16;
  const height =
    PAD_Y * 2 +
    activeLayers.length * (NODE_H + LAYER_HEADER + LAYER_GAP) -
    LAYER_GAP +
    8;
  return { width, height };
}

export function GameLogicFlowCanvas({ links, activeLayers }: Props) {
  const grouped = groupLinksByLayerOnLink(links);
  const taskTitleById = useMemo(() => new Map(links.map((l) => [l.task_id, l.task.title])), [links]);

  const edges = useMemo(
    () => buildEdges(activeLayers, grouped, taskTitleById),
    [activeLayers, grouped, taskTitleById],
  );

  const { width, height } = useMemo(
    () => canvasSize(activeLayers, grouped),
    [activeLayers, grouped],
  );

  if (activeLayers.every((layer) => grouped[layer].length === 0)) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
        Noch keine Aufgaben — füge Tasks in den Layer-Spalten hinzu.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/80 p-2">
      <div className="relative" style={{ width, height, minWidth: width }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          aria-hidden
        >
          <defs>
            <marker
              id="flow-arrow-seq"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#0d9488" />
            </marker>
            <marker
              id="flow-arrow-bonus"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#7c3aed" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const path =
              edge.kind === "cross"
                ? crossLayerPath(edge.from, edge.to)
                : bezierPath(edge.from, edge.to);
            const stroke = edge.kind === "bonus" ? "#7c3aed" : edge.kind === "cross" ? "#94a3b8" : "#0d9488";
            const dash = edge.kind === "bonus" ? "6 4" : edge.kind === "cross" ? "4 4" : undefined;
            const marker = edge.kind === "bonus" ? "url(#flow-arrow-bonus)" : "url(#flow-arrow-seq)";
            const mid = { x: (edge.from.x + edge.to.x) / 2, y: (edge.from.y + edge.to.y) / 2 };

            return (
              <g key={edge.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={edge.kind === "cross" ? 1.5 : 2}
                  strokeDasharray={dash}
                  markerEnd={edge.kind === "cross" ? undefined : marker}
                  opacity={edge.kind === "cross" ? 0.7 : 1}
                />
                {edge.label ? (
                  <text
                    x={mid.x}
                    y={mid.y - 6}
                    textAnchor="middle"
                    className="fill-violet-700 text-[9px]"
                    style={{ fontSize: 9 }}
                  >
                    {edge.label.length > 28 ? `${edge.label.slice(0, 26)}…` : edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {activeLayers.map((layer, layerIndex) => {
          const layerLinks = grouped[layer];
          const def = LAYER_DEFINITIONS[layer];
          const tl = nodeTopLeft(layerIndex, 0);

          return (
            <div key={layer}>
              <p
                className="absolute text-xs font-semibold text-slate-600"
                style={{ left: PAD_X, top: tl.y - LAYER_HEADER + 4 }}
              >
                {def.shortDe}
              </p>
              {layerLinks.length === 0 ? (
                <p
                  className="absolute text-xs text-slate-400 italic"
                  style={{ left: PAD_X, top: tl.y + NODE_H / 2 - 8 }}
                >
                  Keine Aufgaben
                </p>
              ) : (
                layerLinks.map((link, nodeIndex) => {
                  const pos = nodeTopLeft(layerIndex, nodeIndex);
                  const overrides = parseLinkOverrides(link.overrides);
                  const meta =
                    layer === 1
                      ? parseGpsOverride(overrides.location ?? overrides.gps)
                        ? "GPS ✓"
                        : "GPS fehlt"
                      : layer === 3
                        ? `${roleLabelShort(overrides.role)} · ${bonusTriggerLabel(parseBonusTrigger(overrides), taskTitleById)}`
                        : nodeIndex === 0
                          ? "Start"
                          : `Schritt ${nodeIndex + 1}`;

                  return (
                    <div
                      key={link.id}
                      className="absolute rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                      style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                        {def.shortDe} {nodeIndex + 1}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-tight text-slate-900">
                        {link.task.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{meta}</p>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-200 px-2 pt-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-teal-600" /> Mission-Reihenfolge
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-violet-600" /> Bonus-Trigger
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 border-t border-dashed border-slate-400" /> Geo → Mission
        </span>
      </div>
    </div>
  );
}
