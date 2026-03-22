import type { OrderConfig, PatternPlan, PatternType, QuickPatternPreset, RunStep } from "../types/order";

const PATTERN_TYPES: PatternType[] = [
  "smooth-s-curve",
  "rocket-launch",
  "sunset-fade",
  "viral-spike",
  "micro-burst",
  "heartbeat",
  "sawtooth",
  "fibonacci-spiral",
];

const PATTERN_NAMES = [
  "micro-burst",
  "rocket-launch",
  "viral-spike",
  "heartbeat",
  "sawtooth",
  "fibonacci-spiral",
  "tornado-funnel",
  "sunset-fade",
];

const MIN_VIEWS_PER_RUN = 100;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const random = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(random(min, max + 1));

function pickRandomPatternType(): PatternType {
  return PATTERN_TYPES[randomInt(0, PATTERN_TYPES.length - 1)];
}

interface PresetProfile {
  patternType?: PatternType;
  runMultiplier: number;
  durationMultiplier: number;
  varianceMultiplier: number;
  targetAverageViews: number;
}

function resolvePresetProfile(preset: QuickPatternPreset | null): PresetProfile {
  if (preset === "viral-boost") {
    return { patternType: "viral-spike", runMultiplier: 0.8, durationMultiplier: 0.7, varianceMultiplier: 1.3, targetAverageViews: 220 };
  }
  if (preset === "fast-start") {
    return { patternType: "rocket-launch", runMultiplier: 0.75, durationMultiplier: 0.65, varianceMultiplier: 1.05, targetAverageViews: 230 };
  }
  if (preset === "trending-push") {
    return { patternType: "viral-spike", runMultiplier: 0.9, durationMultiplier: 0.95, varianceMultiplier: 1.15, targetAverageViews: 195 };
  }
  if (preset === "slow-burn") {
    return { patternType: "smooth-s-curve", runMultiplier: 1.2, durationMultiplier: 1.35, varianceMultiplier: 0.65, targetAverageViews: 150 };
  }
  return { runMultiplier: 1, durationMultiplier: 1, varianceMultiplier: 1, targetAverageViews: 180 };
}

function resolveDurationHours(config: OrderConfig): number {
  if (config.delivery.mode === "custom" || config.delivery.mode === "preset") return config.delivery.hours;
  const automatic = 7 + Math.sqrt(Math.max(800, config.totalViews)) / 16;
  return clamp(automatic, 6, 48);
}

function pickWeightedIndex(weights: number[]): number {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) return randomInt(0, Math.max(0, weights.length - 1));
  const threshold = random(0, sum);
  let cursor = 0;
  for (let index = 0; index < weights.length; index += 1) {
    cursor += weights[index];
    if (threshold <= cursor) return index;
  }
  return Math.max(0, weights.length - 1);
}

function resolveRunCount(totalViews: number, desiredRuns: number, averageTarget: number): number {
  const maxRunsByMinimum = Math.max(1, Math.floor(totalViews / MIN_VIEWS_PER_RUN));
  let runCount = clamp(desiredRuns, 1, maxRunsByMinimum);

  while (runCount > 1 && totalViews / runCount < 130) runCount -= 1;

  const averageBound = Math.max(1, Math.floor(totalViews / Math.max(120, averageTarget)));
  runCount = Math.min(runCount, Math.max(1, averageBound));
  return Math.max(1, runCount);
}

interface CurveContext {
  spikes: Array<{ center: number; width: number; height: number }>;
  burstAnchors: number[];
  phase: number;
  stepCount: number;
  wobble: number;
}

function createCurveContext(type: PatternType): CurveContext {
  const spikeCount = type === "viral-spike" ? randomInt(2, 4) : 0;
  const spikes = Array.from({ length: spikeCount }, () => ({
    center: random(0.25, 0.85),
    width: random(0.03, 0.09),
    height: random(0.08, 0.2),
  }));

  return {
    spikes,
    burstAnchors: [random(0.15, 0.25), random(0.4, 0.55), random(0.7, 0.88)],
    phase: random(0, Math.PI * 2),
    stepCount: randomInt(8, 14),
    wobble: random(0.006, 0.018),
  };
}

function curveValue(type: PatternType, t: number, context: CurveContext): number {
  if (type === "smooth-s-curve") {
    return 1 / (1 + Math.exp(-10 * (t - 0.5)));
  }
  if (type === "rocket-launch") {
    const k = 5.2;
    return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
  }
  if (type === "sunset-fade") {
    const k = 4.1;
    return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
  }
  if (type === "viral-spike") {
    const base = 1 / (1 + Math.exp(-8 * (t - 0.48)));
    const spikeLift = context.spikes.reduce((acc, spike) => acc + Math.exp(-Math.pow((t - spike.center) / spike.width, 2)) * spike.height, 0);
    return base + spikeLift;
  }
  if (type === "heartbeat") {
    const base = Math.pow(t, 1.08);
    const pulse = Math.sin((t * 9.5 + 0.15) * Math.PI + context.phase) * 0.055 * (1 - t * 0.3);
    const microPulse = Math.sin((t * 19 + 0.2) * Math.PI + context.phase * 0.5) * 0.02;
    return base + pulse + microPulse;
  }
  if (type === "sawtooth") {
    const step = Math.floor(t * context.stepCount) / context.stepCount;
    const remainder = (t * context.stepCount) % 1;
    return step * 0.86 + remainder * 0.14;
  }
  if (type === "micro-burst") {
    const [a, b, c] = context.burstAnchors;
    const jump1 = t >= a ? 0.12 : 0;
    const jump2 = t >= b ? 0.16 : 0;
    const jump3 = t >= c ? 0.2 : 0;
    const drift = t * 0.58;
    const micro = Math.sin(t * 18 * Math.PI + context.phase) * 0.015;
    return drift + jump1 + jump2 + jump3 + micro;
  }

  const phi = 1.618;
  return Math.pow(t, phi) + Math.pow(t, 2.6) * 0.18;
}

function normalizeMonotone(values: number[]): number[] {
  const series = [...values];
  for (let index = 1; index < series.length; index += 1) {
    series[index] = Math.max(series[index], series[index - 1] + 0.0001);
  }

  const first = series[0];
  const last = series[series.length - 1];
  const span = Math.max(0.0001, last - first);
  return series.map((value) => (value - first) / span);
}

function allocateRounded(values: number[], total: number): number[] {
  if (values.length === 0) return [];
  const floors = values.map((value) => Math.floor(value));
  let remainder = total - floors.reduce((acc, value) => acc + value, 0);
  const order = values
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    floors[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  return floors;
}

function redistributeForMinimum(runs: number[], minimum: number): number[] {
  const result = [...runs];

  for (let index = 0; index < result.length; index += 1) {
    if (result[index] >= minimum) continue;

    let deficit = minimum - result[index];
    while (deficit > 0) {
      let donor = -1;
      let donorExcess = 0;
      for (let candidate = 0; candidate < result.length; candidate += 1) {
        if (candidate === index) continue;
        const excess = result[candidate] - minimum;
        if (excess > donorExcess) {
          donorExcess = excess;
          donor = candidate;
        }
      }
      if (donor < 0 || donorExcess <= 0) break;

      const transfer = Math.min(deficit, donorExcess);
      result[index] += transfer;
      result[donor] -= transfer;
      deficit -= transfer;
    }
  }

  for (let index = 0; index < result.length; index += 1) {
    if (result[index] >= minimum || result.length === 1) continue;

    if (index === result.length - 1) {
      result[index - 1] += result[index];
      result.splice(index, 1);
    } else {
      result[index + 1] += result[index];
      result.splice(index, 1);
      index -= 1;
    }
  }

  return result;
}

function distributeWithMinimum(weights: number[], total: number, minimum: number): number[] {
  if (total === 0) return [0];
  if (total < minimum) return [total];

  const count = clamp(weights.length, 1, Math.floor(total / minimum));
  const localWeights = weights.slice(0, count).map((weight) => Math.max(0.01, weight));
  const weightSum = localWeights.reduce((acc, value) => acc + value, 0);
  const baseline = count * minimum;
  const remainder = total - baseline;
  const rawExtras = localWeights.map((weight) => (weight / weightSum) * remainder);
  const extras = allocateRounded(rawExtras, remainder);
  return extras.map((extra) => extra + minimum);
}

function generateViewRunsFromCurve(
  patternType: PatternType,
  totalViews: number,
  runCount: number,
  variancePercent: number,
  preset: QuickPatternPreset | null
): number[] {
  if (totalViews <= 0) return [0];
  if (totalViews < MIN_VIEWS_PER_RUN) return [totalViews];

  const context = createCurveContext(patternType);
  const varianceFactor = clamp(variancePercent, 10, 50) / 100;
  const presetVarianceBoost = preset === "viral-boost" ? 1.2 : preset === "slow-burn" ? 0.8 : 1;
  const noiseAmplitude = clamp(0.01 + varianceFactor * 0.02 * presetVarianceBoost, 0.01, 0.03);

  const cumulativeRaw = Array.from({ length: runCount + 1 }, (_, index) => {
    const t = index / runCount;
    const base = curveValue(patternType, t, context);
    const wiggle = 1 + random(-noiseAmplitude, noiseAmplitude) + Math.sin((index + 1) * 0.8 + context.phase) * context.wobble;
    return base * wiggle;
  });

  const cumulative = normalizeMonotone(cumulativeRaw);
  const rampRuns = Math.max(3, Math.min(5, Math.floor(runCount * 0.2)));
  const incrementsRaw = Array.from({ length: runCount }, (_, index) => {
    const phase = index / Math.max(1, runCount - 1);
    const delta = Math.max(0.00001, cumulative[index + 1] - cumulative[index]);
    const shapeVariance = random(1 - varianceFactor * 0.55, 1 + varianceFactor * 0.7);
    let phaseFactor = 1;

    if (phase < 0.2) {
      phaseFactor = random(0.68, 0.9);
    } else if (phase <= 0.8) {
      phaseFactor = random(1.04, 1.32);
      const spikeChance = phase > 0.32 && phase < 0.72 ? 0.2 + varianceFactor * 0.1 : 0.08;
      if (Math.random() < spikeChance) {
        phaseFactor *= random(1.22, 1.58);
      }
    } else {
      phaseFactor = random(0.82, 1.03);
    }

    if (index < rampRuns) {
      const ease = (index + 1) / rampRuns;
      const easeIn = Math.pow(ease, 1.8);
      phaseFactor *= 0.52 + easeIn * 0.44;
    }

    if (index >= runCount - rampRuns) {
      phaseFactor *= random(0.82, 0.98);
    }

    return delta * shapeVariance * phaseFactor;
  });

  const incrementSum = incrementsRaw.reduce((acc, value) => acc + value, 0);
  const scaled = incrementsRaw.map((value) => (value / Math.max(0.0001, incrementSum)) * totalViews);
  const rounded = allocateRounded(scaled, totalViews);
  const phasedWeights = rounded.map((value, index) => {
    const phase = index / Math.max(1, rounded.length - 1);
    if (phase < 0.2) return value * random(0.78, 0.9);
    if (phase <= 0.8) {
      const boosted = value * random(1.06, 1.24);
      return Math.random() < 0.14 ? boosted * random(1.12, 1.42) : boosted;
    }
    return value * random(0.86, 1.02);
  });
  const phasedRuns = distributeWithMinimum(phasedWeights, totalViews, MIN_VIEWS_PER_RUN);
  const minimumSafe = redistributeForMinimum(phasedRuns, MIN_VIEWS_PER_RUN);

  if (minimumSafe.length > 1 && minimumSafe.every((value) => value === minimumSafe[0])) {
    minimumSafe[0] += 1;
    minimumSafe[minimumSafe.length - 1] -= 1;
  }

  return minimumSafe;
}

function intervalPatternFactor(type: PatternType, t: number): number {
  if (type === "smooth-s-curve") return 1.06 - Math.exp(-Math.pow((t - 0.5) / 0.2, 2)) * 0.34;
  if (type === "rocket-launch") return 0.58 + t * 1.02;
  if (type === "sunset-fade") return 1.2 - t * 0.52;
  if (type === "viral-spike") return 1.14 - Math.exp(-Math.pow((t - 0.56) / 0.14, 2)) * 0.5;
  if (type === "micro-burst") return Math.sin(t * 22) > 0.25 ? 0.64 : 1.52;
  if (type === "heartbeat") return Math.sin(t * 16) > 0.2 ? 0.76 : 1.26;
  if (type === "sawtooth") return ((t * 10) % 1) < 0.2 ? 0.66 : 1.24;
  return 1.16 - t * 0.46;
}

function intervalPresetFactor(preset: QuickPatternPreset | null, t: number): number {
  if (preset === "viral-boost") return 1.2 - Math.exp(-Math.pow((t - 0.58) / 0.2, 2)) * 0.45;
  if (preset === "fast-start") return 0.65 + t * 0.9;
  if (preset === "trending-push") return 1.1 - Math.exp(-Math.pow((t - 0.58) / 0.22, 2)) * 0.3;
  if (preset === "slow-burn") return 1.2 + t * 0.25;
  return 1;
}

interface EngagementProfile {
  densityMin: number;
  densityMax: number;
  perRunMin: number;
  perRunMax: number;
}

type EngagementKind = "likes" | "shares" | "saves";

function resolveEngagementProfile(kind: EngagementKind): EngagementProfile {
  if (kind === "likes") return { densityMin: 0.2, densityMax: 0.35, perRunMin: 10, perRunMax: 20 };
  return { densityMin: 0.1, densityMax: 0.2, perRunMin: 10, perRunMax: 18 };
}

function buildEngagementWeights(runs: { views: number; at: Date }[], peakHoursBoost: boolean): number[] {
  const maxViews = Math.max(1, ...runs.map((run) => run.views));
  return runs.map((run, index) => {
    const previous = index > 0 ? runs[index - 1].views : run.views;
    const next = index < runs.length - 1 ? runs[index + 1].views : run.views;
    const increase = Math.max(0, run.views - previous) / maxViews;
    const localSpike = Math.max(0, run.views - (previous + next) / 2) / maxViews;
    const t = index / Math.max(1, runs.length - 1);
    const phaseBoost = t > 0.3 && t < 0.75 ? 1.15 : 1;
    const hour = run.at.getHours();
    const peakBoost = peakHoursBoost && hour >= 18 && hour <= 23 ? 1.35 : 1;
    return Math.max(0.01, (0.5 + run.views / maxViews * 0.65 + increase * 1.1 + localSpike * 1.2) * phaseBoost * peakBoost);
  });
}

function applyNoise(value: number, min: number, max: number): number {
  return clamp(value + randomInt(-2, 2), min, max);
}

function selectEngagementRuns(length: number, count: number, weights: number[]): number[] {
  if (count <= 0 || length === 0) return [];

  const selected = new Set<number>();
  const minGap = Math.max(1, Math.floor(length / Math.max(6, count * 2.5)));
  const anchors = [0.15, 0.5, 0.82];

  for (const anchor of anchors) {
    if (selected.size >= count) break;
    const center = Math.round((length - 1) * anchor);
    const start = Math.max(0, center - Math.max(2, Math.floor(length * 0.08)));
    const end = Math.min(length - 1, center + Math.max(2, Math.floor(length * 0.08)));
    const candidates = Array.from({ length: end - start + 1 }, (_, offset) => start + offset).filter((index) => {
      for (const taken of selected) {
        if (Math.abs(taken - index) <= minGap) return false;
      }
      return true;
    });
    if (candidates.length === 0) continue;
    const candidateWeights = candidates.map((index) => Math.max(0.01, weights[index] * random(0.9, 1.12)));
    selected.add(candidates[pickWeightedIndex(candidateWeights)]);
  }

  while (selected.size < count) {
    const candidates = Array.from({ length }, (_, index) => index).filter((index) => {
      for (const taken of selected) {
        if (Math.abs(taken - index) <= minGap && Math.random() < 0.8) return false;
      }
      return true;
    });
    if (candidates.length === 0) break;
    const candidateWeights = candidates.map((index) => Math.max(0.01, weights[index] * random(0.9, 1.15)));
    selected.add(candidates[pickWeightedIndex(candidateWeights)]);
  }

  const result = Array.from(selected).sort((a, b) => a - b);
  const maxGap = Math.max(5, Math.ceil(length / Math.max(2, count)) + 1);
  let cursor = 0;
  while (cursor < result.length - 1 && result.length < count) {
    const gap = result[cursor + 1] - result[cursor];
    if (gap > maxGap) {
      const mid = Math.floor((result[cursor] + result[cursor + 1]) / 2);
      result.splice(cursor + 1, 0, mid);
    }
    cursor += 1;
  }

  return result.slice(0, count);
}

function phaseRangeForKind(kind: EngagementKind, t: number): { min: number; max: number } {
  if (kind === "likes") {
    if (t < 0.33) return { min: 10, max: 14 };
    if (t < 0.72) return { min: 14, max: 20 };
    return { min: 12, max: 18 };
  }
  if (t < 0.33) return { min: 10, max: 13 };
  if (t < 0.72) return { min: 12, max: 18 };
  return { min: 11, max: 16 };
}

function pickEngagementValue(kind: EngagementKind, t: number, lastValue: number | null): number {
  const profile = resolveEngagementProfile(kind);
  const range = phaseRangeForKind(kind, t);
  const min = clamp(range.min, profile.perRunMin, profile.perRunMax);
  const max = clamp(range.max, profile.perRunMin, profile.perRunMax);
  let value = applyNoise(randomInt(min, max), profile.perRunMin, profile.perRunMax);

  if (lastValue !== null && value === lastValue) {
    value = clamp(value + (Math.random() < 0.5 ? -1 : 1), profile.perRunMin, profile.perRunMax);
  }

  return value;
}

function distributeEngagement(
  runs: { views: number; at: Date }[],
  targetTotal: number,
  peakHoursBoost: boolean,
  kind: EngagementKind
): number[] {
  const result = Array.from({ length: runs.length }, () => 0);
  if (targetTotal < 10 || runs.length === 0) return result;

  const profile = resolveEngagementProfile(kind);
  const minCount = Math.max(1, Math.round(runs.length * profile.densityMin));
  const maxCount = Math.max(minCount, Math.round(runs.length * profile.densityMax));
  const preferredCount = clamp(randomInt(minCount, maxCount), 1, runs.length);
  const requiredCount = Math.ceil(targetTotal / Math.max(profile.perRunMin + 3, profile.perRunMax - 1));
  const selectedCount = clamp(Math.max(preferredCount, Math.min(maxCount, requiredCount)), 1, runs.length);

  const weights = buildEngagementWeights(runs, peakHoursBoost);
  const selected = selectEngagementRuns(runs.length, selectedCount, weights);
  const effectiveCount = Math.max(1, selected.length);

  const feasibleMin = effectiveCount * profile.perRunMin;
  const feasibleMax = effectiveCount * profile.perRunMax;
  const naturalMid = Math.round(effectiveCount * ((profile.perRunMin + profile.perRunMax) / 2));
  const target =
    targetTotal > feasibleMax
      ? randomInt(Math.max(feasibleMin, naturalMid - effectiveCount), Math.max(feasibleMin, naturalMid + Math.floor(effectiveCount * 0.8)))
      : clamp(targetTotal, feasibleMin, feasibleMax);
  let runningTotal = 0;
  let lastAssigned: number | null = null;
  let secondLastAssigned: number | null = null;

  for (const index of selected) {
    const t = index / Math.max(1, runs.length - 1);
    let value = pickEngagementValue(kind, t, lastAssigned);
    if (secondLastAssigned !== null && value === secondLastAssigned) {
      value = clamp(value + (Math.random() < 0.5 ? -1 : 1), profile.perRunMin, profile.perRunMax);
    }

    const spikeBias = weights[index] / Math.max(0.01, Math.max(...weights));
    if (Math.random() < spikeBias * 0.45) value = Math.min(profile.perRunMax, value + randomInt(1, 2));

    result[index] = value;
    runningTotal += value;
    secondLastAssigned = lastAssigned;
    lastAssigned = value;
  }

  let delta = target - runningTotal;
  const adjustable = selected.map((index) => ({ index, weight: Math.max(0.01, weights[index]) }));
  while (delta !== 0 && adjustable.length > 0) {
    const chosen = adjustable[pickWeightedIndex(adjustable.map((slot) => slot.weight))].index;
    if (delta > 0 && result[chosen] < profile.perRunMax) {
      result[chosen] += 1;
      delta -= 1;
    } else if (delta < 0 && result[chosen] > profile.perRunMin) {
      result[chosen] -= 1;
      delta += 1;
    } else {
      const next = adjustable.find((slot) => (delta > 0 ? result[slot.index] < profile.perRunMax : result[slot.index] > profile.perRunMin));
      if (!next) break;
    }
  }

  return result;
}

function normalizeSharesRuns(values: number[], minimum: number): number[] {
  const result = Array.from({ length: values.length }, () => 0);
  if (values.length === 0) return result;

  let buffer = 0;
  let lastAssignedIndex = -1;

  // Single-pass buffering avoids in-loop mutation and repeated rescans.
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] <= 0) continue;
    buffer += values[index];

    if (buffer >= minimum) {
      result[index] = buffer;
      lastAssignedIndex = index;
      buffer = 0;
    }
  }

  if (buffer > 0) {
    if (lastAssignedIndex >= 0) {
      result[lastAssignedIndex] += buffer;
    } else {
      result[values.length - 1] = buffer;
    }
  }

  return result;
}

function clearFirstRun(values: number[]): number[] {
  const result = [...values];
  if (result.length === 0 || result[0] === 0) return result;
  if (result.length === 1) return [0];

  const carry = result[0];
  result[0] = 0;

  let target = 1;
  for (let index = 2; index < result.length; index += 1) {
    if (result[index] > result[target]) target = index;
  }
  result[target] += carry;
  return result;
}

function detectRisk(viewsPerHour: number, variancePercent: number, hours: number): "Safe" | "Medium" | "Risk" {
  const speedScore = clamp(viewsPerHour / 15000, 0, 1.2);
  const varianceScore = clamp(variancePercent / 50, 0, 1);
  const shortWindowPenalty = hours <= 12 ? 0.25 : hours <= 24 ? 0.12 : 0;
  const score = speedScore * 0.75 + varianceScore * 0.45 + shortWindowPenalty;
  if (score >= 1) return "Risk";
  if (score >= 0.62) return "Medium";
  return "Safe";
}

export function createPatternPlan(config: OrderConfig): PatternPlan {
  const presetProfile = resolvePresetProfile(config.quickPreset);
  const patternType = presetProfile.patternType ?? pickRandomPatternType();
  const patternName = PATTERN_NAMES[randomInt(0, PATTERN_NAMES.length - 1)];
  const patternId = randomInt(100, 999);
  const requestedViews = Math.max(0, Math.floor(config.totalViews));
  const variance = clamp(config.variancePercent * presetProfile.varianceMultiplier, 10, 50);
  const requestedRuns = Math.round(randomInt(50, 80) * presetProfile.runMultiplier);
  const totalRuns = requestedViews >= MIN_VIEWS_PER_RUN ? resolveRunCount(requestedViews, requestedRuns, presetProfile.targetAverageViews) : 1;
  const durationHours = clamp(resolveDurationHours(config) * presetProfile.durationMultiplier, 2, 72);
  const durationMin = durationHours * 60;
  const startDelayMin = clamp(config.startDelayHours || 0, 0, 168) * 60;

  let viewRuns = generateViewRunsFromCurve(patternType, requestedViews, totalRuns, variance, config.quickPreset);
  if (config.peakHoursBoost && viewRuns.length > 1 && requestedViews >= MIN_VIEWS_PER_RUN) {
    const initialWeights = viewRuns.map((views) => Math.max(0.01, views));
    const boostedWeights = initialWeights.map((weight, index) => {
      const t = index / Math.max(1, initialWeights.length - 1);
      const pseudoHour = Math.floor((t * durationHours) % 24);
      const inPeakWindow = pseudoHour >= 18 && pseudoHour <= 23;
      const boostChance = inPeakWindow ? 0.78 : 0.18;
      const boost = Math.random() < boostChance ? random(1.14, inPeakWindow ? 1.52 : 1.2) : random(0.94, 1.06);
      return weight * boost;
    });
    viewRuns = distributeWithMinimum(boostedWeights, requestedViews, MIN_VIEWS_PER_RUN);
  }

  const baseInterval = durationMin / Math.max(1, viewRuns.length - 1);
  const now = new Date();
  let elapsed = startDelayMin;

  const provisionalRuns = viewRuns.map((views, index) => {
    if (index > 0) {
      const t = index / Math.max(1, viewRuns.length - 1);
      const jitter = random(0.76, 1.36);
      elapsed += Math.max(1, baseInterval * jitter * intervalPresetFactor(config.quickPreset, t) * intervalPatternFactor(patternType, t));
    }
    return { at: new Date(now.getTime() + elapsed * 60_000), views };
  });

  const totalViews = provisionalRuns.reduce((acc, run) => acc + run.views, 0);
  const likesRatio = random(0.05, 0.08);
  const sharesRatio = random(0.005, 0.02);
  const savesRatio = random(0.01, 0.02);

  const likesTotal = config.includeLikes ? Math.max(10, Math.floor(totalViews * likesRatio)) : 0;
  const sharesTotal = config.includeShares ? Math.max(20, Math.floor(totalViews * sharesRatio)) : 0;
  const savesTotal = config.includeSaves ? Math.max(10, Math.floor(totalViews * savesRatio)) : 0;

  const likesRuns = distributeEngagement(provisionalRuns, likesTotal, config.peakHoursBoost, "likes");
  const sharesRuns = normalizeSharesRuns(distributeEngagement(provisionalRuns, sharesTotal, config.peakHoursBoost, "shares"), 20);
  const savesRuns = clearFirstRun(distributeEngagement(provisionalRuns, savesTotal, config.peakHoursBoost, "saves"));

  let cumulativeViews = 0;
  let cumulativeLikes = 0;
  let cumulativeShares = 0;
  let cumulativeSaves = 0;

  const runs: RunStep[] = provisionalRuns.map((run, index) => {
    cumulativeViews += run.views;
    cumulativeLikes += likesRuns[index];
    cumulativeShares += sharesRuns[index];
    cumulativeSaves += savesRuns[index];

    return {
      run: index + 1,
      at: run.at,
      minutesFromStart: Math.round((run.at.getTime() - now.getTime()) / 60_000),
      views: run.views,
      likes: likesRuns[index],
      shares: sharesRuns[index],
      saves: savesRuns[index],
      cumulativeViews,
      cumulativeLikes,
      cumulativeShares,
      cumulativeSaves,
    };
  });

  const viewsPerHour = totalViews / Math.max(1, durationHours);

  return {
    patternId,
    patternName,
    patternType,
    totalRuns: runs.length,
    approximateIntervalMin: Math.round(durationMin / Math.max(1, runs.length)),
    finishTime: runs[runs.length - 1]?.at ?? now,
    estimatedDurationHours: Number((durationHours + startDelayMin / 60).toFixed(1)),
    risk: detectRisk(viewsPerHour, variance, durationHours),
    runs,
  };
}