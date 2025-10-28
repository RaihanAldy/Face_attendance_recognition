import insightface
import cv2
import numpy as np
from datetime import datetime
import base64
from PIL import Image
import io

class FaceEngine:
    def __init__(self):
        self.model = None
        self.load_model()
    
    def load_model(self):
        try:
            self.model = insightface.app.FaceAnalysis(
                name='buffalo_l',
                providers=['CPUExecutionProvider']
            )
            self.model.prepare(ctx_id=0, det_size=(640, 640))
            print("✅ Face recognition model loaded successfully")
        except Exception as e:
            print(f"❌ Error loading face model: {e}")
            self.model = None
    
    def process_image(self, image_data):
        if self.model is None:
            return {'success': False, 'error': 'Face model not loaded'}
        
        try:
            # Decode base64 image
            if 'base64,' in image_data:
                image_data = image_data.split('base64,')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(image)
            
            # Convert RGB to BGR untuk OpenCV
            if len(image_np.shape) == 3 and image_np.shape[2] == 3:
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            
            # Process dengan InsightFace
            faces = self.model.get(image_np)
            
            if len(faces) == 0:
                return {'success': True, 'faces_detected': 0, 'results': []}
            
            results = []
            for face in faces:
                if face.embedding is not None:
                    results.append({
                        'bbox': face.bbox.tolist(),
                        'confidence': float(face.det_score),
                        'embedding': face.embedding.tolist()
                    })
            
            return {
                'success': True,
                'faces_detected': len(faces),
                'results': results
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

# Global instance
face_engine = FaceEngine()