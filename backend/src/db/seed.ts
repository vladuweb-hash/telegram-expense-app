import { db } from './index.js';
import { logger } from '../utils/logger.js';

async function seed() {
  logger.info('Starting database seeding...');
  
  try {
    // Add test user (only in development)
    const testUser = {
      telegram_id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en',
      is_premium: false,
    };
    
    await db.query(
      `INSERT INTO users (telegram_id, first_name, last_name, username, language_code, is_premium)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (telegram_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         username = EXCLUDED.username`,
      [
        testUser.telegram_id,
        testUser.first_name,
        testUser.last_name,
        testUser.username,
        testUser.language_code,
        testUser.is_premium,
      ]
    );
    
    logger.info('Seed data inserted successfully');
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    await db.end();
  }
}

seed().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
