import { connectToDatabase } from './db.js';
import Gallery from './models/Gallery.js';
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
      // Populate eventId so we can show the linked event title in the gallery
      const images = await Gallery.find({}).populate('eventId', 'title').sort({ createdAt: -1 });
      res.status(200).json(images);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch gallery images' });
    }
  } else if (req.method === 'POST') {
    try {
      const { imageBase64, caption, eventId } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing image data' });
      }

      const uploadResponse = await cloudinary.uploader.upload(imageBase64, {
        folder: 'tlgeci/gallery',
      });

      const newGalleryItem = new Gallery({
        imageUrl: uploadResponse.secure_url,
        caption: caption || '',
        eventId: eventId || null
      });

      await newGalleryItem.save();
      
      // Return populated version if linked to event
      if (eventId) {
        await newGalleryItem.populate('eventId', 'title');
      }

      return res.status(200).json(newGalleryItem);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to upload gallery image' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing image ID' });
      
      const image = await Gallery.findByIdAndDelete(id);
      if (!image) return res.status(404).json({ error: 'Image not found' });
      
      res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete image' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
