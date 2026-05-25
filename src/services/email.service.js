import { configDotenv } from "dotenv";
configDotenv();

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify transporter connection
transporter.verify((error, success) => {

    if (error) {

        console.log("Transporter Error:");
        console.log(error);

    } else {

        console.log("Email server is ready to send messages");
    }
});

const sendEmail = async (to, subject, text, html) => {

    try {

        const info = await transporter.sendMail({
            from: `"Backend Ledger" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log("Message sent:", info.messageId);

        return info;

    } catch (error) {

        console.error("Error sending email:");
        console.error(error);

        throw error;
    }
};

export async function sendRegistrationEmail(userEmail, name) {

    const subject = "Welcome to Backend Ledger!";

    const text = `
Hello ${name},

Thank you for registering at Backend Ledger.
We're excited to have you on board!

Best regards,
Backend Ledger Team
`;

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">

            <h2>Hello ${name},</h2>

            <p>
                Thank you for registering at 
                <strong>Backend Ledger</strong>.
            </p>

            <p>
                We're excited to have you on board!
            </p>

            <br>

            <p>
                Best regards,<br>
                Backend Ledger Team
            </p>

        </div>
    `;

    await sendEmail(userEmail, subject, text, html);
}