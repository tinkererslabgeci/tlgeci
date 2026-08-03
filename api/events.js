import { connectToDatabase } from './db.js';
import Event from './models/Event.js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

// Simple tag generator
function generateTags(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const words = text.replace(/[^a-z0-9 ]/g, '').split(' ');
  const stopWords = ['this','that','with','from','your','have','more','will','about','which'];
  const tags = new Set();
  
  words.forEach(word => {
    if (word.length > 4 && !stopWords.includes(word)) {
      tags.add(word);
    }
  });
  return Array.from(tags).slice(0, 5); // Return up to 5 auto tags
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to extract Cloudinary public_id from URL
function getPublicIdFromUrl(url) {
  if (!url) return null;
  try {
    const parts = url.split('/');
    const filename = parts.pop();
    const folder = parts.pop();
    const publicId = `${folder}/${filename.split('.')[0]}`;
    return publicId;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      const events = await Event.find({}).sort({ date: -1 });
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, date, time, venue, description, fullDescription, registrationUrl, imageBase64, customTags } = req.body;

      if (!title || !date || !description || !imageBase64) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Upload image to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(imageBase64, {
        folder: 'tlgeci-events',
      });

      // Handle tags
      let finalTags = [];
      if (customTags && customTags.trim().length > 0) {
        finalTags = customTags.split(',').map(t => t.trim().toLowerCase());
      } else {
        finalTags = generateTags(title, description);
      }

      let baseSlug = generateSlug(title);
      let slug = baseSlug;
      let counter = 1;
      
      // Ensure unique slug
      while (await Event.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const newEvent = new Event({
        title,
        date,
        time,
        venue,
        description,
        fullDescription,
        registrationUrl,
        posterSrc: uploadResponse.secure_url,
        tags: finalTags,
        slug
      });

      await newEvent.save();
      return res.status(200).json(newEvent);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create event: ' + error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing event ID' });

      const { title, date, time, venue, description, fullDescription, registrationUrl, imageBase64, customTags } = req.body;
      
      const eventToUpdate = await Event.findById(id);
      if (!eventToUpdate) return res.status(404).json({ error: 'Event not found' });

      let posterSrc = eventToUpdate.posterSrc;

      // Only upload new image if one was provided
      if (imageBase64) {
        // Upload new
        const uploadResponse = await cloudinary.uploader.upload(imageBase64, {
          folder: 'tlgeci-events',
        });
        
        // Try to delete old image
        const oldPublicId = getPublicIdFromUrl(posterSrc);
        if (oldPublicId) {
          try { await cloudinary.uploader.destroy(oldPublicId); } catch(e) { console.error('Failed to delete old image', e); }
        }
        
        posterSrc = uploadResponse.secure_url;
      }

      // Handle tags
      let finalTags = eventToUpdate.tags;
      if (customTags !== undefined) {
        if (customTags.trim().length > 0) {
          finalTags = customTags.split(',').map(t => t.trim().toLowerCase());
        } else {
          finalTags = generateTags(title, description);
        }
      }

      // We only update slug if title changed significantly, but let's keep it simple and just update other fields
      eventToUpdate.title = title || eventToUpdate.title;
      eventToUpdate.date = date || eventToUpdate.date;
      eventToUpdate.time = time !== undefined ? time : eventToUpdate.time;
      eventToUpdate.venue = venue !== undefined ? venue : eventToUpdate.venue;
      eventToUpdate.description = description || eventToUpdate.description;
      eventToUpdate.fullDescription = fullDescription !== undefined ? fullDescription : eventToUpdate.fullDescription;
      eventToUpdate.registrationUrl = registrationUrl !== undefined ? registrationUrl : eventToUpdate.registrationUrl;
      eventToUpdate.tags = finalTags;
      eventToUpdate.posterSrc = posterSrc;

      await eventToUpdate.save();
      return res.status(200).json(eventToUpdate);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update event: ' + error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing event ID' });
      
      const event = await Event.findById(id);
      if (!event) return res.status(404).json({ error: 'Event not found' });
      
      // Try to delete image from cloudinary
      const publicId = getPublicIdFromUrl(event.posterSrc);
      if (publicId) {
        try { await cloudinary.uploader.destroy(publicId); } catch(e) { console.error('Failed to delete image', e); }
      }
      
      await Event.findByIdAndDelete(id);
      
      res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete event' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
