import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { PieChart } from "react-native-chart-kit";
import { useTheme } from "../theme/Theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AttendancePieChartProps {
  data: Array<{
    name: string;
    population: number;
    color: string;
    legendFontColor?: string;
    legendFontSize?: number;
  }>;
  title?: string;
  subtitle?: string;
}

export default function AttendancePieChart({
  data,
  title = "Attendance Distribution",
  subtitle = "Your overall attendance breakdown",
}: AttendancePieChartProps) {
  const { colors, isDark } = useTheme();

  const chartConfig = {
    color: () => colors.foreground,
    legendFontColor: colors.mutedForeground,
    legendFontSize: 12,
  };

  const total = data.reduce((sum, item) => sum + item.population, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.chartContainer}>
          <PieChart
            data={data.map(item => ({
              ...item,
              legendFontColor: item.legendFontColor || colors.mutedForeground,
              legendFontSize: item.legendFontSize || 12,
            }))}
            width={160}
            height={160}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="40"
            hasLegend={false}
            center={[0, 0]}
            style={styles.chart}
          />
        </View>

        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <View>
                <Text style={[styles.legendText, { color: colors.foreground, fontWeight: "600" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.legendSubText, { color: colors.mutedForeground }]}>
                  {item.population} ({total > 0 ? ((item.population / total) * 100).toFixed(0) : 0}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  chart: {
    borderRadius: 16,
  },
  legend: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    marginBottom: 2,
  },
  legendSubText: {
    fontSize: 12,
  },
});
