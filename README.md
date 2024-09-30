# AI-Magazine Generator

This project generates magazine content using AI with layout details extracted from analyzed JSON files, creating structured and consistent content based on page-by-page layout information.

## Getting Started

### Prerequisites

- Node.js
- npm
- OpenAI API Key
- MongoDB Atlas URI

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/mahdin70/Magazine-AI-TS.git
   cd Magazine-AI-TS
   ```

2. Install all project dependencies:

   ```bash
   npm i
   ```

3. Create a `.env` file in the root directory with the following values:

   ```
   OPENAI_API_KEY = xxxxxxxxxxxxxxxxx
   MONGO_URI = xxxxxxxxxx
   ```

4. Update the analyzed JSON file path in `pageExtractor.ts` to point to your local JSON file:

   ```typescript
   const filePath: string = "F:/Artisan/Magazine-AI-TS/Texract-JSON/MedicalAnalyzeDocResponse.json";
   ```

### Running the Project

To run the project, use one of the following commands:

```bash
npm start
```
