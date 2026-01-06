# Plugins

Mirror Mate supports visual widget plugins that display information on the mirror screen. Unlike [Features](features.md) which provide context to the AI, Plugins render UI components in the four corners of the screen.

## Features vs Plugins

| Aspect | Features | Plugins |
|--------|----------|---------|
| Purpose | Provide context to AI | Display UI widgets |
| Output | Text injected into prompts | React components |
| Location | Backend (API) | Frontend (Browser) |
| Example | Weather data for AI | Clock widget display |

## Configuration

Plugins are configured in `config/plugins.yaml`.

```yaml
plugins:
  clock:
    source: github:orangekame3/mirrormate-clock-plugin
    enabled: true
    position: top-left
    config:
      timezone: "Asia/Tokyo"
      format24h: true
```

### Source Types

The `source` field specifies where to get the plugin:

| Format | Description | Example |
|--------|-------------|---------|
| `github:owner/repo` | Install from GitHub repository | `github:orangekame3/mirrormate-clock-plugin` |
| `npm:package-name` | Install from npm/bun registry | `npm:mirrormate-clock-plugin` |
| `local:plugin-name` | Use from local `plugins/` directory | `local:my-custom-plugin` |

### Position Options

Plugins can be placed in any of the four corners:

| Position | Location |
|----------|----------|
| `top-left` | Upper left corner |
| `top-right` | Upper right corner |
| `bottom-left` | Lower left corner |
| `bottom-right` | Lower right corner |

---

## Installing Plugins

### From GitHub

1. Add the plugin to `package.json`:

```bash
bun add github:orangekame3/mirrormate-clock-plugin
```

2. Configure in `config/plugins.yaml`:

```yaml
plugins:
  clock:
    source: github:orangekame3/mirrormate-clock-plugin
    enabled: true
    position: top-left
```

3. Register the component in `src/components/PluginRenderer.tsx`:

```typescript
import { ClockWidget } from "mirrormate-clock-plugin";

const pluginComponents: Record<string, React.ComponentType<{ config?: Record<string, unknown> }>> = {
  clock: ClockWidget,
};
```

### From npm/bun registry

```bash
bun add mirrormate-clock-plugin
```

Then configure the same way with `source: npm:mirrormate-clock-plugin`.

### Local Development

1. Create a directory under `plugins/`:

```
plugins/
  my-plugin/
    manifest.yaml
    index.tsx
```

2. Add `manifest.yaml`:

```yaml
name: my-plugin
displayName: My Plugin
version: 1.0.0
description: My custom plugin
defaultPosition: top-right
defaultConfig:
  option1: value1
```

3. Configure with `source: local:my-plugin`.

---

## Available Plugins

### Clock Plugin

MagicMirror-inspired digital clock widget.

**Repository:** [orangekame3/mirrormate-clock-plugin](https://github.com/orangekame3/mirrormate-clock-plugin)

**Source:** `github:orangekame3/mirrormate-clock-plugin`

**Configuration:**

```yaml
plugins:
  clock:
    source: github:orangekame3/mirrormate-clock-plugin
    enabled: true
    position: top-left
    config:
      timezone: "Asia/Tokyo"
      format24h: true
      showSeconds: false
      showDate: true
      dateFormat: "long"
      showWeekday: true
      locale: "ja-JP"
```

> **Note**: Clock settings (timezone, format24h, locale) can be automatically set based on your app locale using [Locale Presets](presets.md). When not explicitly set, the preset values are used.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timezone` | string | `Asia/Tokyo` | IANA timezone identifier |
| `format24h` | boolean | `true` | Use 24-hour format |
| `showSeconds` | boolean | `false` | Display seconds |
| `showDate` | boolean | `true` | Display date |
| `dateFormat` | string | `long` | Date format (`short`, `long`, `full`) |
| `showWeekday` | boolean | `true` | Display weekday |
| `locale` | string | `ja-JP` | Locale for formatting |

---

## Creating Plugins

### Package Structure

```
mirrormate-my-plugin/
  src/
    index.ts        # Export entry
    MyWidget.tsx    # React component
  package.json      # With mirrormate metadata
  tsconfig.json
  tsup.config.ts    # Build config
```

### package.json

Include plugin metadata in the `mirrormate` field:

```json
{
  "name": "mirrormate-my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "mirrormate": {
    "name": "my-plugin",
    "displayName": "My Plugin",
    "version": "1.0.0",
    "description": "Description of my plugin",
    "defaultPosition": "top-right",
    "defaultConfig": {
      "option1": "default-value"
    }
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  }
}
```

### Component Implementation

```tsx
"use client";

import { useState, useEffect } from "react";

interface MyWidgetConfig {
  option1?: string;
}

interface MyWidgetProps {
  config?: MyWidgetConfig;
}

export function MyWidget({ config }: MyWidgetProps) {
  const option1 = config?.option1 ?? "default";

  return (
    <div className="text-white">
      {/* Your widget content */}
    </div>
  );
}
```

### Build Configuration (tsup.config.ts)

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  external: ["react"],
  clean: true,
});
```

### Publishing

1. Build the plugin:

```bash
bun run build
```

2. Push to GitHub:

```bash
git push origin main
```

3. Users can install via:

```bash
bun add github:your-username/mirrormate-my-plugin
```

---

## Plugin Naming Convention

For automatic discovery, use one of these naming patterns:

- `mirrormate-*-plugin` (e.g., `mirrormate-clock-plugin`)
- `mirrormate-plugin-*` (e.g., `mirrormate-plugin-clock`)
- `@mirrormate/plugin-*` (e.g., `@mirrormate/plugin-clock`)
