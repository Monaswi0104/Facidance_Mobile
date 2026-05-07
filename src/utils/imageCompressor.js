/**
 * imageCompressor.js
 *
 * Utility for compressing images before upload.
 * Reduces file size by resizing to a target resolution and adjusting JPEG quality.
 * This prevents large camera captures (3-5 MB each) from being uploaded raw,
 * significantly improving upload speed and reducing mobile data usage.
 */

import ImageResizer from "@bam.tech/react-native-image-resizer";
import RNFS from "react-native-fs";

// Target dimensions: 720p landscape (suitable for face recognition)
const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const JPEG_QUALITY = 75; // 0-100, 75 is a good balance of quality vs size

/**
 * Compress a single image file.
 * @param {string} uri - file:// URI of the source image
 * @param {object} options - Optional overrides
 * @param {number} options.maxWidth - Max width in px (default 1280)
 * @param {number} options.maxHeight - Max height in px (default 720)
 * @param {number} options.quality - JPEG quality 0-100 (default 75)
 * @returns {Promise<{uri: string, size: number}>} Compressed image URI and byte size
 */
export async function compressImage(uri, options = {}) {
  const {
    maxWidth = TARGET_WIDTH,
    maxHeight = TARGET_HEIGHT,
    quality = JPEG_QUALITY,
  } = options;

  try {
    const result = await ImageResizer.createResizedImage(
      uri,
      maxWidth,
      maxHeight,
      "JPEG",
      quality,
      0,                // rotation
      undefined,        // output path (auto)
      false,            // keep meta
      { mode: "contain", onlyScaleDown: true } // don't upscale small images
    );

    // Log size reduction for debugging
    try {
      const originalStat = await RNFS.stat(uri.replace("file://", ""));
      const compressedStat = await RNFS.stat(result.path);
      const reduction = ((1 - compressedStat.size / originalStat.size) * 100).toFixed(1);
      console.log(
        `[ImageCompressor] ${(originalStat.size / 1024).toFixed(0)}KB → ${(compressedStat.size / 1024).toFixed(0)}KB (${reduction}% reduction)`
      );
    } catch (statErr) {
      // stat can fail on some URIs, non-critical
    }

    return {
      uri: result.uri.startsWith("file://") ? result.uri : `file://${result.uri}`,
      size: result.size,
    };
  } catch (err) {
    console.warn("[ImageCompressor] Compression failed, using original:", err.message);
    // Fallback: return original URI unchanged
    return { uri, size: 0 };
  }
}

/**
 * Compress an array of frame objects for the attendance upload.
 * Each frame is expected to have { uri, type, name }.
 * Returns the same array shape with compressed URIs.
 */
export async function compressFrames(frames, options = {}) {
  const compressed = [];

  for (const frame of frames) {
    const result = await compressImage(frame.uri, options);
    compressed.push({
      ...frame,
      uri: result.uri,
    });
  }

  return compressed;
}
