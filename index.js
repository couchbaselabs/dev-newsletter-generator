require('dotenv').config();
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- 1. CONFIGURATION ---
const KEYFILEPATH = path.join(__dirname, process.env.SERVICE_ACCOUNT_KEY_PATH);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TEMPLATE_DOC_ID = process.env.TEMPLATE_DOC_ID;
const TEMPLATE_DOC_FOLDER = process.env.TEMPLATE_DOC_FOLDER;
const CACHE_FILE = './gemini-cache.json';
const INPUT_FILE = './data.json';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});

// Helper: Calculate SHA1 of a file
function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha1');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

async function createCustomReport() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILEPATH,
            scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
        });
        
        const drive = google.drive({ version: 'v3', auth });
        const docs = google.docs({ version: 'v1', auth });

        // --- 2. CACHE LOGIC ---
        const currentHash = getFileHash(INPUT_FILE);
        let docData;
        let cache = {};

        if (fs.existsSync(CACHE_FILE)) {
            cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        }

        if (cache.hash === currentHash) {
            console.log("♻️  Input unchanged. Loading content from local Gemini cache...");
            docData = cache.data;
        } else {
            console.log("🤖 Gemini is crafting new content (Input changed or no cache)...");
            const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
            
            const prompt = `
                Context: ${inputData.announcement.customNote}
                Announcement Link: ${inputData.announcement.url}
                Block Links: ${inputData.blockUrls.join(", ")}
                Return JSON format:
                {
                    "intro": "Summary",
                    "announcement": { "title": "", "body": "", "linkText": "", "linkUrl": "${inputData.announcement.url}" },
                    "blocks": [{ "title": "", "desc": "", "linkText": "" }],
                    "suggestions": "Email Topics Suggestion",
                    "title": "Dev Newsletter Title",
                    "subjecta": "Subject Line A (Product / Release Focus)",
                    "subjectb": "Subject Line B (Architecture / Curiosity Focus)"
                }
            `;

            const result = await model.generateContent(prompt);
            docData = JSON.parse(result.response.text());

            // Save to cache
            fs.writeFileSync(CACHE_FILE, JSON.stringify({ hash: currentHash, data: docData }, null, 2));
            console.log("💾 Results cached to gemini-cache.json");
        }

        // --- 3. PREPARE DOCUMENT DATA ---
        const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8')); // Reload for URL references
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        // --- 4. CLONE TEMPLATE ---
        console.log(`📂 Creating copy: Report - ${formattedDate}...`);
        const copy = await drive.files.copy({
            fileId: TEMPLATE_DOC_ID,
            supportsAllDrives: true,
            requestBody: { 
                name: `Dev Newsletter - ${formattedDate}`,
                parents: [TEMPLATE_DOC_FOLDER] 
            },
        });
        const newDocId = copy.data.id;

        // --- 5. BATCH UPDATE REQUESTS ---
        const requests = [
            { replaceAllText: { containsText: { text: '{{SEND_DATE}}', matchCase: true }, replaceText: formattedDate }},
            { replaceAllText: { containsText: { text: '{{SUBECT_LINE_A}}', matchCase: true }, replaceText: docData.subjecta }},
            { replaceAllText: { containsText: { text: '{{SUBECT_LINE_B}}', matchCase: true }, replaceText: docData.subjectb }},
            { replaceAllText: { containsText: { text: '{{INTRO}}', matchCase: true }, replaceText: docData.intro }},
            { replaceAllText: { containsText: { text: '{{TITLE}}', matchCase: true }, replaceText: docData.title }},
            { replaceAllText: { containsText: { text: '{{ANN_TITLE}}', matchCase: true }, replaceText: docData.announcement.title }},
            { replaceAllText: { containsText: { text: '{{ANN_DESC}}', matchCase: true }, replaceText: docData.announcement.body }},
            { replaceAllText: { containsText: { text: '{{SUGGESTIONS}}', matchCase: true }, replaceText: docData.suggestions }},
            
            // Announcement Links
            { replaceAllText: { containsText: { text: 'https://announcement.com', matchCase: true }, replaceText: docData.announcement.linkUrl }},
            { replaceAllText: { containsText: { text: 'ANN_LINK_TEXT', matchCase: true }, replaceText: docData.announcement.linkText }}
        ];

        docData.blocks.forEach((block, index) => {
            const i = index + 1;
            requests.push(
                { replaceAllText: { containsText: { text: `{{BLOCK${i}_TITLE}}`, matchCase: true }, replaceText: block.title }},
                { replaceAllText: { containsText: { text: `{{BLOCK${i}_DESC}}`, matchCase: true }, replaceText: block.desc }},
                { replaceAllText: { containsText: { text: `https://block${i}.com`, matchCase: true }, replaceText: inputData.blockUrls[index] }},
                { replaceAllText: { containsText: { text: `BLOCK${i}_LINK_TEXT`, matchCase: true }, replaceText: block.linkText }}
            );
        });

        await docs.documents.batchUpdate({
             documentId: newDocId,
             resource: { requests } 
            });

        console.log(`\n✨ Success!`);
        console.log(`🔗 URL: https://docs.google.com/document/d/${newDocId}/edit`);

    } catch (err) {
        console.error("❌ Error:", err);
    }
}

createCustomReport();