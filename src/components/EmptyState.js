import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { useTheme } from "../theme/Theme";
import { BookOpen, Users, Calendar, Search, Plus, ArrowRight, RefreshCw, Settings, Bell } from "lucide-react-native";

export default function EmptyState({
  icon: Icon = BookOpen,
  title = "No Data Found",
  subtitle = "There's nothing to display here yet.",
  actionText = "Refresh",
  onAction,
  showImage = true,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {showImage && (
        <View style={styles.imageContainer}>
          <Icon size={80} color={colors.border} style={{ opacity: 0.5 }} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Icon size={48} color={colors.mutedForeground} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {onAction && (
          <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.7}>
            {actionText === "Refresh" ? (
              <RefreshCw size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />
            ) : (
              <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />
            )}
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function EmptyStateWithActions({
  icon: Icon = BookOpen,
  title = "No Data Found",
  subtitle = "There's nothing to display here yet.",
  actions = [],
  showImage = true,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {showImage && (
        <View style={styles.imageContainer}>
          <Icon size={80} color={colors.border} style={{ opacity: 0.5 }} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Icon size={48} color={colors.mutedForeground} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionBtn, action.style]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                {action.icon && <action.icon size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />}
                <Text style={styles.actionText}>{action.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export function EmptyStateWithSearch({
  icon: Icon = Search,
  title = "No Results Found",
  subtitle = "Try adjusting your search terms or filters.",
  onClearFilters,
  showImage = true,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {showImage && (
        <View style={styles.imageContainer}>
          <Icon size={80} color={colors.border} style={{ opacity: 0.5 }} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Icon size={48} color={colors.mutedForeground} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {onClearFilters && (
          <TouchableOpacity style={styles.clearBtn} onPress={onClearFilters} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function EmptyStateWithCTA({
  icon: Icon = BookOpen,
  title = "No Data Found",
  subtitle = "Get started by adding your first item.",
  ctaText = "Add New",
  ctaIcon = Plus,
  onCTA,
  showImage = true,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {showImage && (
        <View style={styles.imageContainer}>
          <Icon size={80} color={colors.border} style={{ opacity: 0.5 }} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Icon size={48} color={colors.mutedForeground} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={onCTA} activeOpacity={0.7}>
          {ctaIcon && <ctaIcon size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />}
          <Text style={styles.ctaText}>{ctaText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function EmptyStateWithIllustration({
  icon: Icon = BookOpen,
  title = "No Data Found",
  subtitle = "There's nothing to display here yet.",
  illustration = "no-data",
  showImage = true,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {showImage && (
        <View style={styles.imageContainer}>
          <Icon size={80} color={colors.border} style={{ opacity: 0.5 }} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Icon size={48} color={colors.mutedForeground} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  imageContainer: {
    marginBottom: 24,
  },
  image: {
    width: 120,
    height: 120,
    opacity: 0.5,
  },
  content: {
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  clearBtn: {
    backgroundColor: colors.muted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textBody,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
});
