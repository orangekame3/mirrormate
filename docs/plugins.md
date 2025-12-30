# Plugins

Magic Mirror uses a YAML-based plugin system to provide contextual information to the AI. Plugins fetch external data and inject it into the system prompt.

## Configuration

All plugins are configured in `config/plugins.yaml`.

---

## Weather Plugin

Fetches current weather data from [Open-Meteo](https://open-meteo.com/) (free, no API key required).

### Configuration

```yaml
plugins:
  weather:
    enabled: true
    provider: open-meteo
    locations:
      - name: "Tokyo"
        latitude: 35.6762
        longitude: 139.6503
      - name: "Osaka"
        latitude: 34.6937
        longitude: 135.5023
    defaultLocation: "Tokyo"
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | boolean | Enable/disable the plugin |
| `provider` | string | Weather API provider (currently only `open-meteo`) |
| `locations` | array | List of locations with name, latitude, and longitude |
| `defaultLocation` | string | Name of the default location to use |

### Output Example

```
Current weather in Tokyo: Sunny, 15°C, wind 10km/h
```

---

## Calendar Plugin

Fetches events from Google Calendar using a service account.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter a project name (e.g., "magic-mirror") and click **Create**
4. Wait for the project to be created and select it

### Step 2: Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and then click **Enable**

### Step 3: Create a Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **+ Create Service Account**
3. Enter a name (e.g., "calendar-reader") and click **Create and Continue**
4. Skip the optional steps and click **Done**
5. Click on the newly created service account
6. Go to the **Keys** tab
7. Click **Add Key** → **Create new key**
8. Select **JSON** and click **Create**
9. Save the downloaded JSON file securely

### Step 4: Share Your Calendar with the Service Account

> **Important:** The service account can only access calendars that are explicitly shared with it.

1. Open [Google Calendar](https://calendar.google.com/)
2. In the left sidebar, hover over the calendar you want to share
3. Click the **⋮** (three dots) → **Settings and sharing**
4. Scroll down to **Share with specific people or groups**
5. Click **+ Add people and groups**
6. Enter the service account email address:
   - Find it in the downloaded JSON file under `client_email`
   - It looks like: `calendar-reader@your-project.iam.gserviceaccount.com`
7. Set permission to **See all event details**
8. Click **Send**

### Step 5: Configure Environment Variables

Add to your `.env` file:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
```

> **Note:** The private key should have `\n` for newlines (as stored in the JSON key file).

### Step 6: Configure the Plugin

```yaml
plugins:
  calendar:
    enabled: true
    maxResults: 5
```

### Options

**Environment Variables:**

| Variable | Description |
|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email from JSON key file |
| `GOOGLE_PRIVATE_KEY` | Private key from JSON key file |
| `GOOGLE_CALENDAR_ID` | Calendar ID to fetch events from |

**YAML Options:**

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | boolean | Enable/disable the plugin |
| `maxResults` | number | Maximum number of events to fetch |

### Finding Your Calendar ID

1. Open [Google Calendar](https://calendar.google.com/)
2. Click the three dots next to your calendar
3. Select "Settings and sharing"
4. Scroll to "Integrate calendar"
5. Copy the "Calendar ID"

### Output Example

```
Today's schedule: 10:00 Team Meeting, 14:00 1-on-1
Next event: 10:00 Team Meeting (in 30 minutes)
```

### Troubleshooting

#### Error: "Not Found" (404)

This error means the service account cannot access the calendar.

**Solution:**
- Verify the calendar is shared with the service account (see Step 4)
- Check that the `calendarId` in `config/plugins.yaml` matches your calendar
- Wait a few minutes after sharing (changes may take time to propagate)

#### Error: "Missing credentials"

**Solution:**
- Ensure `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` are set in `.env`
- Restart the dev server after modifying `.env`

#### Error: "Invalid grant" or authentication errors

**Solution:**
- Verify the private key is correctly formatted with `\n` for newlines
- Ensure the service account key hasn't been revoked
- Check that the Google Calendar API is enabled in your project

---

## Creating Custom Plugins

To create a new plugin:

1. Create a new directory under `src/lib/plugins/`
2. Implement the `Plugin` interface:

```typescript
import { Plugin } from "../types";

export class MyPlugin implements Plugin {
  name = "my-plugin";

  async getContext(): Promise<string> {
    // Fetch and format your data
    return "Context string for AI";
  }
}
```

3. Add configuration type in `src/lib/plugins/types.ts`
4. Register the plugin in `src/lib/plugins/registry.ts`
5. Add configuration to `config/plugins.yaml`
