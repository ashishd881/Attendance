import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PromoteStudents = () => {
  const [overview, setOverview] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [promotionDone, setPromotionDone] = useState(null);
  const [activeView, setActiveView] = useState('subject'); // 'subject' or 'student'
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterThreshold, setFilterThreshold] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  // ─── Fetch Overview ─────────────────────────────────
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/promotion/semester-overview');
      setOverview(data);
    } catch (error) {
      toast.error('Failed to fetch semester overview');
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Subject-wise Attendance ─────────────────
  const fetchAttendance = async (semester) => {
    setSelectedSemester(semester);
    setAttendanceLoading(true);
    setAttendanceData(null);
    setPromotionDone(null);
    setFilterSubjectId('');
    setFilterThreshold('');
    try {
      const { data } = await API.get(`/admin/promotion/subject-attendance/${semester}`);
      setAttendanceData(data);
    } catch (error) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ─── Promote Handler ────────────────────────────────
  const handlePromote = async () => {
    if (!selectedSemester) return;
    setPromoting(true);
    try {
      const { data } = await API.post(`/admin/promotion/promote/${selectedSemester}`);
      toast.success(data.message);
      setPromotionDone(data);
      setShowConfirm(false);
      setAttendanceData(null);
      fetchOverview();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  // ─── Filtered Subjects ──────────────────────────────
  const getFilteredSubjects = () => {
    if (!attendanceData) return [];
    let subjects = attendanceData.subjects;

    if (filterSubjectId) {
      subjects = subjects.filter(s => s.subjectId === filterSubjectId);
    }

    if (filterThreshold) {
      subjects = subjects.map(subject => ({
        ...subject,
        students: subject.students.filter(
          s => s.percentage < parseFloat(filterThreshold) && s.totalClasses > 0
        )
      })).filter(s => s.students.length > 0);
    }

    return subjects;
  };

  // ─── Generate PDF ───────────────────────────────────
  const generatePDF = async () => {
    if (!selectedSemester) return;
    setPdfLoading(true);

    try {
      const { data } = await API.get(
        `/admin/promotion/attendance-report/${selectedSemester}`
      );

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // ── COVER PAGE ──────────────────────────────────
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setFillColor(99, 102, 241, 0.3);
      doc.circle(pageWidth - 20, 20, 40, 'F');
      doc.circle(20, pageHeight - 20, 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.text('Attendance Management', pageWidth / 2, 85, { align: 'center' });
      doc.text('System', pageWidth / 2, 100, { align: 'center' });

      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text('Subject-wise Attendance Report', pageWidth / 2, 120, { align: 'center' });

      doc.setFillColor(255, 255, 255, 0.2);
      doc.rect(20, 130, pageWidth - 40, 0.5, 'F');

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`Semester ${data.semester}`, pageWidth / 2, 148, { align: 'center' });

      // Info boxes
      const boxY = 160;
      const boxW = 50;
      const boxH = 20;
      const gap = 8;
      const startX = (pageWidth - (3 * boxW + 2 * gap)) / 2;

      [
        { label: 'Total Students', value: data.totalStudents },
        { label: 'Total Subjects', value: data.totalSubjects },
        { label: 'Generated', value: new Date().toLocaleDateString('en-IN') }
      ].forEach((item, i) => {
        const x = startX + i * (boxW + gap);
        doc.setFillColor(255, 255, 255, 0.15);
        doc.roundedRect(x, boxY, boxW, boxH, 3, 3, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(String(item.value), x + boxW / 2, boxY + 10, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, x + boxW / 2, boxY + 17, { align: 'center' });
      });

      doc.setFontSize(9);
      doc.setTextColor(200, 200, 255);
      doc.text(`Generated on: ${dateStr}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

      // ── SUBJECT-WISE PAGES ──────────────────────────
      data.subjects.forEach((subject, subIdx) => {
        doc.addPage();

        // Subject header bar
        doc.setFillColor(67, 56, 202);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`${subject.name} (${subject.code})`, 10, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(
          `Semester ${data.semester} | Teacher: ${subject.teacher} | Classes: ${subject.totalClassesConducted} | Avg: ${subject.averageAttendance}%`,
          10, 22
        );

        doc.setTextColor(200, 200, 255);
        doc.text(
          `${subject.students.filter(s => s.isShort).length} students with short attendance`,
          pageWidth - 10, 22, { align: 'right' }
        );

        doc.setTextColor(0, 0, 0);

        // Student table for this subject
        autoTable(doc, {
          startY: 34,
          head: [['#', 'Roll No', 'Student Name', 'Email', 'Present', 'Absent', 'Total', 'Percentage', 'Status']],
          body: subject.students.map((s, i) => [
            i + 1,
            s.rollNumber,
            s.name,
            s.email,
            s.presentCount,
            s.absentCount,
            s.totalClasses,
            `${s.percentage}%`,
            s.isShort ? 'SHORT ⚠' : 'OK ✓'
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 7.5,
            cellPadding: 2.5
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 35 },
            3: { cellWidth: 42 },
            4: { cellWidth: 14, halign: 'center' },
            5: { cellWidth: 14, halign: 'center' },
            6: { cellWidth: 12, halign: 'center' },
            7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            8: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }
          },
          didParseCell: (hookData) => {
            if (hookData.section === 'body') {
              const row = hookData.row.index;
              const student = subject.students[row];
              if (!student) return;

              if (hookData.column.index === 8) {
                if (student.isShort) {
                  hookData.cell.styles.textColor = [220, 38, 38];
                  hookData.cell.styles.fontStyle = 'bold';
                } else {
                  hookData.cell.styles.textColor = [22, 163, 74];
                }
              }
              if (hookData.column.index === 7) {
                if (student.isShort) {
                  hookData.cell.styles.textColor = [220, 38, 38];
                  hookData.cell.styles.fontStyle = 'bold';
                }
              }
              if (student.isShort) {
                if ([0, 1, 2, 3, 4, 5, 6].includes(hookData.column.index)) {
                  hookData.cell.styles.fillColor = [255, 245, 245];
                }
              }
            }
          },
          margin: { left: 10, right: 10 }
        });

        // Subject stats summary box
        const finalY = doc.lastAutoTable.finalY + 5;
        if (finalY < pageHeight - 30) {
          doc.setFillColor(243, 244, 246);
          doc.roundedRect(10, finalY, pageWidth - 20, 16, 2, 2, 'F');

          const shortCount = subject.students.filter(s => s.isShort).length;
          const okCount = subject.students.length - shortCount;

          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(50, 50, 50);
          doc.text(`Summary: Total ${subject.students.length} students`, 14, finalY + 7);
          doc.setTextColor(22, 163, 74);
          doc.text(`OK: ${okCount}`, 14, finalY + 13);
          doc.setTextColor(220, 38, 38);
          doc.text(`Short Attendance: ${shortCount}`, 60, finalY + 13);
          doc.setTextColor(50, 50, 50);
          doc.text(`Average: ${subject.averageAttendance}%`, 130, finalY + 13);
          doc.text(`Classes Conducted: ${subject.totalClassesConducted}`, 170, finalY + 13, { align: 'right' });
        }
      });

      // ── STUDENT SUMMARY PAGE ────────────────────────
      doc.addPage();

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Overall Student Summary', pageWidth / 2, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Semester ${data.semester} - All Subjects Combined`, pageWidth / 2, 22, { align: 'center' });

      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 34,
        head: [['#', 'Roll No', 'Student Name', 'Email', 'Total Present', 'Total Classes', 'Overall %', 'Result']],
        body: data.studentSummary.map((s, i) => [
          i + 1,
          s.rollNumber,
          s.name,
          s.email,
          s.totalPresent,
          s.totalClasses,
          `${s.overallPercentage}%`,
          s.overallPercentage >= 75 ? 'GOOD ✓' : s.totalClasses === 0 ? 'N/A' : 'SHORT ⚠'
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2.5
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 22 },
          2: { cellWidth: 38 },
          3: { cellWidth: 45 },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (hookData) => {
          if (hookData.section === 'body') {
            const row = hookData.row.index;
            const student = data.studentSummary[row];
            if (!student) return;
            if (hookData.column.index === 7) {
              if (student.overallPercentage < 75 && student.totalClasses > 0) {
                hookData.cell.styles.textColor = [220, 38, 38];
              } else {
                hookData.cell.styles.textColor = [22, 163, 74];
              }
            }
            if (hookData.column.index === 6) {
              if (student.overallPercentage < 75 && student.totalClasses > 0) {
                hookData.cell.styles.textColor = [220, 38, 38];
                hookData.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        margin: { left: 10, right: 10 }
      });

      // ── SHORT ATTENDANCE SUMMARY PAGE ───────────────
      const shortStudents = data.studentSummary.filter(
        s => s.overallPercentage < 75 && s.totalClasses > 0
      );

      if (shortStudents.length > 0) {
        doc.addPage();

        doc.setFillColor(220, 38, 38);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Short Attendance Alert', pageWidth / 2, 12, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${shortStudents.length} students with overall attendance below 75%`,
          pageWidth / 2, 22, { align: 'center' }
        );

        doc.setTextColor(0, 0, 0);

        autoTable(doc, {
          startY: 34,
          head: [['#', 'Roll No', 'Student Name', 'Email', 'Overall %', 'Subjects Short']],
          body: shortStudents.map((s, i) => [
            i + 1,
            s.rollNumber,
            s.name,
            s.email,
            `${s.overallPercentage}%`,
            s.totalClasses > 0
              ? `${Math.round((1 - s.totalPresent / s.totalClasses) * 100)}% absent`
              : 'N/A'
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: [220, 38, 38],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
            fillColor: [255, 250, 250]
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 40 },
            3: { cellWidth: 50 },
            4: { cellWidth: 20, halign: 'center', textColor: [220, 38, 38], fontStyle: 'bold' },
            5: { cellWidth: 30, halign: 'center' }
          },
          margin: { left: 10, right: 10 }
        });
      }

      // ── FOOTER ON ALL PAGES ─────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${totalPages}  |  Semester ${data.semester} Attendance Report  |  ${dateStr}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      doc.save(`Semester_${selectedSemester}_Complete_Attendance_Report.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Helper Colors ──────────────────────────────────
  const getPercentageBadge = (pct) => {
    if (pct >= 75) return 'bg-green-100 text-green-700';
    if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getBarColor = (pct) => {
    if (pct >= 75) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredSubjects = getFilteredSubjects();

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Promote Students</h1>
        <p className="text-gray-500 mt-1">
          View subject-wise attendance, generate PDF, and promote students to next semester.
        </p>
      </div>

      {/* ── Info Banner ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📋 Promotion Rules:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-700">
          {[1, 2, 3, 4, 5, 6, 7].map(s => (
            <div key={s}>• Sem {s} → Sem {s + 1}</div>
          ))}
          <div className="text-red-600 font-semibold">• Sem 8 → Graduated (Deleted)</div>
        </div>
      </div>

      {/* ── Semester Cards ── */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {overview.map((sem) => (
            <div
              key={sem.semester}
              onClick={() => fetchAttendance(sem.semester)}
              className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedSemester === sem.semester
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-gray-100 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-bold ${
                  sem.semester === 8 ? 'text-red-600' : 'text-indigo-600'
                }`}>
                  Sem {sem.semester}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  sem.semester === 8
                    ? 'bg-red-100 text-red-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {sem.semester === 8 ? '🎓' : '↑'}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{sem.studentCount}</p>
              <p className="text-xs text-gray-500 mt-1">Students</p>
              <p className={`text-xs font-medium mt-2 ${
                sem.semester === 8 ? 'text-red-500' : 'text-indigo-500'
              }`}>
                {sem.action}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Attendance Loading ── */}
      {attendanceLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* ── Attendance Data ── */}
      {attendanceData && !attendanceLoading && (
        <>
          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Semester {attendanceData.semester} — Attendance Overview
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {attendanceData.totalStudents} Students · {attendanceData.totalSubjects} Subjects
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {/* PDF Button */}
                <button
                  onClick={generatePDF}
                  disabled={pdfLoading}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2 shadow-sm"
                >
                  {pdfLoading ? (
                    <><span className="animate-spin">⏳</span><span>Generating PDF...</span></>
                  ) : (
                    <><span>📄</span><span>Download PDF</span></>
                  )}
                </button>

                {/* Promote Button */}
                {attendanceData.totalStudents > 0 && (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-white transition-colors flex items-center space-x-2 shadow-sm ${
                      selectedSemester === 8
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <span>{selectedSemester === 8 ? '🎓' : '⬆️'}</span>
                    <span>
                      {selectedSemester === 8
                        ? 'Graduate & Delete'
                        : `Promote to Sem ${selectedSemester + 1}`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              🔍 Filter Attendance View
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Filter by Subject
                </label>
                <select
                  value={filterSubjectId}
                  onChange={(e) => setFilterSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">All Subjects</option>
                  {attendanceData.subjects.map(s => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Show Students Below % (Short Attendance)
                </label>
                <input
                  type="number"
                  value={filterThreshold}
                  onChange={(e) => setFilterThreshold(e.target.value)}
                  placeholder="e.g., 75 — leave empty for all"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterSubjectId('');
                    setFilterThreshold('');
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
                >
                  ✕ Clear Filters
                </button>
              </div>
            </div>
            {filterThreshold && (
              <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-medium">
                  ⚠️ Showing only students with attendance below {filterThreshold}%
                </p>
              </div>
            )}
          </div>

          {/* View Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 max-w-sm">
            <button
              onClick={() => setActiveView('subject')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeView === 'subject'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📚 Subject-wise
            </button>
            <button
              onClick={() => setActiveView('student')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeView === 'student'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👨‍🎓 Student Summary
            </button>
          </div>

          {/* ════════ SUBJECT-WISE VIEW ════════ */}
          {activeView === 'subject' && (
            <div className="space-y-6">
              {filteredSubjects.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <span className="text-4xl">📭</span>
                  <p className="text-gray-500 mt-4">
                    {filterThreshold
                      ? `No students found below ${filterThreshold}% attendance`
                      : 'No subjects found'}
                  </p>
                </div>
              ) : (
                filteredSubjects.map((subject) => (
                  <div
                    key={subject.subjectId}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* Subject Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-5 text-white">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                          <h3 className="text-lg font-bold">
                            {subject.name}
                            <span className="ml-2 text-sm bg-white/20 px-2 py-0.5 rounded-full">
                              {subject.code}
                            </span>
                          </h3>
                          <p className="text-indigo-200 text-sm mt-1">
                            Teacher: {subject.teacher}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { label: 'Classes', value: subject.totalClassesConducted },
                            { label: 'Students', value: subject.totalStudents },
                            { label: 'Avg %', value: `${subject.averageAttendance}%` },
                            { label: 'Short', value: subject.studentsShort, red: true }
                          ].map((stat, i) => (
                            <div
                              key={i}
                              className={`px-3 py-1.5 rounded-lg text-center ${
                                stat.red ? 'bg-red-500/30' : 'bg-white/10'
                              }`}
                            >
                              <p className="text-xl font-bold">{stat.value}</p>
                              <p className={`text-xs ${stat.red ? 'text-red-200' : 'text-indigo-200'}`}>
                                {stat.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Student Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {['#', 'Roll No', 'Name', 'Email', 'Present', 'Absent', 'Total', 'Attendance', 'Status'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {subject.students.map((student, i) => (
                            <tr
                              key={student.studentId}
                              className={`hover:bg-gray-50 ${student.isShort ? 'bg-red-50' : ''}`}
                            >
                              <td className="px-4 py-3 text-sm text-gray-600">{i + 1}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono font-semibold rounded">
                                  {student.rollNumber}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                {student.name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                              <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">
                                {student.presentCount}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">
                                {student.absentCount}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-gray-600 font-semibold">
                                {student.totalClasses}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col items-center space-y-1">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPercentageBadge(student.percentage)}`}>
                                    {student.percentage}%
                                  </span>
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full ${getBarColor(student.percentage)}`}
                                      style={{ width: `${Math.min(student.percentage, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {student.isShort ? (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                    ⚠️ SHORT
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                    ✓ OK
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ════════ STUDENT SUMMARY VIEW ════════ */}
          {activeView === 'student' && (
            <div className="space-y-4">
              {attendanceData.studentSummary.map((student, index) => (
                <div
                  key={student.studentId}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Student Header */}
                  <div className={`p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                    student.overallPercentage < 75 && student.totalClasses > 0
                      ? 'bg-red-50 border-b border-red-200'
                      : 'bg-gray-50 border-b border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-700 font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{student.name}</p>
                        <p className="text-xs text-gray-500">
                          {student.rollNumber} · {student.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total Present</p>
                        <p className="font-bold text-green-600">{student.totalPresent}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total Classes</p>
                        <p className="font-bold text-gray-800">{student.totalClasses}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full font-bold text-sm ${getPercentageBadge(student.overallPercentage)}`}>
                        Overall: {student.overallPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Subject Breakdown */}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                      Subject-wise Breakdown
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {student.subjectBreakdown.map((sub, i) => (
                        <div
                          key={i}
                          className={`rounded-lg p-3 border ${
                            sub.isShort
                              ? 'bg-red-50 border-red-200'
                              : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{sub.subjectName}</p>
                              <p className="text-xs text-gray-500">{sub.subjectCode}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getPercentageBadge(sub.percentage)}`}>
                              {sub.totalClasses > 0 ? `${sub.percentage}%` : 'N/A'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div
                              className={`h-1.5 rounded-full ${getBarColor(sub.percentage)}`}
                              style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span className="text-green-600 font-semibold">P: {sub.presentCount}</span>
                            <span className="text-red-600 font-semibold">A: {sub.absentCount}</span>
                            <span className="font-semibold">T: {sub.totalClasses}</span>
                          </div>
                          {sub.isShort && (
                            <p className="text-xs text-red-600 font-semibold mt-1">
                              ⚠️ Short Attendance
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Success Banner ── */}
      {promotionDone && (
        <div className={`rounded-xl p-6 ${
          promotionDone.deleted > 0 && promotionDone.promoted === 0
            ? 'bg-red-50 border border-red-200'
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center space-x-3">
            <span className="text-3xl">
              {promotionDone.deleted > 0 && promotionDone.promoted === 0 ? '🎓' : '✅'}
            </span>
            <div>
              <h3 className="font-bold text-lg text-gray-800">
                {promotionDone.deleted > 0 ? 'Students Graduated!' : 'Promotion Successful!'}
              </h3>
              <p className="text-sm text-gray-600">{promotionDone.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {showConfirm && attendanceData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <span className="text-5xl">
                {selectedSemester === 8 ? '🎓' : '⬆️'}
              </span>
              <h2 className="text-xl font-bold text-gray-800 mt-3">
                {selectedSemester === 8 ? 'Confirm Graduation' : 'Confirm Promotion'}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                {selectedSemester === 8
                  ? `This will permanently DELETE all ${attendanceData.totalStudents} students from Semester 8.`
                  : `This will promote all ${attendanceData.totalStudents} students from Semester ${selectedSemester} to Semester ${selectedSemester + 1}.`}
              </p>
              {selectedSemester === 8 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm font-semibold">
                    ⚠️ This action CANNOT be undone!
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
              <p className="text-sm text-gray-600">
                <strong>{attendanceData.totalStudents}</strong> students will be affected
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={promoting}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${
                  selectedSemester === 8
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {promoting
                  ? 'Processing...'
                  : selectedSemester === 8
                    ? '🎓 Graduate & Delete'
                    : `✅ Promote to Sem ${selectedSemester + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoteStudents;