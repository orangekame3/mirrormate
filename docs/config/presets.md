# Locale Presets

Mirror Mate supports locale-based configuration presets that automatically apply region-specific settings when you switch languages. This allows you to change just one setting (`app.locale`) and have time zones, weather locations, speech recognition language, and clock settings all update accordingly.

## How It Works

When you set `app.locale` in `config/app.yaml`, Mirror Mate automatically loads the corresponding preset from `config/presets/{locale}.yaml` and applies those settings to features, plugins, and providers.

```
config/app.yaml          ->  config/presets/{locale}.yaml
     |                              |
   locale: "ja"  ---------->  presets/ja.yaml (Tokyo, Japanese STT, etc.)
   locale: "en"  ---------->  presets/en.yaml (US settings, English STT, etc.)
```

## Quick Start

To switch between Japanese and English:

```yaml
# config/app.yaml
app:
  locale: "en"  # Change to "ja" for Japanese
```

That's it! The following settings are automatically applied:

| Setting | Japanese (ja) | English (en) |
|---------|--------------|--------------|
| Timezone | Asia/Tokyo | America/Los_Angeles |
| Weather Locations | Tokyo, Osaka | San Francisco, New York |
| Clock Format | 24-hour | 12-hour |
| STT Language | ja / ja-JP | en / en-US |

## Preset File Structure

Each preset file (`config/presets/{locale}.yaml`) contains locale-specific defaults:

```yaml
# config/presets/en.yaml

# Time feature settings
time:
  timezone: "America/Los_Angeles"

# Weather feature settings
weather:
  locations:
    - name: "San Francisco"
      latitude: 37.7749
      longitude: -122.4194
    - name: "New York"
      latitude: 40.7128
      longitude: -74.0060
  defaultLocation: "San Francisco"

# Clock plugin settings
clock:
  timezone: "America/Los_Angeles"
  format24h: false
  locale: "en-US"

# Speech-to-Text settings
stt:
  language: "en"       # For OpenAI/Local Whisper (ISO 639-1)
  webLanguage: "en-US" # For Web Speech API (BCP 47)
```

## Available Presets

### Japanese (ja)

Default settings for Japanese users:

| Category | Setting | Value |
|----------|---------|-------|
| Time | timezone | Asia/Tokyo |
| Weather | locations | Tokyo, Osaka |
| Weather | defaultLocation | Tokyo |
| Clock | format24h | true |
| Clock | locale | ja-JP |
| STT | language | ja |
| STT | webLanguage | ja-JP |

### English (en)

Default settings for English (US) users:

| Category | Setting | Value |
|----------|---------|-------|
| Time | timezone | America/Los_Angeles |
| Weather | locations | San Francisco, New York |
| Weather | defaultLocation | San Francisco |
| Clock | format24h | false |
| Clock | locale | en-US |
| STT | language | en |
| STT | webLanguage | en-US |

## Customizing Presets

You can customize preset files to match your specific needs:

### Example: European English User

```yaml
# config/presets/en.yaml (customized)

time:
  timezone: "Europe/London"

weather:
  locations:
    - name: "London"
      latitude: 51.5074
      longitude: -0.1278
    - name: "Paris"
      latitude: 48.8566
      longitude: 2.3522
  defaultLocation: "London"

clock:
  timezone: "Europe/London"
  format24h: true  # Europeans often prefer 24-hour
  locale: "en-GB"

stt:
  language: "en"
  webLanguage: "en-GB"
```

## Override Behavior

Preset values serve as defaults that can be overridden in individual config files:

1. **features.yaml** - If you explicitly set `timezone` in `features.time`, it takes precedence over the preset
2. **plugins.yaml** - If you explicitly set clock settings, they take precedence
3. **providers.yaml** - If you explicitly set STT language, it takes precedence

### Example: Override Weather Location

```yaml
# config/features.yaml
features:
  weather:
    enabled: true
    # This overrides the preset's locations
    locations:
      - name: "My City"
        latitude: 40.0
        longitude: -100.0
    defaultLocation: "My City"

  time:
    enabled: true
    # timezone is not set, so preset value is used
```

## Creating New Presets

To add support for a new locale:

1. Create a new preset file:

```yaml
# config/presets/de.yaml (German example)

time:
  timezone: "Europe/Berlin"

weather:
  locations:
    - name: "Berlin"
      latitude: 52.5200
      longitude: 13.4050
    - name: "Munich"
      latitude: 48.1351
      longitude: 11.5820
  defaultLocation: "Berlin"

clock:
  timezone: "Europe/Berlin"
  format24h: true
  locale: "de-DE"

stt:
  language: "de"
  webLanguage: "de-DE"
```

2. Add the locale to `src/lib/app/index.ts`:

```typescript
export type Locale = "ja" | "en" | "de";
```

3. Create locale-specific character and message files in `config/locales/de/` and `messages/de.json`

## Related Configuration

- [Features](features.md) - Weather, time, calendar settings
- [Plugins](plugins.md) - Clock widget settings
- [Providers](providers.md) - STT provider settings
- [Character](character.md) - AI personality per locale
