import pymongo
from dotenv import load_dotenv
import os
import requests

load_dotenv()

MONGO_URL = os.getenv("MongoDB")
API_TOKEN = os.getenv("HF_TOKEN")
embedding_URL = (
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
)

# DB Connection
client = pymongo.MongoClient(MONGO_URL)
db = client.sample_mflix
collection = db.movies

items = collection.find().limit(5)


# Now we setup the Embedding Creation Function, we use the HuggingFace Indeference API.
# Function to generate embeddings using Hugging Face API
def generate_embedding(text: str) -> list[float]:
    input_data = {
        "inputs": {
            "source_sentence": text,  # The main sentence you want to encode
            "sentences": [
                text
            ],  # A list containing the same sentence, to fit the expected format
        }
    }

    response = requests.post(
        embedding_URL,
        headers={"Authorization": f"Bearer {API_TOKEN}"},
        json=input_data,
    )

    if response.status_code != 200:
        raise ValueError(
            f"Request failed with status code {response.status_code}: {response.text}"
        )

    # Print the response to understand its structure
    print("API Response:", response.json())

    # Try to extract the embedding from the response
    embedding = response.json()

    # Adjust the parsing based on the actual response structure
    if isinstance(embedding, list) and len(embedding) > 0:
        vector = embedding[
            0
        ]  # This assumes the embedding is the first element in a list
        if isinstance(vector, list) and len(vector) == 384:
            return vector
        else:
            raise ValueError("The embedding returned is not a 384-dimensional vector.")
    else:
        raise ValueError("Unexpected response structure from the API.")


# Define input correctly for the API
# input_data = {
#     "source_sentence": "Coding Adda is Awesome",
#     "sentences": [
#         "That is a happy dog",
#         "That is a very happy person",
#         "Today is a sunny day",
#     ],
# }

# output = generate_embedding(input_data)
# print(output)

# Create and store embeddings based on database
# Generate embeddings for 50 documents and store them in the database
# for doc in collection.find({"plot": {"$exists": True}}).limit(50):
#     try:
#         plot_text = doc["plot"]
#         if not isinstance(plot_text, str) or not plot_text.strip():
#             print(f"Skipping document with ID {doc['_id']} due to invalid plot data.")
#             continue

#         # Generate the embedding
#         embedding = generate_embedding(
#             {"source_sentence": plot_text, "sentences": [plot_text]}
#         )

#         # Add the embedding to the document
#         doc["plot_embedding_hf"] = embedding

#         # Update the document in the database
#         collection.replace_one({"_id": doc["_id"]}, doc)
#         print(f"Updated document with ID {doc['_id']}")

#     except Exception as e:
#         print(f"Error processing document with ID {doc['_id']}: {str(e)}")


# Implementing a Vector Search with Hugging Face Pipeline
# Create the query and perform vector search

# Example query for vector search
query = "imaginary characters from outer space at war"
query_vector = generate_embedding(query)

# Perform vector search in MongoDB
results = collection.aggregate(
    [
        {
            "$vectorSearch": {
                "queryVector": query_vector,
                "path": "plot_embedding_hf",
                "numCandidates": 100,
                "limit": 4,
                "index": "PlotSemanticSearch",
            }
        }
    ]
)

# Iterate over the results and print them
for document in results:
    print(f"Movie Name: {document['title']},\nMovie Plot: {document['plot']}\n")
