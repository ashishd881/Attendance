const User = require('../models/User');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const { sendShortAttendanceEmail } = require('../utils/emailService');

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

    const alreadyAssigned = teacher.subjects.some(
      s => s.subject.toString() === subjectId && s.semester === semester
    );

    if (alreadyAssigned) {
      return res.status(400).json({ message: 'Subject already assigned to this teacher' });
    }

    teacher.subjects.push({ subject: subjectId, semester });
    await teacher.save();

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

// @desc    Get SUBJECT-WISE attendance report
// @route   GET /api/admin/attendance-report
const getAttendanceReport = async (req, res) => {
  try {
    const { semester, subjectId, belowPercentage } = req.query;

    // Build subject query
    let subjectQuery = {};
    if (semester) subjectQuery.semester = parseInt(semester);
    if (subjectId) subjectQuery._id = subjectId;

    const subjects = await Subject.find(subjectQuery).populate('teacher', 'name email');

    const report = [];

    for (const subject of subjects) {
      // Get all students for this semester
      const students = await Student.find({
        semester: subject.semester,
        isActive: true
      }).sort({ rollNumber: 1 });

      // Get all attendance records for this subject
      const attendanceRecords = await Attendance.find({
        subject: subject._id,
        semester: subject.semester
      }).sort({ date: 1 });

      const totalClassesConducted = attendanceRecords.length;

      // Calculate each student's attendance for this subject
      const studentData = students.map(student => {
        let presentCount = 0;
        let absentCount = 0;
        const dateRecords = [];

        attendanceRecords.forEach(record => {
          const studentRecord = record.records.find(
            r => r.student.toString() === student._id.toString()
          );
          if (studentRecord) {
            if (studentRecord.status === 'present') presentCount++;
            else absentCount++;

            dateRecords.push({
              date: record.date,
              status: studentRecord.status
            });
          }
        });

        const percentage = totalClassesConducted > 0
          ? parseFloat(((presentCount / totalClassesConducted) * 100).toFixed(1))
          : 0;

        return {
          studentId: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          email: student.email,
          totalClasses: totalClassesConducted,
          presentCount,
          absentCount,
          percentage,
          isShort: totalClassesConducted > 0 && percentage < 75,
          dateRecords
        };
      });

      // Filter by belowPercentage if specified
      let filteredStudents = studentData;
      if (belowPercentage) {
        filteredStudents = studentData.filter(
          s => s.percentage < parseFloat(belowPercentage) && s.totalClasses > 0
        );
      }

      // Only add subject to report if it has students matching criteria
      if (!belowPercentage || filteredStudents.length > 0) {
        report.push({
          subject: {
            _id: subject._id,
            name: subject.name,
            code: subject.code,
            semester: subject.semester,
            teacher: subject.teacher ? subject.teacher.name : 'Not Assigned'
          },
          totalClassesConducted,
          totalStudents: students.length,
          studentsPresent: studentData.filter(s => !s.isShort).length,
          studentsShort: studentData.filter(s => s.isShort).length,
          averageAttendance: studentData.length > 0
            ? parseFloat(
                (studentData.reduce((sum, s) => sum + s.percentage, 0) / studentData.length).toFixed(1)
              )
            : 0,
          students: belowPercentage ? filteredStudents : studentData
        });
      }
    }

    // Sort by semester then by subject name
    report.sort((a, b) => {
      if (a.subject.semester !== b.subject.semester) {
        return a.subject.semester - b.subject.semester;
      }
      return a.subject.name.localeCompare(b.subject.name);
    });

    res.json({
      filters: {
        semester: semester || 'All',
        subjectId: subjectId || 'All',
        belowPercentage: belowPercentage || 'None'
      },
      totalSubjects: report.length,
      generatedAt: new Date().toISOString(),
      report
    });
  } catch (error) {
    console.error('getAttendanceReport error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get short attendance students SUBJECT-WISE
// @route   GET /api/admin/short-attendance
const getShortAttendance = async (req, res) => {
  try {
    const { semester, subjectId, threshold } = req.query;
    const thresholdValue = parseFloat(threshold) || 75;

    let subjectQuery = {};
    if (semester) subjectQuery.semester = parseInt(semester);
    if (subjectId) subjectQuery._id = subjectId;

    const subjects = await Subject.find(subjectQuery).populate('teacher', 'name email');

    const shortAttendanceReport = [];

    for (const subject of subjects) {
      const students = await Student.find({
        semester: subject.semester,
        isActive: true
      }).sort({ rollNumber: 1 });

      const attendanceRecords = await Attendance.find({
        subject: subject._id,
        semester: subject.semester
      }).sort({ date: 1 });

      const totalClassesConducted = attendanceRecords.length;

      if (totalClassesConducted === 0) continue;

      const shortStudents = [];

      students.forEach(student => {
        let presentCount = 0;

        attendanceRecords.forEach(record => {
          const studentRecord = record.records.find(
            r => r.student.toString() === student._id.toString()
          );
          if (studentRecord && studentRecord.status === 'present') {
            presentCount++;
          }
        });

        const percentage = parseFloat(
          ((presentCount / totalClassesConducted) * 100).toFixed(1)
        );

        if (percentage < thresholdValue) {
          shortStudents.push({
            name: student.name,
            rollNumber: student.rollNumber,
            email: student.email,
            totalClasses: totalClassesConducted,
            presentCount,
            absentCount: totalClassesConducted - presentCount,
            percentage,
            classesNeeded: Math.ceil(
              ((thresholdValue / 100) * totalClassesConducted - presentCount) /
              (1 - thresholdValue / 100)
            )
          });
        }
      });

      if (shortStudents.length > 0) {
        shortAttendanceReport.push({
          subject: {
            name: subject.name,
            code: subject.code,
            semester: subject.semester,
            teacher: subject.teacher ? subject.teacher.name : 'Not Assigned'
          },
          totalClassesConducted,
          totalStudentsInClass: students.length,
          shortAttendanceCount: shortStudents.length,
          threshold: thresholdValue,
          students: shortStudents.sort((a, b) => a.percentage - b.percentage)
        });
      }
    }

    res.json({
      threshold: thresholdValue,
      generatedAt: new Date().toISOString(),
      totalSubjectsAffected: shortAttendanceReport.length,
      report: shortAttendanceReport
    });
  } catch (error) {
    console.error('getShortAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Send short attendance emails
// @route   POST /api/admin/send-short-attendance-email
const sendShortAttendanceEmails = async (req, res) => {
  try {
    const { students } = req.body;

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
  getShortAttendance,
  sendShortAttendanceEmails,
  deleteTeacher,
  deleteSubject
};