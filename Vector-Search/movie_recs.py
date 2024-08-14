import pymongo
from dotenv import load_dotenv
import os  # provides ways to access the Operating System and allows us to read the environment variables
import requests


load_dotenv()  # take environment variables from .env.

MONGO_URL = os.getenv("MongoDB")
API_TOKEN = os.getenv("HF_TOKEN")
embedding_URL = (
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
)
# DB Connection
client = pymongo.MongoClient(MONGO_URL)
# Access the collection
db = client.sample_mflix
# Access the object
collection = db.movies

items = collection.find().limit(5)
# Print the values
# for item in items:
#     print(item)


# Now we setup the Embedding Creation Function, we use the HuggingFace Indeference API.
def generate_embedding(text: str) -> list[float]:

    response = requests.post(
        embedding_URL,
        headers={"Authorization": f"Bearer {API_TOKEN}"},
        json={"inputs": text},
    )

    if response.status_code != 200:
        raise ValueError(
            f"Request Failed with status code {response.status_code}: {response.text}"
        )
    return response.json()


print(generate_embedding("Coding Adda is Awesome"))

# Create and store embeddings based on database
