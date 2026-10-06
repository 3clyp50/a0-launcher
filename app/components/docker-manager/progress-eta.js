import { asText } from "./component-utils.js";

function percentValue(progress) {
  if (progress === null || progress === undefined || progress === "") return null;
  const value = Number(progress);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function timestampMs(value) {
  const text = asText(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function estimateEtaText({
  startedAt = "",
  status = "",
  progress = null,
  progressStartValue = 0,
  fallbackProgress = null,
  nowMs = Date.now(),
  minElapsedMs = 15_000
} = {}) {
  if (asText(status) !== "running") return "";
  const startedMs = timestampMs(startedAt);
  if (startedMs === null) return "";

  const elapsedMs = Math.max(0, Number(nowMs) - startedMs);
  if (!Number.isFinite(elapsedMs) || elapsedMs < minElapsedMs) return "";

  const primary = percentValue(progress);
  const fallback = percentValue(fallbackProgress);
  const effectiveProgress = primary !== null && primary > 0 ? primary : fallback;
  if (effectiveProgress === null || effectiveProgress <= 2 || effectiveProgress >= 99.5) return "";

  const completedProgress = effectiveProgress - (percentValue(progressStartValue) || 0);
  if (completedProgress <= 0) return "";
  const remainingMs = (elapsedMs / completedProgress) * (100 - effectiveProgress);
  if (!Number.isFinite(remainingMs) || remainingMs <= 0 || remainingMs > 24 * 60 * 60 * 1000) return "";
  if (remainingMs < 60_000) return "<1 min remaining";

  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `~${minutes} min remaining`;
}

function progressMetaText({
  progress = null,
  progressStartValue = 0,
  indeterminate = false,
  startedAt = "",
  status = "",
  fallbackProgress = null,
  nowMs = Date.now()
} = {}) {
  const numericProgress = percentValue(progress);
  const percentText = !indeterminate && numericProgress !== null ? `${Math.round(numericProgress)}%` : "";
  const etaText = indeterminate ? "" : estimateEtaText({ startedAt, status, progress: numericProgress, progressStartValue, fallbackProgress, nowMs });
  return [percentText, etaText].filter(Boolean).join(" · ");
}

function progressPresentedAsToast(progress = null) {
  return typeof progress?.presentation === "string" && progress.presentation.trim() === "toast";
}

export {
  estimateEtaText,
  percentValue,
  progressMetaText,
  progressPresentedAsToast
};
