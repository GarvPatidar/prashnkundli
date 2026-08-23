import type {
  Candle,
  PriceLevel,
  SwingPoint,
} from "./indicator.types.js";
import {
  roundIndicatorValue,
  validateCandles,
} from "./candle.utils.js";
import { detectSwingPoints } from "./swing-points.js";

const DEFAULT_MAX_LEVELS = 5;
const DEFAULT_CLUSTER_TOLERANCE_PERCENT = 0.15;

interface PriceCluster {
  prices: number[];
  strengths: number[];
  timestamps: string[];
}

export interface SupportResistanceResult {
  supports: PriceLevel[];
  resistances: PriceLevel[];
}

function validateOptions(
  maxLevels: number,
  tolerancePercent: number,
): void {
  if (
    !Number.isInteger(maxLevels) ||
    maxLevels <= 0
  ) {
    throw new Error(
      "Support/resistance maxLevels must be a positive integer.",
    );
  }

  if (
    !Number.isFinite(tolerancePercent) ||
    tolerancePercent <= 0 ||
    tolerancePercent > 5
  ) {
    throw new Error(
      "Support/resistance tolerancePercent must be greater than 0 and no more than 5.",
    );
  }
}

function getClusterAveragePrice(
  cluster: PriceCluster,
): number {
  return (
    cluster.prices.reduce(
      (total, price) => total + price,
      0,
    ) / cluster.prices.length
  );
}

function isWithinTolerance(
  price: number,
  referencePrice: number,
  tolerancePercent: number,
): boolean {
  if (referencePrice === 0) {
    return false;
  }

  const distancePercent =
    (Math.abs(price - referencePrice) /
      referencePrice) *
    100;

  return distancePercent <= tolerancePercent;
}

function clusterSwingPoints(
  swingPoints: readonly SwingPoint[],
  tolerancePercent: number,
): PriceCluster[] {
  const clusters: PriceCluster[] = [];

  for (const swingPoint of swingPoints) {
    let matchedCluster: PriceCluster | undefined;

    for (const cluster of clusters) {
      const averagePrice =
        getClusterAveragePrice(cluster);

      if (
        isWithinTolerance(
          swingPoint.price,
          averagePrice,
          tolerancePercent,
        )
      ) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.prices.push(
        swingPoint.price,
      );

      matchedCluster.strengths.push(
        swingPoint.strength,
      );

      matchedCluster.timestamps.push(
        swingPoint.timestamp,
      );

      continue;
    }

    clusters.push({
      prices: [swingPoint.price],
      strengths: [swingPoint.strength],
      timestamps: [swingPoint.timestamp],
    });
  }

  return clusters;
}

function calculateClusterStrength(
  cluster: PriceCluster,
): number {
  const touches =
    cluster.prices.length;

  const averageSwingStrength =
    cluster.strengths.reduce(
      (total, value) => total + value,
      0,
    ) / cluster.strengths.length;

  const touchScore =
    Math.min(60, touches * 15);

  const swingScore =
    Math.min(
      40,
      averageSwingStrength * 0.4,
    );

  return Math.min(
    100,
    roundIndicatorValue(
      touchScore + swingScore,
      2,
    ),
  );
}

function mapClusterToPriceLevel(
  cluster: PriceCluster,
): PriceLevel {
  return {
    price: roundIndicatorValue(
      getClusterAveragePrice(cluster),
    ),
    strength:
      calculateClusterStrength(cluster),
    touches: cluster.prices.length,
  };
}

function sortSupports(
  levels: readonly PriceLevel[],
  currentPrice: number,
): PriceLevel[] {
  return [...levels].sort(
    (first, second) => {
      const firstDistance =
        currentPrice - first.price;

      const secondDistance =
        currentPrice - second.price;

      if (
        firstDistance !== secondDistance
      ) {
        return firstDistance - secondDistance;
      }

      return (
        second.strength -
        first.strength
      );
    },
  );
}

function sortResistances(
  levels: readonly PriceLevel[],
  currentPrice: number,
): PriceLevel[] {
  return [...levels].sort(
    (first, second) => {
      const firstDistance =
        first.price - currentPrice;

      const secondDistance =
        second.price - currentPrice;

      if (
        firstDistance !== secondDistance
      ) {
        return firstDistance - secondDistance;
      }

      return (
        second.strength -
        first.strength
      );
    },
  );
}

export function calculateSupportResistance(
  candles: readonly Candle[],
  options?: {
    leftBars?: number;
    rightBars?: number;
    maxLevels?: number;
    tolerancePercent?: number;
  },
): SupportResistanceResult {
  validateCandles(candles);

  const leftBars =
    options?.leftBars ?? 3;

  const rightBars =
    options?.rightBars ?? 3;

  const maxLevels =
    options?.maxLevels ??
    DEFAULT_MAX_LEVELS;

  const tolerancePercent =
    options?.tolerancePercent ??
    DEFAULT_CLUSTER_TOLERANCE_PERCENT;

  validateOptions(
    maxLevels,
    tolerancePercent,
  );

  const latestCandle =
    candles[candles.length - 1];

  if (!latestCandle) {
    return {
      supports: [],
      resistances: [],
    };
  }

  const swingPoints =
    detectSwingPoints(
      candles,
      leftBars,
      rightBars,
    );

  if (swingPoints.length === 0) {
    return {
      supports: [],
      resistances: [],
    };
  }

  const clusters =
    clusterSwingPoints(
      swingPoints,
      tolerancePercent,
    );

  const levels =
    clusters.map(
      mapClusterToPriceLevel,
    );

  const supports = levels.filter(
    (level) =>
      level.price <
      latestCandle.close,
  );

  const resistances = levels.filter(
    (level) =>
      level.price >
      latestCandle.close,
  );

  return {
    supports: sortSupports(
      supports,
      latestCandle.close,
    ).slice(0, maxLevels),

    resistances: sortResistances(
      resistances,
      latestCandle.close,
    ).slice(0, maxLevels),
  };
}