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
  time: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  saved: { type: Boolean, default: false }
});

scoreSchema.pre('save', function(next) {
  const penalties = (this.noShoot + this.miss + this.procedural) * 5;
  this.total = this.time + (this.b * 1) + (this.c * 3) + penalties;
  next();
});

const stageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true },
  scores: [scoreSchema]
});

const squadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const registrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoria: { type: String, enum: ['Junior', 'General', 'Senior', 'Semi Senior', 'Super Senior', 'Lady'], required: true },
  division: { type: String, enum: ['Custom', 'Stock', 'Optic'], required: true }
});

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  description: { type: String },
  location: { type: String },
  squads: [squadSchema],
  stages: [stageSchema],
  registrations: [registrationSchema],
  registrationDeadline: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['upcoming', 'active', 'finished'], default: 'upcoming' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
