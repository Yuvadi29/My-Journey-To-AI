import axios from "axios";
import { Document } from "langchain/document";
import { PDFDocument } from "pdf-lib";
import { writeFile, unlink } from "fs/promises";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";
import dotenv from 'dotenv';

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
        apiKey: `Bearer ${process.env.UNSTRUCTURED_API_KEY}`,
        // apiKey: process.env.ANTHROPIC_API_KEY,
        strategy: 'hi_res',
    });
    const documents = await loader.load();
    await unlink(`pdfs/${randomName}.pdf`);
    return documents;
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
        await deletePages(pdfAsBuffer, pagesToDelete);
    }
    const documents = await convertPdfToDocument(pdfAsBuffer);
    console.log(documents);
    console.log('length: ', documents.length);
}

main({ paperUrl: 'https://files.eric.ed.gov/fulltext/EJ1172284.pdf', name: 'test' });