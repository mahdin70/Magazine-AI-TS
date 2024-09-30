Use the Command to install all project dependencies 

npm i 

Create a .env file in the root directory and insert these values there :
OPENAI_API_KEY = xxxxxxxxxxxxxxxxx
MONGO_URI = xxxxxxxxxx

Update the analyzed file path in pageExtractor.ts. This should be the location of your analyzed JSON File : 
const filePath: string = "F:/Artisan/Magazine-AI-TS/Texract-JSON/MedicalAnalyzeDocResponse.json";

Now you are all set to go :
To run the project use this command : 
npm start or npm run dev

