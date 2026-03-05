import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Colors } from '@/constants/Colors';

export type PressurePoint = {
  id: string;
  timestamp: Date;
  pressure: number;       // hPa
  pressureInHg: number;   // inHg for display
  severity: number;       // 1-5
  pressureChange3h: number;
};

type Props = {
  data: PressurePoint[];
  width: number;
  height?: number;
  onPointPress?: (point: PressurePoint) => void;
};

const SEVERITY_COLORS = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#EF5350'];

const PADDING = { top: 24, right: 16, bottom: 32, left: 52 };

export default function PressureChart({ data, width, height = 240, onPointPress }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (data.length < 2) {
    return (
      <View style={[styles.empty, { height: 120 }]}>
        <Text style={styles.emptyText}>Need 2+ episodes with weather data</Text>
      </View>
    );
  }

  const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Scale
  const pressures = sorted.map((d) => d.pressure);
  const minP = Math.floor(Math.min(...pressures) - 2);
  const maxP = Math.ceil(Math.max(...pressures) + 2);
  const pRange = maxP - minP || 1;

  const minT = sorted[0].timestamp.getTime();
  const maxT = sorted[sorted.length - 1].timestamp.getTime();
  const tRange = maxT - minT || 1;

  const scaleX = (t: number) => PADDING.left + ((t - minT) / tRange) * chartW;
  const scaleY = (p: number) => PADDING.top + chartH - ((p - minP) / pRange) * chartH;

  // Smooth curve using cubic bezier (catmull-rom to bezier)
  const points = sorted.map((d) => ({
    x: scaleX(d.timestamp.getTime()),
    y: scaleY(d.pressure),
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  // Area fill
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PADDING.top + chartH} L ${points[0].x} ${PADDING.top + chartH} Z`;

  // Y-axis ticks
  const yTickCount = 4;
  const yStep = pRange / yTickCount;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(minP + i * yStep);
  }

  // X-axis labels (max 5, evenly spaced)
  const xLabelCount = Math.min(sorted.length, 5);
  const xStep = Math.max(1, Math.floor((sorted.length - 1) / (xLabelCount - 1)));
  const xLabels: typeof sorted = [];
  for (let i = 0; i < sorted.length; i += xStep) xLabels.push(sorted[i]);
  if (xLabels[xLabels.length - 1]?.id !== sorted[sorted.length - 1].id) {
    xLabels.push(sorted[sorted.length - 1]);
  }

  const selectedPoint = sorted.find((d) => d.id === selectedId);

  const handlePress = (point: PressurePoint) => {
    setSelectedId(point.id === selectedId ? null : point.id);
    onPointPress?.(point);
  };

  // Color falling/rising segments
  const getFallingSegments = () => {
    const segments: { x: number; w: number }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].pressureChange3h < -2) {
        const x = scaleX(sorted[i].timestamp.getTime());
        segments.push({ x: x - 12, w: 24 });
      }
    }
    return segments;
  };
  const fallingSegments = getFallingSegments();

  return (
    <View>
      {selectedPoint && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {selectedPoint.pressure.toFixed(1)} hPa ({selectedPoint.pressureInHg.toFixed(2)} inHg)
            {'  '}
            {selectedPoint.pressureChange3h < -2 ? '📉 Dropping' :
             selectedPoint.pressureChange3h > 2 ? '📈 Rising' : '➡️ Stable'}
          </Text>
          <Text style={styles.tooltipDate}>
            {selectedPoint.timestamp.toLocaleDateString()} {selectedPoint.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {'  ·  '}Severity: {selectedPoint.severity}/5
          </Text>
        </View>
      )}

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.2" />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yTicks.map((tick) => (
          <Line
            key={`grid-${tick}`}
            x1={PADDING.left}
            y1={scaleY(tick)}
            x2={width - PADDING.right}
            y2={scaleY(tick)}
            stroke={Colors.border}
            strokeWidth={0.5}
          />
        ))}

        {/* Falling pressure zones (red tint) */}
        {fallingSegments.map((seg, i) => (
          <Rect
            key={`fall-${i}`}
            x={Math.max(PADDING.left, seg.x)}
            y={PADDING.top}
            width={seg.w}
            height={chartH}
            fill="rgba(239,83,80,0.08)"
            rx={4}
          />
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Pressure line (smooth) */}
        <Path d={linePath} stroke={Colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />

        {/* Episode dots */}
        {sorted.map((d) => {
          const x = scaleX(d.timestamp.getTime());
          const y = scaleY(d.pressure);
          const color = SEVERITY_COLORS[d.severity - 1] || SEVERITY_COLORS[2];
          const isSelected = d.id === selectedId;
          return (
            <Circle
              key={d.id}
              cx={x}
              cy={y}
              r={isSelected ? 9 : 6}
              fill={color}
              stroke={isSelected ? Colors.text : Colors.background}
              strokeWidth={isSelected ? 2.5 : 1.5}
              onPress={() => handlePress(d)}
            />
          );
        })}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <SvgText
            key={`y-${tick}`}
            x={PADDING.left - 6}
            y={scaleY(tick) + 4}
            fill={Colors.textMuted}
            fontSize={10}
            textAnchor="end"
          >
            {tick.toFixed(0)}
          </SvgText>
        ))}

        {/* X-axis date labels */}
        {xLabels.map((d) => (
          <SvgText
            key={`x-${d.id}`}
            x={scaleX(d.timestamp.getTime())}
            y={height - 6}
            fill={Colors.textMuted}
            fontSize={9}
            textAnchor="middle"
          >
            {`${d.timestamp.getMonth() + 1}/${d.timestamp.getDate()}`}
          </SvgText>
        ))}

        {/* Y-axis label */}
        <SvgText
          x={12}
          y={PADDING.top + chartH / 2}
          fill={Colors.textSecondary}
          fontSize={10}
          textAnchor="middle"
          rotation="-90"
          origin={`12, ${PADDING.top + chartH / 2}`}
        >
          hPa
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SEVERITY_COLORS[0] }]} />
          <Text style={styles.legendText}>Mild</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SEVERITY_COLORS[2] }]} />
          <Text style={styles.legendText}>Moderate</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SEVERITY_COLORS[4] }]} />
          <Text style={styles.legendText}>Severe</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { backgroundColor: 'rgba(239,83,80,0.3)' }]} />
          <Text style={styles.legendText}>Dropping</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
  },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  tooltip: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tooltipText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  tooltipDate: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDash: { width: 12, height: 8, borderRadius: 2 },
  legendText: { color: Colors.textMuted, fontSize: 10 },
});
