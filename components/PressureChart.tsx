import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/constants/Colors';

export type PressurePoint = {
  id: string;
  timestamp: Date;
  pressure: number;       // hPa
  pressureInHg: number;   // inHg for display
  severity: number;       // 1-5
  pressureTrend: string;
};

type Props = {
  data: PressurePoint[];
  width: number;
  height?: number;
  onPointPress?: (point: PressurePoint) => void;
};

const SEVERITY_COLORS = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#EF5350'];

const PADDING = { top: 20, right: 16, bottom: 32, left: 52 };

export default function PressureChart({ data, width, height = 220, onPointPress }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (data.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Log a few more episodes to see pressure trends</Text>
      </View>
    );
  }

  const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Chart dimensions
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Scale data
  const pressures = sorted.map((d) => d.pressure);
  const minP = Math.floor(Math.min(...pressures) - 2);
  const maxP = Math.ceil(Math.max(...pressures) + 2);
  const pRange = maxP - minP || 1;

  const minT = sorted[0].timestamp.getTime();
  const maxT = sorted[sorted.length - 1].timestamp.getTime();
  const tRange = maxT - minT || 1;

  const scaleX = (t: number) => PADDING.left + ((t - minT) / tRange) * chartW;
  const scaleY = (p: number) => PADDING.top + chartH - ((p - minP) / pRange) * chartH;

  // Build line path
  const pathParts = sorted.map((d, i) => {
    const x = scaleX(d.timestamp.getTime());
    const y = scaleY(d.pressure);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  });
  const linePath = pathParts.join(' ');

  // Build gradient fill (area under line)
  const areaPath = `${linePath} L ${scaleX(maxT)} ${PADDING.top + chartH} L ${scaleX(minT)} ${PADDING.top + chartH} Z`;

  // Y-axis ticks (4-5 ticks)
  const yTickCount = 4;
  const yStep = pRange / yTickCount;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(minP + i * yStep);
  }

  // X-axis date labels (max 5)
  const xLabelCount = Math.min(sorted.length, 5);
  const xStep = Math.floor(sorted.length / xLabelCount);
  const xLabels = sorted.filter((_, i) => i % xStep === 0 || i === sorted.length - 1);

  const selectedPoint = sorted.find((d) => d.id === selectedId);

  const handlePress = (point: PressurePoint) => {
    setSelectedId(point.id === selectedId ? null : point.id);
    onPointPress?.(point);
  };

  return (
    <View>
      {/* Tooltip */}
      {selectedPoint && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {selectedPoint.pressure.toFixed(1)} hPa ({selectedPoint.pressureInHg.toFixed(2)} inHg)
          </Text>
          <Text style={styles.tooltipDate}>
            {selectedPoint.timestamp.toLocaleDateString()} {selectedPoint.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {'  '}Severity: {selectedPoint.severity}/5
          </Text>
        </View>
      )}

      <Svg width={width} height={height}>
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

        {/* Area fill */}
        <Path d={areaPath} fill="rgba(108,142,191,0.1)" />

        {/* Pressure line */}
        <Path d={linePath} stroke={Colors.primary} strokeWidth={2} fill="none" strokeLinejoin="round" />

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
              r={isSelected ? 8 : 5}
              fill={color}
              stroke={isSelected ? Colors.text : 'none'}
              strokeWidth={isSelected ? 2 : 0}
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
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  tooltip: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tooltipText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  tooltipDate: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
});
