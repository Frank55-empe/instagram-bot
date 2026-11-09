const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_KEY_FILE || 'google-key.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function appendLead({ igUserId, nome, comentario, palavraChave, tag }) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Leads!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toISOString(),
        igUserId ?? '',
        nome ?? '',
        comentario ?? '',
        palavraChave,
        tag,
        'novo',
      ]],
    },
  });
}

module.exports = { appendLead };
