import { getDatabase } from '../database';
import { AppSettings } from '../shared/types';

export class SettingsService {
  public static getSettings(): AppSettings {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];

      const settingsMap: Record<string, unknown> = {};
      for (const row of rows) {
        try {
          settingsMap[row.key] = JSON.parse(row.value);
        } catch {
          settingsMap[row.key] = row.value;
        }
      }

      return {
        theme: 'dark',
        appName: (settingsMap.appName as string) || 'Crafted Studio Code',
        version: (settingsMap.version as string) || '1.0.0',
        logoPath: (settingsMap.logoPath as string | undefined) || undefined,
        activeProjectId: (settingsMap.activeProjectId as string | undefined) || undefined,
      };
    } catch (err) {
      console.error('[SettingsService] Error reading settings from DB:', err);
      return {
        theme: 'dark',
        appName: 'Crafted Studio Code',
        version: '1.0.0',
      };
    }
  }

  public static setSetting(key: keyof AppSettings, value: unknown): boolean {
    try {
      const db = getDatabase();
      const stringified = JSON.stringify(value);
      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `).run(key, stringified);
      return true;
    } catch (err) {
      console.error(`[SettingsService] Error updating setting '${key}':`, err);
      return false;
    }
  }
}
