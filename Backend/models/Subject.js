    const mongoose = require('mongoose');

    const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Subject name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Subject code is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    semester: {
        type: Number,
        required: [true, 'Semester is required'],
        min: 1,
        max: 8
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    }
    }, {
    timestamps: true
    });

    module.exports = mongoose.model('Subject', subjectSchema);