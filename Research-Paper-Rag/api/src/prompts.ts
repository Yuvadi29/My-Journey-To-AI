export const NOTES_TOOL_SCHEMA = {
    type: "function", // Changed from "custom"
    function: {
        name: "formatNotes",
        description: "Format the notes response.",
        parameters: {
            type: "object",
            properties: {
                notes: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            note: {
                                type: "string",
                                description: "The content of the note."
                            },
                            pageNumbers: {
                                type: "array",
                                items: {
                                    type: "number",
                                    description: "The page number(s) where the note appears."
                                }
                            }
                        },
                        required: ["note", "pageNumbers"]
                    }
                }
            },
            required: ["notes"]
        }
    }
};