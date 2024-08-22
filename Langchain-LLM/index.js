// Instantiate the model
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import dotenv from 'dotenv';

dotenv.config();

// Initializing the LLM Model
const model = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0
});

// Hardcoding the system prompt and the human input
const messages = [
    new SystemMessage("Translate the following from English to Italian"),
    new HumanMessage("Hello!"),
];

// The response we get contains other metadata as well. So this will just parse out the string response.
const parser = new StringOutputParser();

// We can also "chain" the model to output parser. This means this output parser will get called with the output from the model. The pipe method is used to combine two elements together.
const chain = model.pipe(parser);
await chain.invoke(messages);

// Generating the value
const result = await model.invoke(messages);
const generate = await parser.invoke(result);
console.log(generate);

// Setting the Prompt
const systemTemplate = "Translate the following into {language}:";

// Setting the PromptTemplate
const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", systemTemplate],
    ["user", "{text}"],
]);

const result1 = await promptTemplate.invoke({ language: "italian", text: "hi" });
console.log(result1);
// Accessing message directly
console.log(result1.toChatMessages());
;



