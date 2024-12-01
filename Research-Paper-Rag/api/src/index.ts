import axios from "axios";
import { Document } from "langchain/document";
import { PDFDocument } from "pdf-lib";
import { writeFile, unlink } from "fs/promises";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";
import dotenv from 'dotenv';
import { formatDocumentsAsString } from "langchain/util/document";
import { ChatAnthropic } from "@langchain/anthropic"; // Updated import
import { NOTES_TOOL_SCHEMA } from "./prompts.js"; // Corrected import path
import { HumanMessage, SystemMessage } from "@langchain/core/messages"; // Updated import

dotenv.config({ path: './api/.env.development.local' });

async function deletePages(pdf: Buffer, pagesToDelete: number[]): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdf);
    // Iterate over each page to delete
    let numToOffsetBy = 1;
    for (const pageNum of pagesToDelete) {
        pdfDoc.removePage(pageNum - numToOffsetBy);
        numToOffsetBy++;
    }
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

async function loadPdfFromUrl(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
    });
    return response.data;
}

// Converting PDF to Langchain Documents
async function convertPdfToDocument(pdf: Buffer): Promise<Array<Document>> {
    if (!process.env.UNSTRUCTURED_API_KEY) {
        throw new Error("Missing API Key.")
    }
    const randomName = Math.random().toString(36).substring(7);
    await writeFile(`pdfs/${randomName}.pdf`, pdf, 'binary');
    const loader = new UnstructuredLoader(`./pdfs/${randomName}.pdf`, {
        apiUrl: process.env.UNSTRUCTURED_API_URL,
        apiKey: process.env.UNSTRUCTURED_API_KEY,
        strategy: 'hi_res',
    });
    const documents = await loader.load();
    await unlink(`pdfs/${randomName}.pdf`);
    return documents;
}

// Generate Notes
async function generateNotes(documents: Array<Document>) {
    const documentsAsString = formatDocumentsAsString(documents);
    const model = new ChatAnthropic({
        modelName: "claude-3-5-sonnet-20241022",
        anthropicApiKey: process.env.CLAUDE_API_KEY,
        temperature: 0.0
    });
    const modelWithTool = model.bind({
        tools: [NOTES_TOOL_SCHEMA],
    });

    const prompt = [
        new SystemMessage(`You are an AI assistant specializing in detailed scientific paper note-taking.
        Take notes of the following scientific document.
        The goal is to create a complete understanding of the document after reading all notes.
        
        Rules:
        - Include specific quotes and details inside your notes.
        - Respond with as many notes as it might take to cover the entire document.
        - Go into as much detail as you can, while keeping each note on a very specific part of the document.
        - Include notes about key findings, methodologies, and implications.
        - DO NOT respond with generic notes like: "The author discusses how XYZ works."
        - Instead, explain precisely what XYZ is and how it works in technical detail.

        Respond with a JSON array with two keys: "note" and "pageNumbers".
        "note" will be the specific note and pageNumbers will be an array of numbers (if the note spans more than one page).
        Take a deep breath, and work your way through the document step by step.`),
        new HumanMessage(`Document: ${documentsAsString}`)
    ];

    try {
        const response = await modelWithTool.invoke(prompt, {
            tool_choice: {
                type: "tool",
                name: "formatNotes"
            }
        });

        // Check if tool_calls exist and are in the expected format
        if (response.tool_calls && response.tool_calls.length > 0) {
            // Get the first tool call
            const firstToolCall = response.tool_calls[0];

            // Ensure the tool call has a function property with arguments
            if (firstToolCall.args && firstToolCall.args) {
                // Safely parse the arguments
                let parsedArguments;
                try {
                    parsedArguments = JSON.parse(firstToolCall.name);
                } catch (parseError) {
                    console.error("Error parsing tool call arguments:", parseError);
                    console.log("Raw arguments:", firstToolCall.name);
                    throw parseError;
                }

                // Return the notes from the parsed arguments
                return parsedArguments.notes || parsedArguments;
            } else {
                console.warn("No function arguments found in tool call");
                return [];
            }
        } else {
            // If no tool calls, try to extract notes from the response content
            console.warn("No tool calls found. Attempting to extract notes from response content.");
            return response.content || [];
        }
    } catch (error) {
        console.error("Error generating notes:", error);

        // If it's a parsing error, log the original response
        if (error instanceof SyntaxError) {
            console.error("Original response:", Response);
        }

        throw error;
    }
}

async function main({
    paperUrl,
    name,
    pagesToDelete,
}: {
    paperUrl: string;
    name: string;
    pagesToDelete?: number[];
}) {
    if (!paperUrl.endsWith('pdf')) {
        throw new Error('Not a PDF');
    }

    let pdfAsBuffer = await loadPdfFromUrl(paperUrl);
    if (pagesToDelete && pagesToDelete.length > 0) {
        // Delete Pages
        pdfAsBuffer = await deletePages(pdfAsBuffer, pagesToDelete);
    }
    const documents = await convertPdfToDocument(pdfAsBuffer);
    console.log(documents);
    console.log('length: ', documents.length);

    // Generate notes from the documents
    const notes = await generateNotes(documents);
    console.log('Generated Notes:', notes);
}

main({ paperUrl: 'https://files.eric.ed.gov/fulltext/EJ1172284.pdf', name: 'test' })
    .catch(error => {
        console.error('Unhandled error in main:', error);
        process.exit(1);
    });