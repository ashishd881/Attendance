const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');

// @desc    Mark attendance (checkbox-based)
// @route   POST /api/attendance/mark
const markAttendance = async (req, res) => {
  try {
    const { subjectId, semester, date, records } = req.body;

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      subject: subjectId,
      semester: parseInt(semester),
      date: attendanceDate
    });

    if (attendance) {
      attendance.records = records.map(r => ({
        student: r.studentId,
        status: r.status
      }));
      attendance.markedBy = req.user._id;
      await attendance.save();

      return res.json({
        attendance,
        message: 'Attendance updated successfully'
      });
    }

    attendance = await Attendance.create({
      subject: subjectId,
      semester: parseInt(semester),
      date: attendanceDate,
      markedBy: req.user._id,
      records: records.map(r => ({
        student: r.studentId,
        status: r.status
      }))
    });

    res.status(201).json({
      attendance,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Attendance already marked for this subject on this date'
      });
    }
    console.error('markAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Edit attendance
// @route   PUT /api/attendance/edit/:id
const editAttendance = async (req, res) => {
  try {
    const { records } = req.body;

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    attendance.records = records.map(r => ({
      student: r.studentId,
      status: r.status
    }));
    attendance.markedBy = req.user._id;

    await attendance.save();

    res.json({
      attendance,
      message: 'Attendance edited successfully'
    });
  } catch (error) {
    console.error('editAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get attendance for a subject on a date
// @route   GET /api/attendance/subject/:subjectId
const getAttendanceBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { date, semester } = req.query;

    let query = { subject: subjectId };
    if (semester) query.semester = parseInt(semester);

    if (date) {
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(attendanceDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: attendanceDate, $lt: nextDay };
    }

    const attendance = await Attendance.find(query)
      .populate('subject', 'name code')
      .populate('records.student', 'name rollNumber email')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    console.error('getAttendanceBySubject error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student's own attendance
// @route   GET /api/attendance/student/my-attendance
const getMyAttendance = async (req, res) => {
  try {
    const { subjectId, startDate, endDate } = req.query;

    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    const subjects = await Subject.find({ semester: student.semester });

    let results = [];

    for (const subject of subjects) {
      let query = {
        subject: subject._id,
        semester: student.semester
      };

      if (subjectId) {
        query.subject = subjectId;
      }

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const attendanceRecords = await Attendance.find(query)
        .populate('subject', 'name code')
        .sort({ date: -1 });

      let totalClasses = 0;
      let presentCount = 0;
      let dateWiseRecords = [];

      attendanceRecords.forEach(record => {
        const studentRecord = record.records.find(
          r => r.student.toString() === student._id.toString()
        );

        if (studentRecord) {
          totalClasses++;
          if (studentRecord.status === 'present') presentCount++;

          dateWiseRecords.push({
            date: record.date,
            status: studentRecord.status
          });
        }
      });

      if (!subjectId || subject._id.toString() === subjectId) {
        results.push({
          subject: {
            _id: subject._id,
            name: subject.name,
            code: subject.code
          },
          totalClasses,
          presentCount,
          absentCount: totalClasses - presentCount,
          percentage: totalClasses > 0
            ? ((presentCount / totalClasses) * 100).toFixed(1)
            : 0,
          records: dateWiseRecords
        });
      }
    }

    res.json({
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        semester: student.semester
      },
      attendance: results
    });
  } catch (error) {
    console.error('getMyAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get attendance history for teacher
// @route   GET /api/attendance/history
const getAttendanceHistory = async (req, res) => {
  try {
    const { subjectId, semester, startDate, endDate } = req.query;

    let query = { markedBy: req.user._id };
    if (subjectId) query.subject = subjectId;
    if (semester) query.semester = parseInt(semester);
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('subject', 'name code')
      .populate('records.student', 'name rollNumber')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    console.error('getAttendanceHistory error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  markAttendance,
  editAttendance,
  getAttendanceBySubject,
  getMyAttendance,
  getAttendanceHistory
};