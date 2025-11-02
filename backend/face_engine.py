import insightface
import cv2
import numpy as np
from datetime import datetime
import base64
from PIL import Image
import io
import traceback

class FaceEngine:
    def __init__(self):
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load InsightFace model"""
        try:
            print("🚀 Loading InsightFace model (buffalo_l)...")
            self.model = insightface.app.FaceAnalysis(
                name='buffalo_l',
                providers=['CPUExecutionProvider']
            )
            self.model.prepare(ctx_id=0, det_size=(640, 640))
            print("✅ Face recognition model loaded successfully")
            print("📊 Model: buffalo_l (InsightFace)")
            print("📐 Embedding size: 512 dimensions")
        except Exception as e:
            print(f"❌ Error loading face model: {e}")
            traceback.print_exc()
            self.model = None
    
    def decode_image(self, image_data):
        """
        Decode image dari berbagai format
        
        Args:
            image_data: base64 string, numpy array, atau PIL Image
            
        Returns:
            numpy array (BGR format untuk OpenCV)
        """
        try:
            if isinstance(image_data, str):
                # Base64 string
                if 'base64,' in image_data:
                    image_data = image_data.split('base64,')[1]
                
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
                image_np = np.array(image)
                
            elif isinstance(image_data, np.ndarray):
                image_np = image_data
                
            elif isinstance(image_data, Image.Image):
                image_np = np.array(image_data)
                
            else:
                raise ValueError(f"Unsupported image type: {type(image_data)}")
            
            # Convert RGB to BGR untuk OpenCV/InsightFace
            if len(image_np.shape) == 3 and image_np.shape[2] == 3:
                # Check if already BGR or RGB
                if image_np.max() > 1.0:  # Assume 0-255 range
                    image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            elif len(image_np.shape) == 3 and image_np.shape[2] == 4:
                # RGBA to BGR
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2BGR)
            
            return image_np
            
        except Exception as e:
            print(f"❌ Error decoding image: {e}")
            traceback.print_exc()
            raise
    
    def extract_face_embedding(self, image_data):
        """
        Extract face embedding dari single image (UNTUK FRONTEND)
        
        Args:
            image_data: Base64 string, numpy array, atau PIL Image
            
        Returns:
            dict: {
                'success': True,
                'embedding': [512 dimensions],
                'confidence': float (0-1),
                'face_detected': True,
                'bbox': [x1, y1, x2, y2]
            }
        """
        if self.model is None:
            return {
                'success': False,
                'error': 'Face model not loaded',
                'face_detected': False
            }
        
        try:
            # Decode image
            image_np = self.decode_image(image_data)
            
            print(f"📸 Processing image shape: {image_np.shape}")
            
            # Detect faces menggunakan InsightFace
            faces = self.model.get(image_np)
            
            if len(faces) == 0:
                print("⚠️ No face detected in image")
                return {
                    'success': False,
                    'error': 'No face detected in image',
                    'face_detected': False
                }
            
            # Ambil face terbesar (atau terdekat ke center)
            # Sort by bbox area
            faces = sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)
            face = faces[0]
            
            if face.embedding is None:
                return {
                    'success': False,
                    'error': 'Failed to extract face embedding',
                    'face_detected': True
                }
            
            # Get embedding dan normalize
            embedding = face.embedding.tolist()
            confidence = float(face.det_score)  # Detection confidence
            bbox = face.bbox.tolist()
            
            print(f"✅ Face embedding extracted successfully")
            print(f"   Embedding length: {len(embedding)}")
            print(f"   Detection confidence: {confidence:.3f}")
            print(f"   Bbox: {bbox}")
            
            return {
                'success': True,
                'embedding': embedding,
                'confidence': confidence,
                'face_detected': True,
                'bbox': bbox
            }
            
        except Exception as e:
            print(f"❌ Error extracting face embedding: {e}")
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'face_detected': False
            }
    
    def extract_multiple_embeddings(self, image_data_list):
        """
        Extract embeddings dari multiple images (UNTUK REGISTRATION)
        
        Args:
            image_data_list: List of image data (base64, numpy, or PIL)
            
        Returns:
            dict: {
                'success': True,
                'embeddings': [[512], [512], ...],
                'count': int,
                'avg_confidence': float
            }
        """
        try:
            embeddings = []
            confidences = []
            
            for idx, image_data in enumerate(image_data_list):
                print(f"🔄 Processing image {idx + 1}/{len(image_data_list)}...")
                
                result = self.extract_face_embedding(image_data)
                
                if result.get('success'):
                    embeddings.append(result['embedding'])
                    confidences.append(result['confidence'])
                else:
                    print(f"⚠️ Failed to extract embedding from image {idx + 1}: {result.get('error')}")
            
            if len(embeddings) == 0:
                return {
                    'success': False,
                    'error': 'No valid face embeddings extracted from any image'
                }
            
            avg_confidence = sum(confidences) / len(confidences)
            
            print(f"✅ Extracted {len(embeddings)} embeddings")
            print(f"   Average confidence: {avg_confidence:.3f}")
            
            return {
                'success': True,
                'embeddings': embeddings,
                'count': len(embeddings),
                'avg_confidence': float(avg_confidence)
            }
            
        except Exception as e:
            print(f"❌ Error extracting multiple embeddings: {e}")
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_similarity(self, embedding1, embedding2):
        """
        Calculate cosine similarity between two embeddings
        InsightFace embeddings sudah normalized, jadi bisa langsung dot product
        
        Args:
            embedding1: List or numpy array [512]
            embedding2: List or numpy array [512]
            
        Returns:
            float: Similarity score (0-1), higher is more similar
        """
        try:
            # Convert to numpy arrays
            emb1 = np.array(embedding1)
            emb2 = np.array(embedding2)
            
            # Normalize embeddings (InsightFace biasanya sudah normalized, tapi untuk safety)
            emb1_norm = emb1 / (np.linalg.norm(emb1) + 1e-10)
            emb2_norm = emb2 / (np.linalg.norm(emb2) + 1e-10)
            
            # Cosine similarity (dot product karena sudah normalized)
            similarity = np.dot(emb1_norm, emb2_norm)
            
            # Clip to 0-1 range (cosine similarity bisa -1 to 1)
            # Untuk face recognition, negative similarity tidak masuk akal
            similarity = np.clip(similarity, 0.0, 1.0)
            
            return float(similarity)
            
        except Exception as e:
            print(f"❌ Error calculating similarity: {e}")
            traceback.print_exc()
            return 0.0
    
    def verify_face(self, image1, image2, threshold=0.6):
        """
        Verify if two images contain the same person
        
        Args:
            image1: First image data
            image2: Second image data
            threshold: Similarity threshold (default 0.6 for InsightFace)
            
        Returns:
            dict: {
                'verified': bool,
                'similarity': float,
                'confidence': float
            }
        """
        try:
            result1 = self.extract_face_embedding(image1)
            result2 = self.extract_face_embedding(image2)
            
            if not result1.get('success') or not result2.get('success'):
                return {
                    'verified': False,
                    'error': 'Failed to extract embeddings from one or both images'
                }
            
            similarity = self.calculate_similarity(
                result1['embedding'],
                result2['embedding']
            )
            
            return {
                'verified': similarity >= threshold,
                'similarity': similarity,
                'confidence': min(result1['confidence'], result2['confidence']),
                'threshold': threshold
            }
            
        except Exception as e:
            print(f"❌ Error verifying face: {e}")
            return {
                'verified': False,
                'error': str(e)
            }
    
    def process_image(self, image_data):
        """
        Process image dan return semua detected faces (LEGACY SUPPORT)
        Ini untuk backward compatibility dengan code lama Anda
        
        Returns:
            dict: {
                'success': True,
                'faces_detected': int,
                'results': [
                    {
                        'bbox': [x1, y1, x2, y2],
                        'confidence': float,
                        'embedding': [512]
                    }
                ]
            }
        """
        if self.model is None:
            return {'success': False, 'error': 'Face model not loaded'}
        
        try:
            image_np = self.decode_image(image_data)
            
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
            print(f"❌ Error processing image: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def get_model_info(self):
        """Get information about loaded model"""
        return {
            'loaded': self.model is not None,
            'model_name': 'buffalo_l',
            'framework': 'InsightFace',
            'embedding_size': 512,
            'provider': 'CPUExecutionProvider'
        }

# Global instance
face_engine = FaceEngine()