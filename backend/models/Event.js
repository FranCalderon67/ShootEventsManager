const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  shooter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  a: { type: Number, default: 0 },
  b: { type: Number, default: 0 },
  c: { type: Number, default: 0 },
  noShoot: { type: Number, default: 0 },
  miss: { type: Number, default: 0 },
  procedural: { type: Number, default: 0 },
  warnings: { type: Number, default: 0 },
  dq: { type: Boolean, default: false },
  dqReason: { type: String, default: '' },
  time: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  saved: { type: Boolean, default: false },
  division: { type: String, enum: ['Custom', 'Stock', 'Optic'], default: null }
});

scoreSchema.pre('save', function (next) {
  const penalties = (this.noShoot + this.miss + this.procedural) * 5;
  this.total = this.time + (this.b * 1) + (this.c * 3) + penalties;
  next();
});

const stageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true },
  cartones: { type: Number, default: 0 },
  metales: { type: Number, default: 0 },
  impactosPuntuables: { type: Number, default: 0 },
  archivoPdf: { type: String, default: null },   // Cloudinary URL
  scores: [scoreSchema]
});

const squadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const registrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoria: { type: String, enum: ['Junior', 'General', 'Senior', 'Super Senior', 'Grand Senior', 'Lady'], required: true },
  division: { type: String, enum: ['Custom', 'Stock', 'Optic'], required: true },
  divisionAlternativa: { type: String, enum: ['Custom', 'Stock', 'Optic', null], default: null },
  isOC: { type: Boolean, default: false },
  dq: { type: Boolean, default: false },
  dqReason: { type: String, default: '' }
});

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  description: { type: String },
  location: { type: String },
  squads: [squadSchema],
  stages: [stageSchema],
  registrations: [registrationSchema],
  isPrivate: { type: Boolean, default: false },
  registrationDeadline: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['upcoming', 'active', 'finished'], default: 'upcoming' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);