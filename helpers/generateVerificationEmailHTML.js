export const generateVerificationEmailHTML = verificationToken => {
  return `
<!DOCTYPE html>
<html lang="en">
  <html>
    <head>
      <style>
        body {
          font-family: 'Arial', sans-serif;
        }

        .container {
          width: 95%;
          max-width: 1200px;
          text-align: center;
          padding: 20px;
          background: black;
          color: rgb(182, 182, 182);
        }

        h1{
          color: white;
        }

        .verification-link {
          display: block;
          padding: 10px;
          width: 30vw;
          max-width: 200px;
          margin: 20px auto;
          background-color: rgb(227, 255, 168);
          color: black;
          text-align: center;
          text-decoration: none;
          font-size: 16px;
          border-radius: 12px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Verify Your Email</h1>
        <p>Click the following link to verify your email address:</p>
        <a target="_blank" class="verification-link" href="https://maksymchukhrai.github.io/team-project-SlimTrack360/verify?searchQuery=${verificationToken}">Verify Email</a>
        <p>If you did not sign up for our service, you can safely ignore this email.</p>
      </div>
    </body>
  </html>
`;
};
