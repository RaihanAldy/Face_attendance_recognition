"""
Test Elice API Connection
"""
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 50)
print("Testing Elice API Connection")
print("=" * 50)

# Check credentials
base_url = os.getenv("OPENAI_BASE_URL")
api_key = os.getenv("OPENAI_API_KEY")

print(f"\n📍 Base URL: {base_url}")
print(f"🔑 API Key: {api_key[:20] if api_key else 'Not found'}...")

if not base_url or not api_key:
    print("\n❌ Missing credentials in .env file!")
    print("Please check OPENAI_BASE_URL and OPENAI_API_KEY")
    exit(1)

try:
    # Initialize client
    print("\n🔄 Initializing OpenAI client...")
    client = OpenAI(
        base_url=base_url,
        api_key=api_key
    )
    
    # Test simple request
    print("🔄 Sending test request...")
    model = os.getenv("OPENAI_MODEL", "openai/gpt-5")
    print(f"📦 Using model: {model}")
    
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": "Say hello in exactly 5 words"}
        ],
        max_completion_tokens=50
    )
    
    # Print result
    result = response.choices[0].message.content
    print(f"\n✅ SUCCESS! API is working!")
    print(f"📝 Response: {result}")
    print("\n✨ Elice API connection successful!")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\nPossible issues:")
    print("1. Check if API key is correct")
    print("2. Verify base URL format")
    print("3. Ensure internet connection")
    print("4. Check Elice API status")

print("=" * 50)
