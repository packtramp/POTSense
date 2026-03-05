import { View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import type { HourlyPressure } from '@/lib/weather';

export type PressurePoint = {
  id: string;
  timestamp: Date;
  pressure: number;       // hPa
  pressureInHg: number;   // inHg for display
  severity: number;       // 1-5
  pressureChange3h: number;
};

type Props = {
  hourlyData: HourlyPressure[];  // continuous background pressure line
  episodes: PressurePoint[];      // episode dots overlaid
  width: number;
  height?: number;
};

const SEVERITY_COLORS = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#EF5350'];
const PADDING = { top: 24, right: 16, bottom: 32, left: 52 };

// Downsample hourly data for performance (keep every Nth point)
function downsample(data: HourlyPressure[], maxPoints: number): HourlyPressure[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const result: HourlyPressure[] = [];
  for (let i = 0; i < data.length; i += step) result.push(data[i]);
  // Always include the last point
  if (result[result.length - 1] !== data[data.length - 1]) result.push(data[data.length - 1]);
  return result;
}

// Build smooth SVG path from points
function buildPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export default function PressureChart({ hourlyData, episodes, width, height = 260 }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hasHourly = hourlyData.length >= 2;
  const hasEpisodes = episodes.length >= 1;

  if (!hasHourly && !hasEpisodes) {
    return (
      <View style={[styles.empty, { height: 120 }]}>
        <Text style={styles.emptyText}>No pressure data available yet</Text>
      </View>
    );
  }

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Determine time range from hourly data (or episodes as fallback)
  const allTimes = hasHourly
    ? hourlyData.map((d) => d.timestamp.getTime())
    : episodes.map((d) => d.timestamp.getTime());
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);
  const tRange = maxT - minT || 1;

  // Determine pressure range from hourly data (wider = more context)
  const allPressures = hasHourly
    ? hourlyData.map((d) => d.pressure)
    : episodes.map((d) => d.pressure);
  const minP = Math.floor(Math.min(...allPressures) - 1);
  const maxP = Math.ceil(Math.max(...allPressures) + 1);
  const pRange = maxP - minP || 1;

  const scaleX = (t: number) => PADDING.left + ((t - minT) / tRange) * chartW;
  const scaleY = (p: number) => PADDING.top + chartH - ((p - minP) / pRange) * chartH;

  // Downsample hourly for SVG performance (max ~200 points)
  const sampled = downsample(hourlyData, 200);
  const hourlyPts = sampled.map((d) => ({ x: scaleX(d.timestamp.getTime()), y: scaleY(d.pressure) }));
  const hourlyPath = buildPath(hourlyPts);
  const areaPath = hourlyPath
    ? `${hourlyPath} L ${hourlyPts[hourlyPts.length - 1].x} ${PADDING.top + chartH} L ${hourlyPts[0].x} ${PADDING.top + chartH} Z`
    : '';

  // Y-axis ticks
  const yTickCount = 4;
  const yStep = pRange / yTickCount;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) yTicks.push(minP + i * yStep);

  // X-axis labels (5 evenly spaced dates)
  const xLabelCount = 5;
  const xTimeStep = tRange / (xLabelCount - 1);
  const xLabels: { time: number; label: string }[] = [];
  for (let i = 0; i < xLabelCount; i++) {
    const t = minT + i * xTimeStep;
    const d = new Date(t);
    xLabels.push({ time: t, label: `${d.getMonth() + 1}/${d.getDate()}` });
  }

  const selectedPoint = episodes.find((d) => d.id === selectedId);

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
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.15" />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity="0.01" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yTicks.map((tick) => (
          <Line
            key={`grid-${tick}`}
            x1={PADDING.left} y1={scaleY(tick)}
            x2={width - PADDING.right} y2={scaleY(tick)}
            stroke={Colors.border} strokeWidth={0.5}
          />
        ))}

        {/* Continuous pressure area fill */}
        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

        {/* Continuous pressure line */}
        {hourlyPath ? (
          <Path d={hourlyPath} stroke={Colors.primary} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />
        ) : null}

        {/* Episode dots — on top of the pressure line */}
        {episodes.map((d) => {
          const x = scaleX(d.timestamp.getTime());
          // Place dot on the hourly pressure line (find nearest hourly value)
          // or use episode's own pressure
          const y = scaleY(d.pressure);
          const color = SEVERITY_COLORS[d.severity - 1] || SEVERITY_COLORS[2];
          const isSelected = d.id === selectedId;
          return (
            <Circle
              key={d.id}
              cx={x} cy={y}
              r={isSelected ? 9 : 6}
              fill={color}
              stroke={isSelected ? Colors.text : Colors.background}
              strokeWidth={isSelected ? 2.5 : 1.5}
              onPress={() => setSelectedId(d.id === selectedId ? null : d.id)}
            />
          );
        })}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <SvgText
            key={`y-${tick}`}
            x={PADDING.left - 6} y={scaleY(tick) + 4}
            fill={Colors.textMuted} fontSize={10} textAnchor="end"
          >
            {tick.toFixed(0)}
          </SvgText>
        ))}

        {/* X-axis date labels */}
        {xLabels.map((l, i) => (
          <SvgText
            key={`x-${i}`}
            x={scaleX(l.time)} y={height - 6}
            fill={Colors.textMuted} fontSize={9} textAnchor="middle"
          >
            {l.label}
          </SvgText>
        ))}

        {/* Y-axis label */}
        <SvgText
          x={12} y={PADDING.top + chartH / 2}
          fill={Colors.textSecondary} fontSize={10} textAnchor="middle"
          rotation="-90" origin={`12, ${PADDING.top + chartH / 2}`}
        >
          hPa
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>Pressure</Text>
        </View>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.surfaceLight, borderRadius: 8,
  },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  tooltip: {
    backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tooltipText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  tooltipDate: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLine: { width: 14, height: 2, borderRadius: 1 },
  legendText: { color: Colors.textMuted, fontSize: 10 },
});
