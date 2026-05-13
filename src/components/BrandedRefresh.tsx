import React, { forwardRef } from "react";
import { RefreshControl, Platform, RefreshControlProps } from "react-native";
import { useTheme } from "../theme/Theme";

interface BrandedRefreshProps extends Omit<RefreshControlProps, 'colors' | 'progressBackgroundColor' | 'tintColor' | 'titleColor'> {
  refreshing: boolean;
  onRefresh: () => void;
  title?: string;
}

/**
 * BrandedRefreshControl — A themed pull-to-refresh indicator
 * that uses Facidance brand colors with a multi-color spin effect.
 *
 * Drop-in replacement for <RefreshControl />.
 */
const BrandedRefresh = forwardRef<RefreshControl, BrandedRefreshProps>(
  ({ refreshing, onRefresh, title, ...props }, ref) => {
    const { colors, isDark } = useTheme();

    // Brand color cycle: primary → accent → teal → success
    const brandColors: string[] = [
      colors.primaryDark,   // #024950  (dark teal)
      colors.accent,        // #0FA4AF  (teal/cyan)
      "#22d3ee",            // bright cyan
      colors.success,       // green
    ];

    return (
      <RefreshControl
        ref={ref}
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={brandColors}
        progressBackgroundColor={isDark ? colors.card : colors.background}
        tintColor={colors.accent}
        title={refreshing ? (title || "Refreshing…") : "Pull to refresh"}
        titleColor={colors.mutedForeground}
        progressViewOffset={Platform.OS === "android" ? 50 : 0}
        {...props}
      />
    );
  }
);

export default BrandedRefresh;
