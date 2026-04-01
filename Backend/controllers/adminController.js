const User = require('../models/User');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const { sendShortAttendanceEmail } = require('../utils/emailService');
const mongoose = require('mongoose');

// @desc    Register a teacher
// @route   POST /api/admin/register-teacher
const registerTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const teacher = await User.create({
      name,
      email,
      password,
      role: 'teacher'
    });

    res.status(201).json({
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      message: 'Teacher registered successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all teachers
// @route   GET /api/admin/teachers
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-password')
      .populate('subjects.subject');
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a subject
// @route   POST /api/admin/subjects
const addSubject = async (req, res) => {
  try {
    const { name, code, semester, teacherId } = req.body;

    const subjectExists = await Subject.findOne({ code });
    if (subjectExists) {
      return res.status(400).json({ message: 'Subject with this code already exists' });
    }

    const subject = await Subject.create({
      name,
      code,
      semester,
      teacher: teacherId || null
    });

    // If teacher assigned, add subject to teacher's subjects array
    if (teacherId) {
      await User.findByIdAndUpdate(teacherId, {
        $push: {
          subjects: {
            subject: subject._id,
            semester: semester
          }
        }
      });
    }

    res.status(201).json({
      subject,
      message: 'Subject added successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Assign subject to teacher
// @route   PUT /api/admin/assign-subject
const assignSubjectToTeacher = async (req, res) => {
  try {
    const { teacherId, subjectId, semester } = req.body;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if already assigned
    const alreadyAssigned = teacher.subjects.some(
      s => s.subject.toString() === subjectId && s.semester === semester
    );

    if (alreadyAssigned) {
      return res.status(400).json({ message: 'Subject already assigned to this teacher for this semester' });
    }

    // Update teacher
    teacher.subjects.push({ subject: subjectId, semester });
    await teacher.save();

    // Update subject
    subject.teacher = teacherId;
    await subject.save();

    res.json({ message: 'Subject assigned to teacher successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all subjects
// @route   GET /api/admin/subjects
const getAllSubjects = async (req, res) => {
  try {
    const { semester } = req.query;
    let query = {};
    if (semester) query.semester = semester;

    const subjects = await Subject.find(query).populate('teacher', 'name email');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all students
// @route   GET /api/admin/students
const getAllStudents = async (req, res) => {
  try {
    const { semester } = req.query;
    let query = {};
    if (semester) query.semester = semester;

    const students = await Student.find(query).populate('user', 'name email rollNumber');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get attendance report for all students
// @route   GET /api/admin/attendance-report
const getAttendanceReport = async (req, res) => {
  try {
    const { semester, subjectId, belowPercentage } = req.query;
    console.log("erroe in report")
    let matchQuery = {};
    if (semester) matchQuery.semester = parseInt(semester);
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      matchQuery.subject = subjectId;
    }
    console.log("erroe in report")
    const attendanceRecords = await Attendance.find(matchQuery)
      .populate('subject', 'name code')
      .populate('records.student', 'name rollNumber email semester')
      .populate('markedBy', 'name')
      .sort({ date: -1 });
      console.log("Ashish")
    // Calculate percentage per student per subject
    const studentStats = {};

    attendanceRecords.forEach(record => {
      record.records.forEach(r => {
        if (!r.student) return;
        
        const key = `${r.student._id}-${record.subject._id}`;
        if (!studentStats[key]) {
          studentStats[key] = {
            student: r.student,
            subject: record.subject,
            totalClasses: 0,
            presentCount: 0,
            absentCount: 0
          };
        }
        studentStats[key].totalClasses += 1;
        if (r.status === 'present') {
          studentStats[key].presentCount += 1;
        } else {
          studentStats[key].absentCount += 1;
        }
      });
    });

    let report = Object.values(studentStats).map(stat => ({
      ...stat,
      percentage: stat.totalClasses > 0 
        ? ((stat.presentCount / stat.totalClasses) * 100) 
        : 0
    }));

    // Filter by percentage if specified
    if (belowPercentage) {
      report = report.filter(r => r.percentage < parseFloat(belowPercentage));
    }

    // Sort by percentage ascending
    report.sort((a, b) => a.percentage - b.percentage);

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
    console.log(error)
  }
};

// @desc    Send short attendance emails
// @route   POST /api/admin/send-short-attendance-email
const sendShortAttendanceEmails = async (req, res) => {
  try {
    const { students } = req.body; // Array of { email, name, subject, percentage }

    let successCount = 0;
    let failCount = 0;

    for (const student of students) {
      const result = await sendShortAttendanceEmail(
        student.email,
        student.name,
        student.subject,
        student.percentage
      );
      if (result) successCount++;
      else failCount++;
    }

    res.json({
      message: `Emails sent: ${successCount} successful, ${failCount} failed`,
      successCount,
      failCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete teacher
// @route   DELETE /api/admin/teachers/:id
const deleteTeacher = async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    // Remove teacher from subjects
    await Subject.updateMany({ teacher: req.params.id }, { teacher: null });

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete subject
// @route   DELETE /api/admin/subjects/:id
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Remove subject from teachers' subjects arrays
    await User.updateMany(
      { 'subjects.subject': req.params.id },
      { $pull: { subjects: { subject: req.params.id } } }
    );

    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  registerTeacher,
  getAllTeachers,
  addSubject,
  assignSubjectToTeacher,
  getAllSubjects,
  getAllStudents,
  getAttendanceReport,
  sendShortAttendanceEmails,
  deleteTeacher,
  deleteSubject
};