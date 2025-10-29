import boto3
import os
import json
from dotenv import load_dotenv

load_dotenv()  # pastikan variabel dari .env terbaca

# Inisialisasi client AWS Lambda
lambda_client = boto3.client(
    'lambda',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

def trigger_alert(event_type: str, employee_name: str, timestamp: str):
    """
    Memanggil AWS Lambda untuk mengirim notifikasi alert.
    """
    payload = {
        "event_type": event_type,
        "employee_name": employee_name,
        "timestamp": timestamp
    }

    try:
        response = lambda_client.invoke(
            FunctionName=os.getenv("LAMBDA_FUNCTION_NAME"),
            InvocationType='Event',  # asynchronous
            Payload=json.dumps(payload)
        )
        print(f"✅ Alert triggered: {payload}")
        return {"status": "success", "details": response['ResponseMetadata']}
    except Exception as e:
        print(f"❌ Failed to trigger Lambda: {e}")
        return {"status": "error", "message": str(e)}
