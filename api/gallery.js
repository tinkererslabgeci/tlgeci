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
      // Populate eventId so we can show the linked event title in the gallery
      const images = await Gallery.find({}).populate('eventId', 'title').sort({ createdAt: -1 });
      res.status(200).json(images);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch gallery images' });
    }
  } else if (req.method === 'POST') {
    try {
      const { caption, eventId, imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Image is required' });
      }

      // Upload image to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(imageBase64, {
        folder: 'tlgeci-gallery',
      });

      const newImage = new Gallery({
        imageUrl: uploadResponse.secure_url,
        caption: caption || '',
        eventId: eventId || null
      });

      await newImage.save();
      return res.status(200).json(newImage);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to upload image: ' + error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing image ID' });

      const { caption, eventId, imageBase64 } = req.body;

      const galleryToUpdate = await Gallery.findById(id);
      if (!galleryToUpdate) return res.status(404).json({ error: 'Image not found' });

      let imageUrl = galleryToUpdate.imageUrl;

      // Only upload new image if one was provided
      if (imageBase64) {
        // Upload new
        const uploadResponse = await cloudinary.uploader.upload(imageBase64, {
          folder: 'tlgeci-gallery',
        });
        
        // Try to delete old image
        const oldPublicId = getPublicIdFromUrl(imageUrl);
        if (oldPublicId) {
          try { await cloudinary.uploader.destroy(oldPublicId); } catch(e) { console.error('Failed to delete old image', e); }
        }
        
        imageUrl = uploadResponse.secure_url;
      }

      galleryToUpdate.caption = caption !== undefined ? caption : galleryToUpdate.caption;
      galleryToUpdate.eventId = eventId !== undefined ? (eventId || null) : galleryToUpdate.eventId;
      galleryToUpdate.imageUrl = imageUrl;

      await galleryToUpdate.save();
      return res.status(200).json(galleryToUpdate);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update image: ' + error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing image ID' });
      
      const galleryItem = await Gallery.findById(id);
      if (!galleryItem) return res.status(404).json({ error: 'Image not found' });
      
      // Try to delete image from cloudinary
      const publicId = getPublicIdFromUrl(galleryItem.imageUrl);
      if (publicId) {
        try { await cloudinary.uploader.destroy(publicId); } catch(e) { console.error('Failed to delete image', e); }
      }

      await Gallery.findByIdAndDelete(id);
      
      res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete image' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
