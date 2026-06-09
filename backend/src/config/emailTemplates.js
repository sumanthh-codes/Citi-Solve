export const WELCOME_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CitiSolve</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #4a1a5e 0%, #2d0f3d 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #4a1a5e 0%, #2d0f3d 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(255, 107, 107, 0.3);">
                    
                    <!-- Carnival Header with Masks -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c2d8e 0%, #4a1a5e 100%); padding: 60px 40px; text-align: center; position: relative;">
                            <!-- Carnival Masks SVG -->
                            <div style="margin-bottom: 20px;">
                                <svg width="140" height="80" viewBox="0 0 140 80" xmlns="http://www.w3.org/2000/svg">
                                    <!-- Left Mask -->
                                    <ellipse cx="35" cy="40" rx="25" ry="30" fill="#ff6b9d" opacity="0.9"/>
                                    <ellipse cx="28" cy="35" rx="6" ry="8" fill="white"/>
                                    <ellipse cx="42" cy="35" rx="6" ry="8" fill="white"/>
                                    <circle cx="28" cy="35" r="3" fill="#2d0f3d"/>
                                    <circle cx="42" cy="35" r="3" fill="#2d0f3d"/>
                                    
                                    <!-- Right Mask -->
                                    <ellipse cx="105" cy="40" rx="25" ry="30" fill="#ffa500" opacity="0.9"/>
                                    <ellipse cx="98" cy="35" rx="6" ry="8" fill="white"/>
                                    <ellipse cx="112" cy="35" rx="6" ry="8" fill="white"/>
                                    <circle cx="98" cy="35" r="3" fill="#2d0f3d"/>
                                    <circle cx="112" cy="35" r="3" fill="#2d0f3d"/>
                                    
                                    <!-- Decorative circles -->
                                    <circle cx="15" cy="15" r="4" fill="#ffa500" opacity="0.7"/>
                                    <circle cx="125" cy="15" r="4" fill="#ff6b9d" opacity="0.7"/>
                                    <circle cx="70" cy="10" r="5" fill="white" opacity="0.8"/>
                                </svg>
                            </div>
                            
                            <h1 style="margin: 0; color: white; font-size: 48px; font-weight: 800; text-shadow: 0 2px 10px rgba(0,0,0,0.3); letter-spacing: -1px;">
                                🏛️ Welcome to CitiSolve!
                            </h1>
                            <p style="margin: 20px 0 0 0; color: rgba(255,255,255,0.95); font-size: 20px; font-weight: 400;">
                                Tracking and Fixing the City's Daily Troubles
                            </p>
                        </td>
                    </tr>

                    <!-- Content Section -->
                    <tr>
                        <td style="padding: 50px 40px; background: white;">
                            <div style="background: linear-gradient(135deg, #fef3f8 0%, #ffe8f0 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; border: 2px solid #ff6b9d;">
                                <h2 style="margin: 0 0 15px 0; color: #7c2d8e; font-size: 28px; font-weight: 700;">
                                    Hey {{name}}! 👋
                                </h2>
                                <p style="margin: 0; color: #1e293b; font-size: 16px; line-height: 1.8;">
                                    Welcome aboard <strong style="color: #7c2d8e;">CitiSolve</strong>! You're now part of our city's mission to keep things running smoothly. Your voice helps us fix problems and make the city better for everyone!
                                </p>
                            </div>

                            <p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.8;">
                                Your <strong style="color: #7c2d8e;">{{role}}</strong> account has been successfully created:
                            </p>

                            <div style="background: linear-gradient(135deg, #7c2d8e 0%, #4a1a5e 100%); border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center; box-shadow: 0 4px 20px rgba(124, 45, 142, 0.3);">
                                <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
                                    📧 Your Email
                                </p>
                                <p style="margin: 0; color: white; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">
                                    {{email}}
                                </p>
                            </div>

                            <h3 style="margin: 40px 0 20px 0; color: #7c2d8e; font-size: 24px; font-weight: 700;">
                                🎪 What You Can Do
                            </h3>

                            <!-- Feature Cards -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px; background: linear-gradient(135deg, #fef3f8 0%, #ffe8f0 100%); border-radius: 12px; border-left: 4px solid #ff6b9d;">
                                        <p style="margin: 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
                                            <strong style="color: #ff6b9d; font-size: 20px;">🎭</strong> <strong>Report Issues:</strong> Road damage, water leaks, garbage piles - let us know!
                                        </p>
                                    </td>
                                </tr>
                                <tr><td style="height: 15px;"></td></tr>
                                <tr>
                                    <td style="padding: 20px; background: linear-gradient(135deg, #fff8e8 0%, #ffe8b0 100%); border-radius: 12px; border-left: 4px solid #ffa500;">
                                        <p style="margin: 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
                                            <strong style="color: #ffa500; font-size: 20px;">📸</strong> <strong>Add Photos:</strong> Show us what needs fixing with location details
                                        </p>
                                    </td>
                                </tr>
                                <tr><td style="height: 15px;"></td></tr>
                                <tr>
                                    <td style="padding: 20px; background: linear-gradient(135deg, #f3f0fe 0%, #e8e0ff 100%); border-radius: 12px; border-left: 4px solid #7c2d8e;">
                                        <p style="margin: 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
                                            <strong style="color: #7c2d8e; font-size: 20px;">🔄</strong> <strong>Track Progress:</strong> Watch your complaints move through the resolution stages
                                        </p>
                                    </td>
                                </tr>
                                <tr><td style="height: 15px;"></td></tr>
                                <tr>
                                    <td style="padding: 20px; background: linear-gradient(135deg, #fef3f8 0%, #ffe8f0 100%); border-radius: 12px; border-left: 4px solid #ff6b9d;">
                                        <p style="margin: 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
                                            <strong style="color: #ff6b9d; font-size: 20px;">🎯</strong> <strong>Stay Updated:</strong> Get notifications when issues are resolved
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: center; margin: 50px 0 30px 0;">
                                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #ff6b9d 0%, #ffa500 100%); color: white; padding: 18px 50px; border-radius: 50px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 20px rgba(255, 107, 157, 0.4); text-transform: uppercase; letter-spacing: 1px; text-decoration: none;">
                                    🎪 Start Reporting Issues
                                </a>
                            </div>

                            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 30px; border: 2px dashed #cbd5e1;">
                                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.8; text-align: center;">
                                    🎭 <em>Together, we keep the show running! Our Grounds Manager team is here to fix every issue you report.</em>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c2d8e 0%, #4a1a5e 100%); padding: 35px 40px; text-align: center;">
                            <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">
                                🏛️ CitiSolve - Empowering Citizens, Transforming Cities
                            </p>
                            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px;">
                                © 2025 CitiSolve. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

export const EMAIL_VERIFY_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #4a1a5e 0%, #2d0f3d 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #4a1a5e 0%, #2d0f3d 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(255, 107, 107, 0.3);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c2d8e 0%, #4a1a5e 100%); padding: 60px 40px; text-align: center;">
                            <div style="margin-bottom: 20px;">
                                <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <!-- Ticket Shape -->
                                    <rect x="20" y="30" width="60" height="40" rx="5" fill="white" opacity="0.3"/>
                                    <rect x="25" y="35" width="50" height="30" rx="3" fill="white"/>
                                    <!-- Lock on ticket -->
                                    <circle cx="50" cy="50" r="8" fill="#ff6b9d"/>
                                    <rect x="48" y="50" width="4" height="8" rx="1" fill="#ff6b9d"/>
                                    <path d="M45 50 V44 Q45 40 50 40 Q55 40 55 44 V50" fill="none" stroke="#ffa500" stroke-width="2"/>
                                </svg>
                            </div>
                            
                            <h1 style="margin: 0; color: white; font-size: 42px; font-weight: 800; text-shadow: 0 2px 10px rgba(0,0,0,0.2); letter-spacing: -1px;">
                                🎭 Verify Your Email
                            </h1>
                            <p style="margin: 15px 0 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 600;">
                                Your Verification Code
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 50px 40px; background: white;">
                            <div style="background: linear-gradient(135deg, #fef3f8 0%, #ffe8f0 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; border: 2px solid #ff6b9d;">
                                <h2 style="margin: 0 0 15px 0; color: #7c2d8e; font-size: 26px; font-weight: 700;">
                                    Hi {{name}}! 🎪
                                </h2>
                                <p style="margin: 0; color: #1e293b; font-size: 16px; line-height: 1.8;">
                                    Welcome to <strong style="color: #7c2d8e;">CitiSolve</strong>! To complete your registration and start reporting issues, please verify your email using the code below.
                                </p>
                            </div>

                            <!-- OTP Box with Carnival Style -->
                            <div style="background: linear-gradient(135deg, #ff6b9d 0%, #ffa500 100%); border-radius: 20px; padding: 40px; margin: 40px 0; text-align: center; box-shadow: 0 8px 30px rgba(255, 107, 157, 0.4); border: 4px solid white; position: relative;">
                                <p style="margin: 0 0 15px 0; color: white; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">
                                    🎫 YOUR VERIFICATION CODE
                                </p>
                                <p style="margin: 0; color: white; font-size: 56px; font-weight: 900; letter-spacing: 12px; text-shadow: 0 4px 15px rgba(0,0,0,0.3); font-family: 'Courier New', monospace;">
                                    {{otp}}
                                </p>
                                <p style="margin: 15px 0 0 0; color: white; font-size: 13px; font-weight: 600;">
                                    ⏰ Valid for 24 hours
                                </p>
                            </div>

                            <div style="background: linear-gradient(135deg, #fff8e8 0%, #ffe8b0 100%); border-radius: 12px; padding: 20px 25px; margin: 30px 0; border-left: 4px solid #ffa500;">
                                <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.7;">
                                    <strong style="color: #b45309;">⚠️ Security Notice:</strong> Never share this code with anyone, even if they claim to be from CitiSolve. We'll never ask for your OTP!
                                </p>
                            </div>

                            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 30px; border: 2px dashed #cbd5e1;">
                                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.7; text-align: center;">
                                    Didn't request this? Someone might have entered your email by mistake. You can safely ignore this message.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c2d8e 0%, #4a1a5e 100%); padding: 35px 40px; text-align: center;">
                            <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">
                                🏛️ CitiSolve Security Team
                            </p>
                            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px;">
                                © 2025 CitiSolve. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

export const PASSWORD_RESET_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #4a1a5e 0%, #2d0f3d 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #4a1a5e 0%, #2d0f3d 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(255, 107, 107, 0.3);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c2d8e 0%, #4a1a5e 100%); padding: 60px 40px; text-align: center;">
                            <div style="margin-bottom: 20px;">
                                <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <!-- Key with carnival colors -->
                                    <circle cx="70" cy="30" r="20" fill="#ffa500" opacity="0.3"/>
                                    <circle cx="70" cy="30" r="12" fill="white"/>
                                    <circle cx="70" cy="30" r="6" fill="#ff6b9d"/>
                                    <rect x="20" y="28" width="45" height="4" rx="2" fill="white"/>
                                    <rect x="20" y="24" width="8" height="12" rx="2" fill="white"/>
                                    <rect x="32" y="26" width="6" height="8" rx="1" fill="white"/>
                                </svg>
                            </div>
                            
                            <h1 style="margin: 0; color: white; font-size: 42px; font-weight: 800; text-shadow: 0 2px 10px rgba(0,0,0,0.2); letter-spacing: -1px;">
                                🔑 Password Reset
                            </h1>
                            <p style="margin: 15px 0 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 600;">
                                Regain Access to Your Account
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 50px 40px; background: white;">
                            <div style="background: linear-gradient(135deg, #fef3f8 0%, #ffe8f0 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; border: 2px solid #ff6b9d;">
                                <h2 style="margin: 0 0 15px 0; color: #7c2d8e; font-size: 26px; font-weight: 700;">
                                    Hi {{name}}! 👋
                                </h2>
                                <p style="margin: 0; color: #1e293b; font-size: 16px; line-height: 1.8;">
                                    We received a request to reset your password for <strong style="color: #7c2d8e;">CitiSolve</strong>. Use the secure code below to create a new password.
                                </p>
                            </div>

                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #ff6b9d 0%, #ffa500 100%); border-radius: 20px; padding: 40px; margin: 40px 0; text-align: center; box-shadow: 0 8px 30px rgba(255, 107, 157, 0.4); border: 4px solid white;">
                                <p style="margin: 0 0 15px 0; color: white; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">
                                    🔐 RESET CODE
                                </p>
                                <p style="margin: 0; color: white; font-size: 56px; font-weight: 900; letter-spacing: 12px; text-shadow: 0 4px 15px rgba(0,0,0,0.3); font-family: 'Courier New', monospace;">
                                    {{otp}}
                                </p>
                                <p style="margin: 15px 0 0 0; color: white; font-size: 13px; font-weight: 600;">
                                    ⏰ Expires in 10 minutes
                                </p>
                            </div>

                            <div style="background: linear-gradient(135deg, #fff8e8 0%, #ffe8b0 100%); border-radius: 12px; padding: 20px 25px; margin: 30px 0; border-left: 4px solid #ffa500;">
                                <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.7;">
                                    <strong style="color: #b45309;">🚨 Urgent:</strong> This code expires in just 10 minutes! Never share it with anyone. The CitiSolve team will NEVER ask for your reset code.
                                </p>
                            </div>

                            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 30px; border: 2px dashed #cbd5e1;">
                                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.7; text-align: center;">
                                    🛡️ <strong>Didn't request a password reset?</strong> Your account is safe - just ignore this email. Consider changing your password if this happens frequently.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c2d8e 0%, #4a1a5e 100%); padding: 35px 40px; text-align: center;">
                            <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">
                                🏛️ CitiSolve Security Team
                            </p>
                            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px;">
                                © 2025 CitiSolve. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

export const LOGIN_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="margin:0;background:#0f172a;font-family:Inter,Segoe UI,sans-serif;">
<table width="100%" style="padding:40px">
<tr><td align="center">

<table width="600" style="background:#fff;border-radius:14px;overflow:hidden;">
<tr>
<td style="background:#16a34a;color:#fff;padding:30px;text-align:center;">
<h1 style="margin:0">✅ Login Successful</h1>
<p>Your account was accessed successfully</p>
</td>
</tr>

<tr>
<td style="padding:30px;color:#020617">
<p>Hi <b>{{name}}</b>,</p>
<p>Your account was logged into successfully.</p>

<table style="margin:20px 0">
<tr><td><b>🌍 IP Address:</b></td><td>{{ip}}</td></tr>
<tr><td><b>⏰ Time:</b></td><td>{{time}}</td></tr>
</table>

<div style="background:#f1f5f9;padding:15px;border-left:4px solid #16a34a">
If this was you, no action is required.
</div>

<div style="margin-top:15px;background:#fff7ed;padding:15px;border-left:4px solid #f97316">
⚠️ If this wasn’t you, reset your password immediately.
</div>
</td>
</tr>

<tr>
<td style="background:#020617;color:#94a3b8;padding:15px;text-align:center;font-size:12px">
CitiSolve • Security Notification
</td>
</tr>
</table>

</td></tr>
</table>
</body>
</html>
`;

export const TOO_MANY_LOGIN_ATTEMPTS_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="margin:0;background:#0f172a;font-family:Inter,Segoe UI,sans-serif;">
<table width="100%" style="padding:40px">
<tr><td align="center">

<table width="600" style="background:#fff;border-radius:14px;overflow:hidden;">
<tr>
<td style="background:#dc2626;color:#fff;padding:30px;text-align:center;">
<h1 style="margin:0">🚨 Too Many Login Attempts</h1>
<p>We temporarily blocked repeated login attempts</p>
</td>
</tr>

<tr>
<td style="padding:30px;color:#020617">
<p>Hi <b>{{name}}</b>,</p>

<p>We detected multiple failed login attempts on your account.</p>

<table style="margin:20px 0">
<tr><td><b>🌍 IP Address:</b></td><td>{{ip}}</td></tr>
<tr><td><b>⏰ Time:</b></td><td>{{time}}</td></tr>
</table>

<div style="background:#fef2f2;padding:15px;border-left:4px solid #dc2626">
🔒 For your security, further login attempts were blocked.
</div>
</td>
</tr>

<tr>
<td style="background:#020617;color:#94a3b8;padding:15px;text-align:center;font-size:12px">
CitiSolve • Account Protection
</td>
</tr>
</table>

</td></tr>
</table>
</body>
</html>
`;

export const TOO_MANY_PASSWORD_ATTEMPTS_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="margin:0;background:#0f172a;font-family:Inter,Segoe UI,sans-serif;">
<table width="100%" style="padding:40px">
<tr><td align="center">

<table width="600" style="background:#fff;border-radius:14px;overflow:hidden;">
<tr>
<td style="background:#991b1b;color:#fff;padding:30px;text-align:center;">
<h1 style="margin:0">🚨 Password Attempts Blocked</h1>
<p>Multiple incorrect password attempts detected</p>
</td>
</tr>

<tr>
<td style="padding:30px;color:#020617">
<p>Hi <b>{{name}}</b>,</p>

<p>There were too many incorrect password attempts on your account.</p>

<table style="margin:20px 0">
<tr><td><b>🌍 IP Address:</b></td><td>{{ip}}</td></tr>
<tr><td><b>⏰ Time:</b></td><td>{{time}}</td></tr>
</table>

<div style="background:#fff1f2;padding:15px;border-left:4px solid #991b1b">
⚠️ If this was not you, change your password immediately.
</div>
</td>
</tr>

<tr>
<td style="background:#020617;color:#94a3b8;padding:15px;text-align:center;font-size:12px">
CitiSolve • Security Alert
</td>
</tr>
</table>

</td></tr>
</table>
</body>
</html>
`;