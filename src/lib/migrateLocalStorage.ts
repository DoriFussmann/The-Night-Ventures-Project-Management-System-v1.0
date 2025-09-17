import { getHealth, createOne } from './dataClient';

export interface MigrationBanner {
  collection: string;
  localCount: number;
  onMigrate: () => Promise<void>;
  onDismiss: () => void;
}

export async function checkForLocalStorageMigration(): Promise<MigrationBanner[]> {
  try {
    const health = await getHealth();
    const banners: MigrationBanner[] = [];

    for (const collectionMeta of health.collections) {
      const { name } = collectionMeta;
      const localKey = `admin:${name}`;
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check if API has no data but localStorage does
            const apiHasData = collectionMeta.size > 2; // More than just "[]"
            if (!apiHasData) {
              banners.push({
                collection: name,
                localCount: parsed.length,
                onMigrate: async () => {
                  for (const item of parsed) {
                    await createOne(name, item);
                  }
                  localStorage.removeItem(localKey);
                },
                onDismiss: () => {
                  localStorage.removeItem(localKey);
                }
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to parse localStorage for ${name}:`, e);
        }
      }
    }

    return banners;
  } catch (e) {
    console.warn('Failed to check for localStorage migration:', e);
    return [];
  }
}
