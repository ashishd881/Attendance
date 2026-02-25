const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'absent'
  }
});

const attendanceSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: 1,
    max: 8
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  records: [attendanceRecordSchema]
}, {
  timestamps: true
});

// Compound index to prevent duplicate attendance for same subject on same date
attendanceSchema.index({ subject: 1, date: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);