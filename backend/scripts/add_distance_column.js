const db = require('../config/database');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add distance_from_client column if it doesn't exist
        // Note: SQLite doesn't support IF NOT EXISTS in ADD COLUMN directly in all versions,
        // but it's safe to try-catch or check existence first.
        // Given we verified it doesn't exist, we will proceed with ALTER TABLE.

        // Using pool.execute which is a wrapper around connection.execute
        // Since sqlite3 doesn't support adding column with IF NOT EXISTS, we'll try to add it
        // and catch the error if it already exists (though we verified it doesn't).

        await db.execute(
            `ALTER TABLE checkins ADD COLUMN distance_from_client REAL`
        );

        console.log('Migration successful: Added distance_from_client column.');
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('Column distance_from_client already exists.');
        } else {
            console.error('Migration failed:', error);
            process.exit(1);
        }
    }
}

migrate();
