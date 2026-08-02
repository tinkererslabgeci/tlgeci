import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const EventSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
  },
  time: {
    type: String, // e.g. "4:30 PM - 6:30 PM"
    default: '',
  },
  venue: {
    type: String,
    default: "Tinkerers' Lab, GECI",
  },
  description: {
    type: String,
    required: [true, 'Short description is required'],
  },
  fullDescription: {
    type: String,
    default: '',
  },
  registrationUrl: {
    type: String,
    default: '',
  },
  posterSrc: {
    type: String,
    required: [true, 'Event poster image is required'],
  },
  tags: {
    type: [String],
    default: [],
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  }
}, { timestamps: true });

const Event = models.Event || model('Event', EventSchema);

export default Event;
