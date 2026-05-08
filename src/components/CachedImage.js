import React, { useState, useEffect } from "react";
import { Image, View, ActivityIndicator, StyleSheet } from "react-native";
import RNFS from "react-native-fs";
import { useTheme } from "../theme/Theme";
import { Image as ImageIcon } from "lucide-react-native";

/**
 * CachedImage component with built-in loading placeholders and local file caching.
 * Uses react-native-fs to save images to disk to prevent flickering and reduce network load.
 */
export default function CachedImage({ source, style, resizeMode = "cover", ...props }) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [localSource, setLocalSource] = useState(null);

  const isInvalidSource = !source || (source.uri !== undefined && !source.uri);

  useEffect(() => {
    let isMounted = true;

    const cacheImage = async () => {
      if (isInvalidSource || typeof source === 'number' || !source.uri) {
        setLocalSource(source);
        setIsLoading(false);
        return;
      }

      const uri = source.uri;
      // Use a simple hash for the filename to avoid invalid characters
      const filename = uri.split('/').pop().split('?')[0]; 
      const hash = Math.abs(uri.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0));
      const ext = filename.includes('.') ? filename.split('.').pop() : 'jpg';
      const cachePath = `${RNFS.CachesDirectoryPath}/cached_${hash}.${ext}`;

      try {
        const exists = await RNFS.exists(cachePath);
        if (exists) {
          if (isMounted) {
            setLocalSource({ uri: `file://${cachePath}` });
            setIsLoading(false);
          }
        } else {
          // Download and cache
          const ret = RNFS.downloadFile({
            fromUrl: uri,
            toFile: cachePath,
            background: true, // Continue in background
          });
          
          await ret.promise;
          
          if (isMounted) {
            setLocalSource({ uri: `file://${cachePath}` });
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.log("CachedImage err:", err);
        if (isMounted) {
          // Fallback to network URL if cache fails
          setLocalSource(source);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    cacheImage();

    return () => {
      isMounted = false;
    };
  }, [source]);

  return (
    <View style={[styles.container, style]}>
      {/* Loading Placeholder */}
      {isLoading && !hasError && !isInvalidSource && (
        <View style={[styles.placeholder, { backgroundColor: colors.secondary }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* Error / Empty Placeholder */}
      {(hasError && !localSource) || isInvalidSource ? (
        <View style={[styles.placeholder, { backgroundColor: colors.secondary }]}>
          <ImageIcon size={24} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
        </View>
      ) : null}

      {/* Actual Image */}
      {localSource && !isInvalidSource && (
        <Image
          source={localSource}
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
