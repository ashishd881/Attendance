import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AttendanceReport = () => {
  const [report, setReport] = useState(null);
  const [shortReport, setShortReport] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shortLoading, setShortLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('full'); // 'full' or 'short'
  const [pdfLoading, setPdfLoading] = useState(false);

  const [filters, setFilters] = useState({
    semester: '',
    subjectId: '',
    belowPercentage: ''
  });

  const [shortFilters, setShortFilters] = useState({
    semester: '',
    subjectId: '',
    threshold: '75'
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await API.get('/admin/subjects');
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects');
    }
  };

  // ─── Fetch Full Report (Subject-wise) ─────────────────
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.belowPercentage) params.append('belowPercentage', filters.belowPercentage);

      const { data } = await API.get(`/admin/attendance-report?${params.toString()}`);
      setReport(data);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Short Attendance Report ────────────────────
  const fetchShortAttendance = async () => {
    setShortLoading(true);
    try {
      const params = new URLSearchParams();
      if (shortFilters.semester) params.append('semester', shortFilters.semester);
      if (shortFilters.subjectId) params.append('subjectId', shortFilters.subjectId);
      if (shortFilters.threshold) params.append('threshold', shortFilters.threshold);

      const { data } = await API.get(`/admin/short-attendance?${params.toString()}`);
      setShortReport(data);
    } catch (error) {
      toast.error('Failed to fetch short attendance data');
    } finally {
      setShortLoading(false);
    }
  };

  // ─── Send Emails ──────────────────────────────────────
  const handleSendEmails = async (subjectName, students) => {
    const studentsToEmail = students.map(s => ({
      email: s.email,
      name: s.name,
      subject: subjectName,
      percentage: s.percentage
    }));

    if (studentsToEmail.length === 0) {
      toast.warning('No students to email');
      return;
    }

    if (!window.confirm(`Send short attendance email to ${studentsToEmail.length} students for ${subjectName}?`)) {
      return;
    }

    setSending(true);
    try {
      const { data } = await API.post('/admin/send-short-attendance-email', {
        students: studentsToEmail
      });
      toast.success(data.message);
    } catch (error) {
      toast.error('Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  // ─── Generate Full Report PDF ─────────────────────────
  const generateFullReportPDF = () => {
    if (!report || report.report.length === 0) {
      toast.error('No data to generate PDF');
      return;
    }

    setPdfLoading(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Attendance Management System', pageWidth / 2, 13, { align: 'center' });

      doc.setFontSize(13);
      doc.text('Subject-wise Attendance Report', pageWidth / 2, 23, { align: 'center' });

      doc.setFontSize(9);
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      doc.text(`Generated: ${dateStr}`, pageWidth / 2, 31, { align: 'center' });

      // Filters info
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(243, 244, 246);
      doc.rect(10, 40, pageWidth - 20, 12, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Semester: ${report.filters.semester} | Subject: ${report.filters.subjectId === 'All' ? 'All' : 'Specific'} | Below: ${report.filters.belowPercentage === 'None' ? 'N/A' : report.filters.belowPercentage + '%'}`,
        pageWidth / 2, 48, { align: 'center' }
      );

      let yPos = 60;

      // Each subject section
      report.report.forEach((subjectData) => {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        // Subject header
        doc.setFillColor(79, 70, 229);
        doc.rect(10, yPos, pageWidth - 20, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(
          `${subjectData.subject.name} (${subjectData.subject.code})`,
          14, yPos + 7
        );
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Semester ${subjectData.subject.semester} | Teacher: ${subjectData.subject.teacher}`,
          14, yPos + 14
        );
        doc.text(
          `Classes: ${subjectData.totalClassesConducted} | Avg: ${subjectData.averageAttendance}%`,
          pageWidth - 14, yPos + 7, { align: 'right' }
        );
        doc.text(
          `Students: ${subjectData.totalStudents} | Short: ${subjectData.studentsShort}`,
          pageWidth - 14, yPos + 14, { align: 'right' }
        );

        yPos += 22;

        // Student table for this subject
        if (subjectData.students.length > 0) {
          doc.setTextColor(0, 0, 0);

          autoTable(doc, {
            startY: yPos,
            head: [['#', 'Roll No', 'Student Name', 'Email', 'Present', 'Absent', 'Total', '%', 'Status']],
            body: subjectData.students.map((s, i) => [
              i + 1,
              s.rollNumber,
              s.name,
              s.email,
              s.presentCount,
              s.absentCount,
              s.totalClasses,
              `${s.percentage}%`,
              s.isShort ? 'SHORT' : 'OK'
            ]),
            theme: 'striped',
            headStyles: {
              fillColor: [99, 102, 241],
              textColor: [255, 255, 255],
              fontSize: 7,
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: {
              fontSize: 7,
              cellPadding: 2
            },
            columnStyles: {
              0: { cellWidth: 8, halign: 'center' },
              1: { cellWidth: 22 },
              2: { cellWidth: 35 },
              3: { cellWidth: 40 },
              4: { cellWidth: 14, halign: 'center' },
              5: { cellWidth: 14, halign: 'center' },
              6: { cellWidth: 12, halign: 'center' },
              7: { cellWidth: 14, halign: 'center' },
              8: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }
            },
            didParseCell: (hookData) => {
              if (hookData.section === 'body') {
                const statusCol = 8;
                const pctCol = 7;

                // Color the status column
                if (hookData.column.index === statusCol) {
                  if (hookData.cell.raw === 'SHORT') {
                    hookData.cell.styles.textColor = [220, 38, 38];
                    hookData.cell.styles.fontStyle = 'bold';
                  } else {
                    hookData.cell.styles.textColor = [22, 163, 74];
                  }
                }

                // Color percentage column
                if (hookData.column.index === pctCol) {
                  const pctVal = parseFloat(hookData.cell.raw);
                  if (pctVal < 75) {
                    hookData.cell.styles.textColor = [220, 38, 38];
                    hookData.cell.styles.fontStyle = 'bold';
                  }
                }

                // Highlight entire short attendance row
                const status = hookData.row.cells[statusCol]?.raw;
                if (status === 'SHORT') {
                  hookData.cell.styles.fillColor = [255, 245, 245];
                }
              }
            },
            margin: { left: 10, right: 10 }
          });

          yPos = doc.lastAutoTable.finalY + 10;
        } else {
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(9);
          doc.text('No students found.', 14, yPos + 5);
          yPos += 12;
        }
      });

      // Footer on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${totalPages}  |  Attendance Management System  |  Generated: ${dateStr}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      const fileName = `Attendance_Report_${filters.semester ? 'Sem' + filters.semester + '_' : ''}${dateStr.replace(/[,: ]/g, '_')}.pdf`;
      doc.save(fileName);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Generate Short Attendance PDF ────────────────────
  const generateShortAttendancePDF = () => {
    if (!shortReport || shortReport.report.length === 0) {
      toast.error('No short attendance data to generate PDF');
      return;
    }

    setPdfLoading(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header - Red theme for short attendance
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Short Attendance Report', pageWidth / 2, 13, { align: 'center' });

      doc.setFontSize(13);
      doc.text(`Threshold: Below ${shortReport.threshold}%`, pageWidth / 2, 23, { align: 'center' });

      doc.setFontSize(9);
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      doc.text(`Generated: ${dateStr}`, pageWidth / 2, 31, { align: 'center' });

      // Summary box
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 243, 243);
      doc.rect(10, 40, pageWidth - 20, 14, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(
        `Total Subjects with Short Attendance: ${shortReport.totalSubjectsAffected}`,
        14, 49
      );

      const totalShortStudents = shortReport.report.reduce(
        (sum, r) => sum + r.shortAttendanceCount, 0
      );
      doc.text(
        `Total Students Affected: ${totalShortStudents}`,
        pageWidth - 14, 49, { align: 'right' }
      );

      let yPos = 62;

      // Each subject section
      shortReport.report.forEach((subjectData) => {
        if (yPos > 225) {
          doc.addPage();
          yPos = 20;
        }

        // Subject header
        doc.setFillColor(254, 226, 226);
        doc.rect(10, yPos, pageWidth - 20, 20, 'F');

        doc.setTextColor(153, 27, 27);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(
          `${subjectData.subject.name} (${subjectData.subject.code})`,
          14, yPos + 8
        );

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Semester ${subjectData.subject.semester} | Teacher: ${subjectData.subject.teacher} | Classes Conducted: ${subjectData.totalClassesConducted}`,
          14, yPos + 16
        );

        doc.setFont('helvetica', 'bold');
        doc.text(
          `Short: ${subjectData.shortAttendanceCount} / ${subjectData.totalStudentsInClass} students`,
          pageWidth - 14, yPos + 8, { align: 'right' }
        );

        yPos += 24;

        // Student table
        doc.setTextColor(0, 0, 0);

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Roll No', 'Student Name', 'Email', 'Present', 'Absent', 'Total', 'Attendance %', 'Classes Needed']],
          body: subjectData.students.map((s, i) => [
            i + 1,
            s.rollNumber,
            s.name,
            s.email,
            s.presentCount,
            s.absentCount,
            s.totalClasses,
            `${s.percentage}%`,
            s.classesNeeded > 0 ? `${s.classesNeeded} more` : 'N/A'
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: [220, 38, 38],
            textColor: [255, 255, 255],
            fontSize: 7,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 32 },
            3: { cellWidth: 38 },
            4: { cellWidth: 13, halign: 'center' },
            5: { cellWidth: 13, halign: 'center' },
            6: { cellWidth: 12, halign: 'center' },
            7: { cellWidth: 18, halign: 'center' },
            8: { cellWidth: 22, halign: 'center' }
          },
          didParseCell: (hookData) => {
            if (hookData.section === 'body') {
              // All rows are short, so color percentage red
              if (hookData.column.index === 7) {
                hookData.cell.styles.textColor = [220, 38, 38];
                hookData.cell.styles.fontStyle = 'bold';
              }
              // Light red background for all rows
              hookData.cell.styles.fillColor = [255, 250, 250];
            }
          },
          margin: { left: 10, right: 10 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${totalPages}  |  Short Attendance Report  |  Threshold: ${shortReport.threshold}%  |  ${dateStr}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      const fileName = `Short_Attendance_Report_Below${shortReport.threshold}pct_${dateStr.replace(/[,: ]/g, '_')}.pdf`;
      doc.save(fileName);
      toast.success('Short Attendance PDF downloaded!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Helper ───────────────────────────────────────────
  const getPercentageColor = (percentage) => {
    if (percentage >= 75) return 'text-green-700 bg-green-100';
    if (percentage >= 50) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getBarColor = (percentage) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Attendance Report</h1>
        <p className="text-gray-500">Subject-wise attendance data with PDF export</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 max-w-md">
        <button
          onClick={() => setActiveTab('full')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'full'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 Full Report
        </button>
        <button
          onClick={() => setActiveTab('short')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'short'
              ? 'bg-white text-red-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚠️ Short Attendance
        </button>
      </div>

      {/* ════════════════ FULL REPORT TAB ════════════════ */}
      {activeTab === 'full' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select
                  value={filters.semester}
                  onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={filters.subjectId}
                  onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter(s => !filters.semester || s.semester === parseInt(filters.semester))
                    .map(sub => (
                      <option key={sub._id} value={sub._id}>
                        {sub.name} ({sub.code}) - Sem {sub.semester}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Below %</label>
                <input
                  type="number"
                  value={filters.belowPercentage}
                  onChange={(e) => setFilters({ ...filters, belowPercentage: e.target.value })}
                  placeholder="e.g., 75"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '⏳ Loading...' : '🔍 Generate Report'}
                </button>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          )}

          {/* Results */}
          {report && !loading && (
            <>
              {/* PDF Download Button */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing <strong>{report.totalSubjects}</strong> subjects
                </p>
                <button
                  onClick={generateFullReportPDF}
                  disabled={pdfLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {pdfLoading ? (
                    <><span className="animate-spin">⏳</span><span>Generating...</span></>
                  ) : (
                    <><span>📄</span><span>Download PDF Report</span></>
                  )}
                </button>
              </div>

              {/* Subject-wise Cards */}
              {report.report.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <p className="text-gray-500 text-lg">No data found for the selected filters</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {report.report.map((subjectData) => (
                    <div key={subjectData.subject._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Subject Header */}
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-5 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div>
                            <h3 className="text-lg font-bold">
                              {subjectData.subject.name}
                              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                {subjectData.subject.code}
                              </span>
                            </h3>
                            <p className="text-indigo-200 text-sm mt-1">
                              Semester {subjectData.subject.semester} | Teacher: {subjectData.subject.teacher}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-center">
                              <p className="text-xl font-bold">{subjectData.totalClassesConducted}</p>
                              <p className="text-xs text-indigo-200">Classes</p>
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-center">
                              <p className="text-xl font-bold">{subjectData.totalStudents}</p>
                              <p className="text-xs text-indigo-200">Students</p>
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-center">
                              <p className="text-xl font-bold">{subjectData.averageAttendance}%</p>
                              <p className="text-xs text-indigo-200">Avg</p>
                            </div>
                            <div className="bg-red-500/30 px-3 py-1.5 rounded-lg text-center">
                              <p className="text-xl font-bold">{subjectData.studentsShort}</p>
                              <p className="text-xs text-red-200">Short</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Student Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Present</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Absent</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Total</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Attendance</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {subjectData.students.map((student, i) => (
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
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{student.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                                <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{student.presentCount}</td>
                                <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{student.absentCount}</td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600 font-semibold">{student.totalClasses}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex flex-col items-center space-y-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPercentageColor(student.percentage)}`}>
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
                                <td className="px-4 py-3 text-center">
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
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ════════════════ SHORT ATTENDANCE TAB ════════════════ */}
      {activeTab === 'short' && (
        <>
          {/* Short Attendance Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-4">⚠️ Short Attendance Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select
                  value={shortFilters.semester}
                  onChange={(e) => setShortFilters({ ...shortFilters, semester: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={shortFilters.subjectId}
                  onChange={(e) => setShortFilters({ ...shortFilters, subjectId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter(s => !shortFilters.semester || s.semester === parseInt(shortFilters.semester))
                    .map(sub => (
                      <option key={sub._id} value={sub._id}>
                        {sub.name} ({sub.code}) - Sem {sub.semester}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Threshold %</label>
                <input
                  type="number"
                  value={shortFilters.threshold}
                  onChange={(e) => setShortFilters({ ...shortFilters, threshold: e.target.value })}
                  placeholder="75"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchShortAttendance}
                  disabled={shortLoading}
                  className="w-full px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {shortLoading ? '⏳ Loading...' : '🔍 Find Short Attendance'}
                </button>
              </div>
            </div>
          </div>

          {/* Short Loading */}
          {shortLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            </div>
          )}

          {/* Short Results */}
          {shortReport && !shortLoading && (
            <>
              {/* Summary + PDF Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center space-x-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                    <span className="text-red-700 font-bold text-lg">
                      {shortReport.totalSubjectsAffected}
                    </span>
                    <span className="text-red-600 text-sm ml-2">Subjects Affected</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                    <span className="text-red-700 font-bold text-lg">
                      {shortReport.report.reduce((sum, r) => sum + r.shortAttendanceCount, 0)}
                    </span>
                    <span className="text-red-600 text-sm ml-2">Students with Short Attendance</span>
                  </div>
                </div>
                <button
                  onClick={generateShortAttendancePDF}
                  disabled={pdfLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {pdfLoading ? (
                    <><span className="animate-spin">⏳</span><span>Generating...</span></>
                  ) : (
                    <><span>📄</span><span>Download Short Attendance PDF</span></>
                  )}
                </button>
              </div>

              {/* Subject-wise Short Attendance Cards */}
              {shortReport.report.length === 0 ? (
                <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-12 text-center">
                  <span className="text-5xl">🎉</span>
                  <p className="text-green-700 text-lg font-semibold mt-4">
                    No students have short attendance below {shortReport.threshold}%
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {shortReport.report.map((subjectData, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                      {/* Subject Header */}
                      <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div>
                            <h3 className="text-lg font-bold">
                              {subjectData.subject.name}
                              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                {subjectData.subject.code}
                              </span>
                            </h3>
                            <p className="text-red-200 text-sm mt-1">
                              Semester {subjectData.subject.semester} | Teacher: {subjectData.subject.teacher} | Classes: {subjectData.totalClassesConducted}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="bg-white/10 px-4 py-2 rounded-lg text-center">
                              <p className="text-xl font-bold">
                                {subjectData.shortAttendanceCount}/{subjectData.totalStudentsInClass}
                              </p>
                              <p className="text-xs text-red-200">Students Short</p>
                            </div>
                            <button
                              onClick={() => handleSendEmails(subjectData.subject.name, subjectData.students)}
                              disabled={sending}
                              className="px-4 py-2 bg-white text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
                            >
                              {sending ? '⏳ Sending...' : '📧 Email Students'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Student Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-red-50 border-b border-red-200">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">#</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Roll No</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Email</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 uppercase">Present</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 uppercase">Absent</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 uppercase">Total</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 uppercase">%</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 uppercase">Classes Needed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-50">
                            {subjectData.students.map((student, i) => (
                              <tr key={i} className="hover:bg-red-50/50 bg-white">
                                <td className="px-4 py-3 text-sm text-gray-600">{i + 1}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono font-semibold rounded">
                                    {student.rollNumber}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{student.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                                <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{student.presentCount}</td>
                                <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{student.absentCount}</td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600 font-semibold">{student.totalClasses}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                    {student.percentage}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                    {student.classesNeeded > 0 ? `${student.classesNeeded} more classes` : 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceReport;