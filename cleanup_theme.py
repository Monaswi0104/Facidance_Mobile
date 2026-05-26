import os
import re

src_dir = '/Users/monaswi/Documents/Facidance_Mobile/src'

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r') as file:
                content = file.read()
            
            orig_content = content
            
            # 1. Clean up ternaries: isDark ? "dark_val" : "light_val"
            # Note: This regex handles simple patterns.
            content = re.sub(r'isDark\s*\?\s*\'rgba\(18,18,18,0\.65\)\'\s*:\s*\'([^\']+)\'', r"'\1'", content)
            content = re.sub(r'isDark\s*\?\s*\'rgba\(52,211,153,0\.15\)\'\s*:\s*\'([^\']+)\'', r"'\1'", content)
            content = re.sub(r'isDark\s*\?\s*1\.5\s*:\s*0', r'0', content)
            content = re.sub(r'isDark\s*\?\s*colors\.border\s*:\s*\'transparent\'', r"'transparent'", content)
            content = re.sub(r'isDark\s*\?\s*"light-content"\s*:\s*"dark-content"', r'"dark-content"', content)
            content = re.sub(r'isDark\s*\?\s*"light-content"\s*:\s*"light-content"', r'"light-content"', content)
            content = re.sub(r'isDark\s*\?\s*1\.5\s*:\s*1', r'1', content)
            content = re.sub(r'isDark\s*\?\s*colors\.mutedForeground\s*\+\s*"60"\s*:\s*colors\.border', r'colors.border', content)
            content = re.sub(r'isDark\s*\?\s*colors\.card\s*:\s*"rgba\(13,148,136,0\.04\)"', r'"rgba(13,148,136,0.04)"', content)
            content = re.sub(r'isDark\s*\?\s*colors\.border\s*:\s*"rgba\(13,148,136,0\.15\)"', r'"rgba(13,148,136,0.15)"', content)
            content = re.sub(r'isDark\s*\?\s*\'#8B5CF6\'\s*:\s*\'#7C3AED\'', r"'#7C3AED'", content)
            content = re.sub(r'isDark\s*\?\s*\'rgba\(255,255,255,0\.06\)\'\s*:\s*\'rgba\(0,0,0,0\.05\)\'', r"'rgba(0,0,0,0.05)'", content)
            content = re.sub(r'isDark\s*\?\s*\'#10B981\'\s*:\s*\'#059669\'', r"'#059669'", content)
            content = re.sub(r'isDark\s*\?\s*colors\.card\s*:\s*colors\.background', r'colors.background', content)

            # 2. Clean up useTheme() destructurings
            content = re.sub(r',\s*isDark\s*', '', content)
            content = re.sub(r'\s*isDark\s*,', '', content)
            content = re.sub(r',\s*toggleTheme\s*', '', content)
            content = re.sub(r'\s*toggleTheme\s*,', '', content)
            content = re.sub(r',\s*mode\s*', '', content)
            content = re.sub(r'\s*mode\s*,', '', content)
            content = re.sub(r'\{\s*isDark\s*\}', '{}', content)
            
            # Clean up createStyles signature and usage
            content = re.sub(r'const styles = useMemo\(\(\) => createStyles\(colors, isDark\), \[colors, isDark\]\);', r'const styles = useMemo(() => createStyles(colors), [colors]);', content)
            content = re.sub(r'const createStyles = \(colors: any, isDark: boolean\) =>', r'const createStyles = (colors: any) =>', content)
            content = re.sub(r'const createStyles = \(colors, isDark\) =>', r'const createStyles = (colors) =>', content)
            
            # Clean up ThemeIcon block
            content = re.sub(r'const ThemeIcon = mode === \'dark\' \? Moon : mode === \'light\' \? Sun : Monitor;\n', '', content)

            # Special case for SkeletonLoader
            content = re.sub(r'colors, isDark }\)', r'colors })', content)
            content = re.sub(r'isDark={isDark}', '', content)
            
            if content != orig_content:
                with open(path, 'w') as file:
                    file.write(content)
                print(f"Updated {path}")
