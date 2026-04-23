const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');

// @desc    Get semester overview
// @route   GET /api/admin/promotion/semester-overview
const getSemesterOverview = async (req, res) => {
  try {
    const overview = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7, 8].map(async (sem) => {
        const count = await Student.countDocuments({
          semester: sem,
          isActive: true
        });
        return {
          semester: sem,
          studentCount: count,
          action: sem === 8 ? 'Delete (Graduate)' : `Promote to Sem ${sem + 1}`
        };
      })
    );
    res.json(overview);
  } catch (error) {
    console.error('getSemesterOverview error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get subject-wise attendance for a semester
// @route   GET /api/admin/promotion/subject-attendance/:semester
const getSubjectWiseAttendance = async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterNum = parseInt(semester);

    // Get all subjects for this semester
    const subjects = await Subject.find({ semester: semesterNum })
      .populate('teacher', 'name email');

    // Get all students for this semester
    const students = await Student.find({
      semester: semesterNum,
      isActive: true
    }).sort({ rollNumber: 1 });

    if (students.length === 0) {
      return res.json({
        semester: semesterNum,
        totalStudents: 0,
        totalSubjects: subjects.length,
        subjects: [],
        studentSummary: []
      });
    }

    // Build subject-wise data
    const subjectWiseData = await Promise.all(
      subjects.map(async (subject) => {
        // Get all attendance records for this subject in this semester
        const attendanceRecords = await Attendance.find({
          subject: subject._id,
          semester: semesterNum
        }).sort({ date: 1 });

        const totalClassesConducted = attendanceRecords.length;

        // Calculate each student's attendance for this subject
        const studentAttendance = students.map(student => {
          let presentCount = 0;
          let absentCount = 0;
          const dateWiseRecords = [];

          attendanceRecords.forEach(record => {
            const studentRecord = record.records.find(
              r => r.student.toString() === student._id.toString()
            );
            if (studentRecord) {
              if (studentRecord.status === 'present') presentCount++;
              else absentCount++;
              dateWiseRecords.push({
                date: record.date,
                status: studentRecord.status
              });
            } else {
              // Student was not in attendance record
              absentCount++;
              dateWiseRecords.push({
                date: record.date,
                status: 'absent'
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
            presentCount,
            absentCount,
            totalClasses: totalClassesConducted,
            percentage,
            isShort: totalClassesConducted > 0 && percentage < 75,
            dateWiseRecords
          };
        });

        // Subject stats
        const avgAttendance = studentAttendance.length > 0
          ? parseFloat(
              (studentAttendance.reduce((sum, s) => sum + s.percentage, 0) / studentAttendance.length).toFixed(1)
            )
          : 0;

        return {
          subjectId: subject._id,
          name: subject.name,
          code: subject.code,
          semester: semesterNum,
          teacher: subject.teacher ? subject.teacher.name : 'Not Assigned',
          totalClassesConducted,
          totalStudents: students.length,
          studentsShort: studentAttendance.filter(s => s.isShort).length,
          averageAttendance: avgAttendance,
          students: studentAttendance
        };
      })
    );

    // Build student summary (overall across all subjects)
    const studentSummary = students.map(student => {
      let totalPresent = 0;
      let totalClasses = 0;
      const subjectBreakdown = [];

      subjectWiseData.forEach(subject => {
        const sData = subject.students.find(
          s => s.studentId.toString() === student._id.toString()
        );
        if (sData) {
          totalPresent += sData.presentCount;
          totalClasses += sData.totalClasses;
          subjectBreakdown.push({
            subjectName: subject.name,
            subjectCode: subject.code,
            presentCount: sData.presentCount,
            absentCount: sData.absentCount,
            totalClasses: sData.totalClasses,
            percentage: sData.percentage,
            isShort: sData.isShort
          });
        }
      });

      const overallPercentage = totalClasses > 0
        ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1))
        : 0;

      return {
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        semester: semesterNum,
        totalPresent,
        totalClasses,
        overallPercentage,
        shortSubjects: subjectBreakdown.filter(s => s.isShort),
        subjectBreakdown
      };
    });

    res.json({
      semester: semesterNum,
      totalStudents: students.length,
      totalSubjects: subjects.length,
      generatedAt: new Date().toISOString(),
      subjects: subjectWiseData,
      studentSummary
    });
  } catch (error) {
    console.error('getSubjectWiseAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get promotion preview
// @route   GET /api/admin/promotion/preview/:semester
const getPromotionPreview = async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterNum = parseInt(semester);

    const students = await Student.find({
      semester: semesterNum,
      isActive: true
    }).sort({ rollNumber: 1 });

    res.json({
      semester: semesterNum,
      totalStudents: students.length,
      action: semesterNum === 8
        ? 'Students will be DELETED (graduated)'
        : `Students will be promoted from Sem ${semesterNum} to Sem ${semesterNum + 1}`,
      students: students.map(s => ({
        _id: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        email: s.email
      }))
    });
  } catch (error) {
    console.error('getPromotionPreview error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Promote students
// @route   POST /api/admin/promotion/promote/:semester
const promoteStudents = async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterNum = parseInt(semester);

    const students = await Student.find({
      semester: semesterNum,
      isActive: true
    });

    if (students.length === 0) {
      return res.status(400).json({
        message: `No students found in Semester ${semesterNum}`
      });
    }

    const studentIds = students.map(s => s._id);
    const userIds = students.map(s => s.user).filter(Boolean);

    if (semesterNum === 8) {
      // Graduate - delete data
      await Student.deleteMany({ semester: semesterNum });
      await User.deleteMany({ _id: { $in: userIds } });

      return res.json({
        message: `${students.length} students from Semester 8 have graduated and been removed.`,
        promoted: 0,
        deleted: students.length,
        semester: 8
      });
    } else {
      const nextSemester = semesterNum + 1;

      await Student.updateMany(
        { semester: semesterNum, isActive: true },
        { $set: { semester: nextSemester } }
      );

      await User.updateMany(
        { _id: { $in: userIds }, role: 'student' },
        { $set: { semester: nextSemester } }
      );

      return res.json({
        message: `${students.length} students promoted from Semester ${semesterNum} to Semester ${nextSemester}.`,
        promoted: students.length,
        deleted: 0,
        fromSemester: semesterNum,
        toSemester: nextSemester
      });
    }
  } catch (error) {
    console.error('promoteStudents error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get attendance report for a semester (for PDF)
// @route   GET /api/admin/promotion/attendance-report/:semester
const getAttendanceReportForPDF = async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterNum = parseInt(semester);

    const subjects = await Subject.find({ semester: semesterNum })
      .populate('teacher', 'name');

    const students = await Student.find({
      semester: semesterNum,
      isActive: true
    }).sort({ rollNumber: 1 });

    const subjectWiseData = await Promise.all(
      subjects.map(async (subject) => {
        const attendanceRecords = await Attendance.find({
          subject: subject._id,
          semester: semesterNum
        }).sort({ date: 1 });

        const totalClassesConducted = attendanceRecords.length;

        const studentAttendance = students.map(student => {
          let presentCount = 0;
          let absentCount = 0;

          attendanceRecords.forEach(record => {
            const studentRecord = record.records.find(
              r => r.student.toString() === student._id.toString()
            );
            if (studentRecord) {
              if (studentRecord.status === 'present') presentCount++;
              else absentCount++;
            }
          });

          const percentage = totalClassesConducted > 0
            ? parseFloat(((presentCount / totalClassesConducted) * 100).toFixed(1))
            : 0;

          return {
            name: student.name,
            rollNumber: student.rollNumber,
            email: student.email,
            presentCount,
            absentCount,
            totalClasses: totalClassesConducted,
            percentage,
            isShort: totalClassesConducted > 0 && percentage < 75
          };
        });

        return {
          name: subject.name,
          code: subject.code,
          teacher: subject.teacher ? subject.teacher.name : 'Not Assigned',
          totalClassesConducted,
          averageAttendance: studentAttendance.length > 0
            ? parseFloat(
                (studentAttendance.reduce((sum, s) => sum + s.percentage, 0) / studentAttendance.length).toFixed(1)
              )
            : 0,
          students: studentAttendance
        };
      })
    );

    const studentSummary = students.map(student => {
      let totalPresent = 0;
      let totalClasses = 0;

      subjectWiseData.forEach(sub => {
        const sData = sub.students.find(s => s.rollNumber === student.rollNumber);
        if (sData) {
          totalPresent += sData.presentCount;
          totalClasses += sData.totalClasses;
        }
      });

      return {
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        totalPresent,
        totalClasses,
        overallPercentage: totalClasses > 0
          ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1))
          : 0
      };
    });

    res.json({
      semester: semesterNum,
      generatedAt: new Date().toISOString(),
      totalStudents: students.length,
      totalSubjects: subjects.length,
      subjects: subjectWiseData,
      studentSummary
    });
  } catch (error) {
    console.error('getAttendanceReportForPDF error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getSemesterOverview,
  getSubjectWiseAttendance,
  getPromotionPreview,
  promoteStudents,
  getAttendanceReportForPDF
};