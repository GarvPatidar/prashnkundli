interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
}

function buildCandles(): Candle[] {
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  let price = 4120;
  const candles: Candle[] = [];

  for (let i = 0; i < 34; i += 1) {
    const drift = i < 22 ? 3.4 : -3;
    const o = price;
    const c = o + drift + (rand() - 0.5) * 15;
    const h = Math.max(o, c) + rand() * 7;
    const l = Math.min(o, c) - rand() * 7;
    candles.push({ o, h, l, c });
    price = c;
  }

  return candles;
}

const WIDTH = 560;
const HEIGHT = 270;
const PAD_X = 14;
const PAD_Y = 26;

export function HeroChart() {
  const candles = buildCandles();
  const highs = candles.map((candle) => candle.h);
  const lows = candles.map((candle) => candle.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);

  const y = (value: number) =>
    PAD_Y + ((max - value) / (max - min)) * (HEIGHT - PAD_Y * 2);

  const step = (WIDTH - PAD_X * 2) / candles.length;
  const bodyWidth = Math.max(4, step * 0.58);

  const resistance = max - 2;
  const support = Math.min(...lows.slice(-14)) + 1;
  const last = candles[candles.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Illustrative XAU/USD candlestick chart with support and resistance"
      className="h-auto w-full"
    >
      {[0.2, 0.4, 0.6, 0.8].map((fraction) => (
        <line
          key={fraction}
          x1={0}
          x2={WIDTH}
          y1={HEIGHT * fraction}
          y2={HEIGHT * fraction}
          stroke="rgba(255,255,255,0.05)"
        />
      ))}

      <line
        x1={0}
        x2={WIDTH}
        y1={y(resistance)}
        y2={y(resistance)}
        stroke="#f0616d"
        strokeWidth={1}
        strokeDasharray="5 5"
        opacity={0.7}
      />
      <text x={8} y={y(resistance) - 6} fontSize={10} fill="#f0616d">
        Resistance
      </text>

      <line
        x1={0}
        x2={WIDTH}
        y1={y(support)}
        y2={y(support)}
        stroke="#22c58b"
        strokeWidth={1}
        strokeDasharray="5 5"
        opacity={0.7}
      />
      <text x={8} y={y(support) + 14} fontSize={10} fill="#22c58b">
        Support
      </text>

      {candles.map((candle, index) => {
        const up = candle.c >= candle.o;
        const color = up ? "#22c58b" : "#f0616d";
        const x = PAD_X + index * step + step / 2;
        const top = y(Math.max(candle.o, candle.c));
        const bottom = y(Math.min(candle.o, candle.c));

        return (
          <g
            key={index}
            className="mk-rise"
            style={{ animationDelay: `${index * 35}ms` }}
          >
            <line
              x1={x}
              x2={x}
              y1={y(candle.h)}
              y2={y(candle.l)}
              stroke={color}
              strokeWidth={1.3}
            />
            <rect
              x={x - bodyWidth / 2}
              y={top}
              width={bodyWidth}
              height={Math.max(2, bottom - top)}
              rx={1}
              fill={color}
            />
          </g>
        );
      })}

      <line
        x1={0}
        x2={WIDTH}
        y1={y(last.c)}
        y2={y(last.c)}
        stroke="#f5c451"
        strokeWidth={1}
        opacity={0.9}
      />
      <circle
        cx={PAD_X + (candles.length - 0.5) * step}
        cy={y(last.c)}
        r={4}
        fill="#f5c451"
        className="mk-pulse-dot"
      />
    </svg>
  );
}
