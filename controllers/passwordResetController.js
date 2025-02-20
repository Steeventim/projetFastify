const { User } = require('../models');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const passwordResetController = {
  async requestReset(request, reply) {
    try {
      const { email } = request.body;
      
      // Find user by email
      const user = await User.findOne({ where: { Email: email } });
      if (!user) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

      // Update user with reset token
      await user.update({
        resetToken,
        resetTokenExpiry
      });

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.Email,
        subject: 'Password Reset Request',
        html: `
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link will expire in 1 hour.</p>
        `
      };

      await transporter.sendMail(mailOptions);

      return reply.send({
        statusCode: 200,
        message: 'Password reset email sent'
      });

    } catch (error) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  async resetPassword(request, reply) {
    try {
      const { token, newPassword } = request.body;

      // Find user by reset token
      const user = await User.findOne({ 
        where: { 
          resetToken: token,
          resetTokenExpiry: { [Op.gt]: Date.now() }
        }
      });

      if (!user) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid or expired token'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and clear reset token
      await user.update({
        Password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      });

      return reply.send({
        statusCode: 200,
        message: 'Password reset successful'
      });

    } catch (error) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = passwordResetController;
