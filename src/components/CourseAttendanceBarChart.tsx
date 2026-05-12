import React from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { useTheme } from "../theme/Theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CourseAttendanceBarChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
    }>;
  };
  title?: string;
  subtitle?: string;
}

export default function CourseAttendanceBarChart({
  data,
  title = "Attendance by Course",
  subtitle = "Your attendance rate across enrolled courses",
}: CourseAttendanceBarChartProps) {
  const { colors } = useTheme();

  const chartConfig = {
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 0,
    color: () => colors.primary,
    labelColor: () => colors.mutedForeground,
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.6,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: colors.border,
    },
    propsForVerticalLabels: {
      fontSize: 10,
    },
    propsForHorizontalLabels: {
      fontSize: 10,
    },
  };

  const getBarColor = (value: number) => {
    if (value >= 75) return colors.success;
    if (value >= 50) return colors.warning;
    return colors.destructive;
  };

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.datasets[0].data,
      },
    ],
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={chartData}
          width={Math.max(SCREEN_WIDTH - 72, data.labels.length * 60)}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars={true}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          segments={5}
          yAxisLabel=""
          yAxisSuffix="%"
          fromZero={true}
          fromNumber={100}
          yAxisInterval={20}
        />
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>≥75% (Good)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>50-74% (Warning)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{"<"}50% (Poor)</Text>
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
  chart: {
    borderRadius: 16,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
  },
});
