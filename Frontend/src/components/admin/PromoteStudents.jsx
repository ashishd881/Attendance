import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PromoteStudents = () => {
  const [overview, setOverview] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [promotionDone, setPromotionDone] = useState(null);

  useEffect(() => {
    fetchOverview();
  }, []);

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

  const fetchPreview = async (semester) => {
    setSelectedSemester(semester);
    setPreviewLoading(true);
    setPreview(null);
    setPromotionDone(null);
    try {
      const { data } = await API.get(`/admin/promotion/preview/${semester}`);
      setPreview(data);
    } catch (error) {
      toast.error('Failed to fetch preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedSemester) return;
    setPromoting(true);
    try {
      const { data } = await API.post(`/admin/promotion/promote/${selectedSemester}`);
      toast.success(data.message);
      setPromotionDone(data);
      setShowConfirm(false);
      setPreview(null);
      fetchOverview();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  // Generate PDF for a semester
  const generatePDF = async (semester) => {
    setPdfLoading(true);
    try {
      const { data } = await API.get(`/admin/promotion/attendance-report/${semester}`);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // ─── Header ───────────────────────────────────────────
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Attendance Management System', pageWidth / 2, 13, { align: 'center' });

      doc.setFontSize(13);
      doc.text(`Semester ${semester} - Attendance Report`, pageWidth / 2, 23, { align: 'center' });

      doc.setFontSize(9);
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}`,
        pageWidth / 2, 31,
        { align: 'center' }
      );

      // ─── Summary Box ──────────────────────────────────────
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(243, 244, 246);
      doc.rect(10, 40, pageWidth - 20, 18, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Students: ${data.totalStudents}`, 15, 50);
      doc.text(`Semester: ${semester}`, pageWidth / 2, 50, { align: 'center' });
      doc.text(
        `Short Attendance (<75%): ${data.students.filter(s => s.shortAttendanceSubjects.length > 0).length}`,
        pageWidth - 15, 50,
        { align: 'right' }
      );

      let yPos = 65;

      // ─── Each Student ─────────────────────────────────────
      data.students.forEach((student, index) => {
        // Page break check
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        // Student header bar
        const headerColor = student.overallPercentage >= 75
          ? [209, 250, 229]   // green
          : [254, 226, 226];  // red

        doc.setFillColor(...headerColor);
        doc.rect(10, yPos - 5, pageWidth - 20, 14, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text(`${index + 1}. ${student.name}`, 14, yPos + 3);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Roll: ${student.rollNumber}`, 14, yPos + 8);
        doc.text(`Email: ${student.email}`, 80, yPos + 8);

        const pctColor = student.overallPercentage >= 75
          ? [22, 163, 74]
          : [220, 38, 38];
        doc.setTextColor(...pctColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(
          `Overall: ${student.overallPercentage}%`,
          pageWidth - 14,
          yPos + 3,
          { align: 'right' }
        );

        yPos += 16;

        // Subject table
        if (student.subjectStats.length > 0) {
          doc.setTextColor(0, 0, 0);

          autoTable(doc, {
            startY: yPos,
            head: [['Subject', 'Code', 'Total', 'Present', 'Absent', 'Percentage', 'Status']],
            body: student.subjectStats.map(s => [
              s.subjectName,
              s.subjectCode,
              s.totalClasses,
              s.presentCount,
              s.absentCount,
              `${s.percentage}%`,
              s.percentage >= 75 ? 'OK' : s.totalClasses === 0 ? 'No Class' : 'SHORT'
            ]),
            theme: 'striped',
            headStyles: {
              fillColor: [67, 56, 202],
              textColor: [255, 255, 255],
              fontSize: 8,
              fontStyle: 'bold'
            },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 50 },
              6: { fontStyle: 'bold' }
            },
            didParseCell: (hookData) => {
              if (hookData.section === 'body' && hookData.column.index === 6) {
                const val = hookData.cell.raw;
                if (val === 'SHORT') {
                  hookData.cell.styles.textColor = [220, 38, 38];
                } else if (val === 'OK') {
                  hookData.cell.styles.textColor = [22, 163, 74];
                }
              }
              // Highlight short attendance rows
              if (hookData.section === 'body') {
                const pctVal = parseFloat(hookData.row.cells[5]?.raw);
                const total = parseInt(hookData.row.cells[2]?.raw);
                if (pctVal < 75 && total > 0) {
                  hookData.cell.styles.fillColor = [255, 245, 245];
                }
              }
            },
            margin: { left: 10, right: 10 }
          });

          yPos = doc.lastAutoTable.finalY + 8;
        } else {
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text('No subjects found for this student.', 14, yPos + 4);
          yPos += 12;
        }

        // Short attendance warning
        if (student.shortAttendanceSubjects.length > 0) {
          if (yPos > 250) { doc.addPage(); yPos = 20; }
          
          doc.setFillColor(255, 237, 213);
          doc.rect(10, yPos, pageWidth - 20, 8, 'F');
          doc.setTextColor(180, 83, 9);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(
            `⚠ Short Attendance in: ${student.shortAttendanceSubjects.map(s => `${s.subjectName} (${s.percentage}%)`).join(', ')}`,
            14,
            yPos + 5.5
          );
          yPos += 12;
        }

        yPos += 5;
      });

      // ─── Footer on last page ───────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${totalPages}  |  Attendance Management System  |  Semester ${semester} Report`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      doc.save(`Semester_${semester}_Attendance_Report.pdf`);
      toast.success(`PDF downloaded: Semester_${semester}_Attendance_Report.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const getPercentageBadge = (pct) => {
    if (pct >= 75) return 'bg-green-100 text-green-700';
    if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Promote Students</h1>
        <p className="text-gray-500 mt-1">
          Promote students to the next semester or graduate 8th semester students.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📋 How Promotion Works:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
          <div>• Sem 1 → Promoted to Sem 2</div>
          <div>• Sem 2 → Promoted to Sem 3</div>
          <div>• Sem 3 → Promoted to Sem 4</div>
          <div>• Sem 4 → Promoted to Sem 5</div>
          <div>• Sem 5 → Promoted to Sem 6</div>
          <div>• Sem 6 → Promoted to Sem 7</div>
          <div>• Sem 7 → Promoted to Sem 8</div>
          <div className="text-red-600 font-semibold">• Sem 8 → GRADUATED (Data Deleted)</div>
        </div>
      </div>

      {/* Semester Overview Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {overview.map((sem) => (
            <div
              key={sem.semester}
              className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedSemester === sem.semester
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-gray-100 hover:border-indigo-300'
              }`}
              onClick={() => fetchPreview(sem.semester)}
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

      {/* Preview Loading */}
      {previewLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Preview Section */}
      {preview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Preview Header */}
          <div className={`p-6 ${
            preview.semester === 8
              ? 'bg-gradient-to-r from-red-600 to-red-700'
              : 'bg-gradient-to-r from-indigo-600 to-purple-700'
          } text-white`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Semester {preview.semester} - Preview
                </h2>
                <p className="text-white/80 text-sm mt-1">{preview.action}</p>
                <p className="text-white/70 text-sm">
                  Total Students: {preview.totalStudents}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {/* Download PDF Button */}
                <button
                  onClick={() => generatePDF(preview.semester)}
                  disabled={pdfLoading}
                  className="px-4 py-2.5 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {pdfLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                {/* Promote / Graduate Button */}
                {preview.totalStudents > 0 && (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
                      preview.semester === 8
                        ? 'bg-red-800 hover:bg-red-900 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <span>{preview.semester === 8 ? '🎓' : '⬆️'}</span>
                    <span>
                      {preview.semester === 8
                        ? 'Graduate & Delete'
                        : `Promote to Sem ${preview.semester + 1}`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="p-6">
            {preview.students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No students in Semester {preview.semester}
              </div>
            ) : (
              <div className="space-y-4">
                {preview.students.map((student, index) => (
                  <div
                    key={student._id}
                    className={`border rounded-xl overflow-hidden ${
                      student.shortAttendanceSubjects.length > 0
                        ? 'border-red-200'
                        : 'border-gray-200'
                    }`}
                  >
                    {/* Student Header */}
                    <div className={`px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
                      student.shortAttendanceSubjects.length > 0
                        ? 'bg-red-50'
                        : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-700 font-bold text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{student.name}</p>
                          <p className="text-xs text-gray-500">
                            {student.rollNumber} | {student.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {student.shortAttendanceSubjects.length > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                            ⚠️ Short Attendance
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getPercentageBadge(student.overallPercentage)}`}>
                          Overall: {student.overallPercentage}%
                        </span>
                        {preview.semester < 8 && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
                            Sem {student.currentSemester} → Sem {student.nextSemester}
                          </span>
                        )}
                        {preview.semester === 8 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                            Will be Deleted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subject Stats */}
                    {student.subjectStats.length > 0 && (
                      <div className="p-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                                <th className="pb-2 pr-4">Subject</th>
                                <th className="pb-2 pr-4">Code</th>
                                <th className="pb-2 pr-4 text-center">Total</th>
                                <th className="pb-2 pr-4 text-center">Present</th>
                                <th className="pb-2 pr-4 text-center">Absent</th>
                                <th className="pb-2 text-center">Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {student.subjectStats.map((sub, i) => (
                                <tr key={i} className={
                                  sub.percentage < 75 && sub.totalClasses > 0
                                    ? 'bg-red-50'
                                    : ''
                                }>
                                  <td className="py-2 pr-4 font-medium text-gray-800">
                                    {sub.subjectName}
                                  </td>
                                  <td className="py-2 pr-4">
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded font-mono">
                                      {sub.subjectCode}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-4 text-center text-gray-600">
                                    {sub.totalClasses}
                                  </td>
                                  <td className="py-2 pr-4 text-center text-green-600 font-semibold">
                                    {sub.presentCount}
                                  </td>
                                  <td className="py-2 pr-4 text-center text-red-600 font-semibold">
                                    {sub.absentCount}
                                  </td>
                                  <td className="py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPercentageBadge(sub.percentage)}`}>
                                      {sub.totalClasses === 0 ? 'N/A' : `${sub.percentage}%`}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Banner */}
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
              <h3 className={`font-bold text-lg ${
                promotionDone.deleted > 0 && promotionDone.promoted === 0
                  ? 'text-red-800'
                  : 'text-green-800'
              }`}>
                {promotionDone.deleted > 0 && promotionDone.promoted === 0
                  ? 'Students Graduated!'
                  : 'Promotion Successful!'}
              </h3>
              <p className={`text-sm ${
                promotionDone.deleted > 0 && promotionDone.promoted === 0
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}>
                {promotionDone.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <span className="text-5xl">
                {preview.semester === 8 ? '🎓' : '⬆️'}
              </span>
              <h2 className="text-xl font-bold text-gray-800 mt-3">
                {preview.semester === 8 ? 'Confirm Graduation' : 'Confirm Promotion'}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                {preview.semester === 8
                  ? `This will permanently DELETE all ${preview.totalStudents} students from Semester 8 (Graduated).`
                  : `This will promote all ${preview.totalStudents} students from Semester ${preview.semester} to Semester ${preview.semester + 1}.`}
              </p>
              {preview.semester === 8 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm font-semibold">
                    ⚠️ This action CANNOT be undone! All student data will be permanently deleted.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 text-center">
                <strong>{preview.totalStudents}</strong> students affected
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
                  preview.semester === 8
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {promoting
                  ? 'Processing...'
                  : preview.semester === 8
                    ? '🎓 Graduate & Delete'
                    : `✅ Promote to Sem ${preview.semester + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoteStudents;