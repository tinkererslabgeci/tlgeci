import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import { allEvents } from './src/data/eventsData.js';
import Event from './api/models/Event.js';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'tlgeci' });
    console.log('Connected to MongoDB tlgeci database');

    for (const event of allEvents) {
      // Map old schema fields to new schema
      const dateToUse = event.startDate || '2026-01-01';
      
      const newEvent = new Event({
        title: event.title,
        date: new Date(dateToUse),
        time: event.time || '',
        venue: event.venue || '',
        description: event.description || '',
        fullDescription: event.fullDescription || '',
        registrationUrl: event.registrationUrl || '',
        posterSrc: event.posterSrc || '',
        tags: [],
        slug: event.slug || event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      });

      // Check if it already exists by slug
      const existing = await Event.findOne({ slug: newEvent.slug });
      if (!existing) {
        await newEvent.save();
        console.log(`Saved: ${event.title}`);
      } else {
        console.log(`Skipped existing: ${event.title}`);
      }
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
