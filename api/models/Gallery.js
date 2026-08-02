import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const GallerySchema = new Schema({
  imageUrl: {
    type: String,
    required: [true, 'Gallery image URL is required'],
  },
  caption: {
    type: String,
    default: '',
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    default: null,
  }
}, { timestamps: true });

const Gallery = models.Gallery || model('Gallery', GallerySchema);

export default Gallery;
