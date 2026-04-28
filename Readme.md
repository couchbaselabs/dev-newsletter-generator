# 🤖 Google Doc Automator: Gemini-Powered Reports

An automated workflow that uses **Gemini 2.5 Flash** to analyze a set of links and generate a fully formatted Google Doc report. This script is optimized for **Google Workspace Business** environments using Shared Drives to bypass Service Account storage limitations.

## 🚀 Key Features

* **AI Inference:** Gemini automatically writes titles, descriptions, and summaries based on URLs.
* **Zero-Quota Architecture:** Specifically designed to run via Service Account on Shared Drives to avoid the "403 Storage Quota Exceeded" error.
* **Smart Caching:** SHA-1 hashing of `data.json` ensures you only pay for Gemini tokens when your input data actually changes.
* **Twin-Swap Linking:** Dynamically updates both the underlying URL and the visible anchor text of links while preserving template styles.

## 📁 Prerequisites

1.  **Google Workspace Business/Enterprise:** Required to create a **Shared Drive**.
2.  **Google Cloud Project:** Enable the **Google Drive API** and **Google Docs API**.
3.  **Service Account:** * Create a Service Account in the [Google Cloud Console](https://console.cloud.google.com/).
    * Download the JSON key file and name it `service-account-key.json`.
    * **Crucial:** Add the Service Account email as a **Contributor** to your Shared Drive.
4.  **Gemini API Key:** Obtain one from [Google AI Studio](https://aistudio.google.com/).

## ⚙️ Configuration (.env)

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key
TEMPLATE_DOC_ID=your_template_google_doc_id
SHARED_DRIVE_ID=your_shared_drive_id
SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json
```

## 📄 Template Setup

Your Google Doc Template must contain these exact placeholders. The script will replace them while maintaining the font, color, and size you applied to the placeholder.

|Section | Text Placeholder | Hyperlink Placeholder | Dummy URL to Link to |
|--------|------------------|-----------------------|----------------------|
|Date | {{SEND_DATE}} | - | - |
|Intro | {{INTRO}} | - | - |
|Announcement | {{ANN_TITLE}}, {{ANN_TEXT}} | ANN_LINK_TEXT | https://announcement-url.com |
|Project 1 | {{BLOCK1_TITLE}}, {{BLOCK1_DESC}} | B1_LINK_TEXT | https://b1-url.com |
|Project 2 | {{BLOCK2_TITLE}}, {{BLOCK2_DESC}} | B2_LINK_TEXT | https://b2-url.com |
|Project 3 | {{BLOCK3_TITLE}}, {{BLOCK3_DESC}} | B3_LINK_TEXT | https://b3-url.com |
|Project 4 | {{BLOCK4_TITLE}}, {{BLOCK4_DESC}} | B4_LINK_TEXT | https://b4-url.com |
|Footer | {{SUGGESTIONS}} | - | - |

--Note: To set up the links, highlight the placeholder text (e.g., B1_LINK_TEXT), press Ctrl+K, and enter the corresponding Dummy URL.
## 📋 Input Data

```javascript
{
  "announcement": {
    "url": "[https://example.com/main-news](https://example.com/main-news)",
    "customNote": "Focus on the environmental impact of this launch."
  },
  "blockUrls": [
    "[https://techcrunch.com/article1](https://techcrunch.com/article1)",
    "[https://theverge.com/article2](https://theverge.com/article2)",
    "[https://wired.com/article3](https://wired.com/article3)",
    "[https://reuters.com/article4](https://reuters.com/article4)"
  ]
}
```

## 🛠️ Installation & Usage

Install dependencies: `npm install`
Run the script: `node index.js`
