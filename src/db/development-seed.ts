import { db, Sayings, Types, Intros, Users, Likes } from 'astro:db';
import seed from '../../db/seed.ts';
import { createLogger } from '../utils/logger';

const logger = createLogger('DevelopmentSeed');

export async function setupDevData() {
  try {
    logger.info('Checking database status...');
    
    // Check if Users table exists and has data
    const users = await db.select().from(Users);
    
    if (!users || users.length === 0) {
      logger.info('No users found. Running seed data for development...');
      const result = await seed();
      if (result) {
        logger.info('Seed completed successfully');
      } else {
        logger.error('Seed did not complete successfully');
      }
    } else {
      logger.info(`Database already has ${users.length} users, skipping seed`);
    }
    
    // Display current database status
    try {
      const userCount = (await db.select().from(Users)).length;
      const sayingsCount = (await db.select().from(Sayings)).length;
      const introsCount = (await db.select().from(Intros)).length;
      const typesCount = (await db.select().from(Types)).length;
      
      logger.info(`Current database status: Users: ${userCount}, Sayings: ${sayingsCount}, Intros: ${introsCount}, Types: ${typesCount}`);
    } catch (countError) {
      logger.error('Error counting database records:', countError);
    }
  } catch (error) {
    logger.error('Error in setupDevData:', error);
  }
}

// Run automatically in development
if (process.env.NODE_ENV === 'development') {
  logger.info('Development environment detected, checking database...');
  setTimeout(() => {
    setupDevData()
      .catch(error => {
        logger.error('Failed to setup development data:', error);
      });
  }, 2000); // Small delay to allow database to initialize
}