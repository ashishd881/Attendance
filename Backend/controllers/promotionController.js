const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');

// @desc    Get promotion preview - shows what will happen
// @route   GET /api/admin/promotion/preview/:semester
const getPromotionPreview = async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterNum = parseInt(semester);

    if (semesterNum < 1 || semesterNum > 8) {
      return res.status(400).json({ message: 'Invalid semester number' });
    }

    // Get students of this semester
    const students = await Student.find({
      semester: semesterNum,
      isActive: true
    }).sort({ rollNumber: 1 });

    // Get attendance stats for each student
    const studentStats = await Promise.all(
      students.map(async (student) => {
        // Get all subjects for this semester
        const subjects = await Subject.find({ semester: semesterNum });

        const subjectStats = await Promise.all(
          subjects.map(async (subject) => {
            const attendanceRecords = await Attendance.find({
              subject: subject._id,
              semester: semesterNum
            });

            let totalClasses = 0;
            let presentCount = 0;

            attendanceRecords.forEach(record => {
              const studentRecord = record.records.find(
                r => r.student.toString() === student._id.toString()
              );
              if (studentRecord) {
                totalClasses++;
                if (studentRecord.status === 'present') presentCount++;
              }
            });

            return {
              subjectName: subject.name,
              subjectCode: subject.code,
              totalClasses,
              presentCount,
              absentCount: totalClasses - presentCount,
              percentage: totalClasses > 0
                ? parseFloat(((presentCount / totalClasses) * 100).toFixed(1))
                : 0
            };
          })
        );

        // Overall percentage
        const totalClasses = subjectStats.reduce((sum, s) => sum + s.totalClasses, 0);
        const totalPresent = subjectStats.reduce((sum, s) => sum + s.presentCount, 0);
        const overallPercentage = totalClasses > 0
          ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1))
          : 0;

        return {
          _id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          email: student.email,
          currentSemester: semesterNum,
          nextSemester: semesterNum < 8 ? semesterNum + 1 : null,
          willBeDeleted: semesterNum === 8,
          subjectStats,
          overallPercentage,
          shortAttendanceSubjects: subjectStats.filter(s => s.percentage < 75 && s.totalClasses > 0)
        };
      })
    );

    res.json({
      semester: semesterNum,
      totalStudents: students.length,
      action: semesterNum === 8
        ? 'Students will be DELETED (graduated)'
        : `Students will be promoted from Sem ${semesterNum} to Sem ${semesterNum + 1}`,
      students: studentStats
    });
  } catch (error) {
    console.error('getPromotionPreview error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Promote students of a semester
// @route   POST /api/admin/promotion/promote/:semester
const promoteStudents = async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterNum = parseInt(semester);

    if (semesterNum < 1 || semesterNum > 8) {
      return res.status(400).json({ message: 'Invalid semester number' });
    }

    // Get all students of this semester
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
      // 8th semester students GRADUATE - DELETE their data
      
      // Delete attendance records for these students
      await Attendance.updateMany(
        { semester: semesterNum },
        { $pull: { records: { student: { $in: studentIds } } } }
      );

      // Delete student records
      await Student.deleteMany({ semester: semesterNum });

      // Delete user accounts
      await User.deleteMany({ _id: { $in: userIds } });

      return res.json({
        message: `${students.length} students from Semester 8 have graduated and been removed from the system.`,
        promoted: 0,
        deleted: students.length,
        semester: 8
      });

    } else {
      // Promote students to next semester
      const nextSemester = semesterNum + 1;

      // Update Student records
      await Student.updateMany(
        { semester: semesterNum, isActive: true },
        { $set: { semester: nextSemester } }
      );

      // Update User records
      await User.updateMany(
        { _id: { $in: userIds }, role: 'student' },
        { $set: { semester: nextSemester } }
      );

      // Delete old attendance records for these students from old semester
      // (Keep for archive - just update student semester)
      // Attendance records stay but students are now in new semester

      return res.json({
        message: `${students.length} students successfully promoted from Semester ${semesterNum} to Semester ${nextSemester}.`,
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

// @desc    Get attendance report for PDF generation
// @route   GET /api/admin/promotion/attendance-report/:semester
const getAttendanceReportForPDF = async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterNum = parseInt(semester);

    const students = await Student.find({
      semester: semesterNum,
      isActive: true
    }).sort({ rollNumber: 1 });

    const subjects = await Subject.find({ semester: semesterNum });

    const reportData = await Promise.all(
      students.map(async (student) => {
        const subjectStats = await Promise.all(
          subjects.map(async (subject) => {
            const attendanceRecords = await Attendance.find({
              subject: subject._id,
              semester: semesterNum
            });

            let totalClasses = 0;
            let presentCount = 0;

            attendanceRecords.forEach(record => {
              const studentRecord = record.records.find(
                r => r.student.toString() === student._id.toString()
              );
              if (studentRecord) {
                totalClasses++;
                if (studentRecord.status === 'present') presentCount++;
              }
            });

            return {
              subjectName: subject.name,
              subjectCode: subject.code,
              totalClasses,
              presentCount,
              absentCount: totalClasses - presentCount,
              percentage: totalClasses > 0
                ? parseFloat(((presentCount / totalClasses) * 100).toFixed(1))
                : 0
            };
          })
        );

        const totalClasses = subjectStats.reduce((sum, s) => sum + s.totalClasses, 0);
        const totalPresent = subjectStats.reduce((sum, s) => sum + s.presentCount, 0);

        return {
          name: student.name,
          rollNumber: student.rollNumber,
          email: student.email,
          semester: semesterNum,
          subjectStats,
          overallPercentage: totalClasses > 0
            ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1))
            : 0,
          shortAttendanceSubjects: subjectStats.filter(
            s => s.percentage < 75 && s.totalClasses > 0
          )
        };
      })
    );

    res.json({
      semester: semesterNum,
      generatedAt: new Date().toISOString(),
      totalStudents: students.length,
      students: reportData
    });
  } catch (error) {
    console.error('getAttendanceReportForPDF error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all semesters with student count
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

module.exports = {
  getPromotionPreview,
  promoteStudents,
  getAttendanceReportForPDF,
  getSemesterOverview
};