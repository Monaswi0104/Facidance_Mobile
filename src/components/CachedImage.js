import React, { useState } from "react";
import { Image, View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../theme/Theme";
import { Image as ImageIcon } from "lucide-react-native";

/**
 * CachedImage component with built-in loading placeholders.
 * Note: React Native's default <Image> handles basic memory/disk caching natively on iOS/Android.
 * For advanced caching (e.g. offline persistence), you'd drop in react-native-fast-image here.
 */
export default function CachedImage({ source, style, resizeMode = "cover", ...props }) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // If source is null or empty URI, immediately show error placeholder
  const isInvalidSource = !source || (source.uri !== undefined && !source.uri);

  return (
    <View style={[styles.container, style]}>
      {/* Loading Placeholder */}
      {isLoading && !hasError && !isInvalidSource && (
        <View style={[styles.placeholder, { backgroundColor: colors.secondary }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* Error / Empty Placeholder */}
      {(hasError || isInvalidSource) && (
        <View style={[styles.placeholder, { backgroundColor: colors.secondary }]}>
          <ImageIcon size={24} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
        </View>
      )}

      {/* Actual Image */}
      {!isInvalidSource && (
        <Image
          source={source}
          style={[StyleSheet.absoluteFill, { opacity: isLoading ? 0 : 1 }]}
          resizeMode={resizeMode}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          {...props}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});
