const User = require('../models/User');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

// @desc    Add a student
// @route   POST /api/teacher/students
const addStudent = async (req, res) => {
  try {
    const { name, rollNumber, email, semester, password } = req.body;

    // Check if student already exists
    const studentExists = await Student.findOne({ 
      $or: [{ rollNumber }, { email }] 
    });
    if (studentExists) {
      return res.status(400).json({ message: 'Student with this roll number or email already exists' });
    }

    // Create user account for student
    const userExists = await User.findOne({ 
      $or: [{ email }, { rollNumber }] 
    });
    if (userExists) {
      return res.status(400).json({ message: 'User account already exists' });
    }

    const user = await User.create({
      name,
      email,
      password: password || rollNumber, // Default password is roll number
      role: 'student',
      rollNumber,
      semester
    });

    // Create student record
    const student = await Student.create({
      name,
      rollNumber,
      email,
      semester,
      user: user._id
    });

    res.status(201).json({
      student,
      message: 'Student added successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove a student
// @route   DELETE /api/teacher/students/:id
const removeStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove user account
    if (student.user) {
      await User.findByIdAndDelete(student.user);
    }

    await Student.findByIdAndDelete(req.params.id);

    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get students by semester
// @route   GET /api/teacher/students/:semester
const getStudentsBySemester = async (req, res) => {
  try {
    const { semester } = req.params;
    const students = await Student.find({ 
      semester: parseInt(semester), 
      isActive: true 
    }).sort({ rollNumber: 1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get teacher's assigned subjects
// @route   GET /api/teacher/my-subjects
const getMySubjects = async (req, res) => {
  try {
    const teacher = await User.findById(req.user._id)
      .populate('subjects.subject');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Also get subjects directly assigned
    const subjects = await Subject.find({ teacher: req.user._id });

    // Combine and deduplicate
    const allSubjects = [...subjects];
    
    res.json(allSubjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update student details
// @route   PUT /api/teacher/students/:id
const updateStudent = async (req, res) => {
  try {
    const { name, rollNumber, email, semester } = req.body;
    
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.name = name || student.name;
    student.rollNumber = rollNumber || student.rollNumber;
    student.email = email || student.email;
    student.semester = semester || student.semester;

    await student.save();

    // Update user record too
    if (student.user) {
      await User.findByIdAndUpdate(student.user, {
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        semester: student.semester
      });
    }

    res.json({ student, message: 'Student updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addStudent,
  removeStudent,
  getStudentsBySemester,
  getMySubjects,
  updateStudent
};