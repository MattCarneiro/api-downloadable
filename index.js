const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

app.use(express.json());

const mimeTypes = {
    pdf: 'application/pdf',
    image: 'image/',
    video: 'video/',
};

async function isDownloadable(fileId, type) {
    const drive = google.drive({ version: 'v3', auth: API_KEY });

    try {
        const res = await drive.files.get({
            fileId: fileId,
            fields: 'mimeType',
        });

        const mimeType = res.data.mimeType;
        if (type === 'pdf' && mimeType === mimeTypes.pdf) {
            return true;
        } else if (type === 'image' && mimeType.startsWith(mimeTypes.image)) {
            return true;
        } else if (type === 'video' && mimeType.startsWith(mimeTypes.video)) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error checking file:', error);
        return false;
    }
}

async function checkFolder(folderId, type) {
    const drive = google.drive({ version: 'v3', auth: API_KEY });

    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, mimeType)',
        });

        const files = res.data.files;
        if (!files || files.length === 0) {
            return false;
        }

        for (const file of files) {
            if (type === 'pdf' && file.mimeType === mimeTypes.pdf) {
                return true;
            } else if (type === 'image' && file.mimeType.startsWith(mimeTypes.image)) {
                return true;
            } else if (type === 'video' && file.mimeType.startsWith(mimeTypes.video)) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking folder:', error);
        return false;
    }
}

function extractIdFromLink(link) {
    const fileIdMatch = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const folderIdMatch = link.match(/\/folders\/([a-zA-Z0-9-_]+)/);

    if (fileIdMatch) {
        return fileIdMatch[1];
    } else if (folderIdMatch) {
        return folderIdMatch[1];
    } else {
        return null;
    }
}

app.post('/check-downloadable', async (req, res) => {
    const { link, type } = req.body;

    if (!link || !type || !mimeTypes[type]) {
        return res.status(400).send('Invalid parameters');
    }

    const id = extractIdFromLink(link);

    if (!id) {
        return res.status(400).send('Invalid link format');
    }

    console.log(`Extracted ID: ${id}`); // Log para depuração

    const isFolderLink = link.includes('/folders/');
    let downloadable = false;

    if (isFolderLink) {
        downloadable = await checkFolder(id, type);
    } else {
        downloadable = await isDownloadable(id, type);
    }

    res.send({ result: downloadable ? 'yes' : 'no' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
