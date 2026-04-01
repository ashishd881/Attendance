const nodemailer = require('nodemailer');

const createTransporter = () => {
  console.log('Creating email transporter...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendShortAttendanceEmail = async (studentEmail, studentName, subject, percentage) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: studentEmail,
      subject: 'Short Attendance Warning - AttendEase',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Attendance Warning</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${studentName}</strong>,</p>
            <p style="font-size: 14px; color: #555; line-height: 1.6;">
              This is to inform you that your attendance in <strong>${subject}</strong> 
              is currently at <strong style="color: #e53e3e;">${percentage.toFixed(1)}%</strong>, 
              which is below the required minimum.
            </p>
            <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
              <p style="margin: 0; color: #e53e3e; font-weight: bold;">
                Please ensure regular attendance to avoid any academic consequences.
              </p>
            </div>
            <p style="font-size: 14px; color: #555;">
              If you have any queries, please contact your class teacher or the administration office.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from the AttendEase.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', studentEmail);
    console.log('Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    return false;
  }
};

module.exports = { sendShortAttendanceEmail };