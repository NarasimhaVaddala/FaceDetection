import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector, FaceDetectionOptions } from 'react-native-vision-camera-face-detector';
import { useSharedValue } from 'react-native-reanimated';
import { Canvas, Rect, Paint, Skia } from '@shopify/react-native-skia';

export default function App() {
  const device = useCameraDevice('front');
  const [hasPermission, setHasPermission] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);

  // Initialize face detector
  const facedetector = useFaceDetector();

  // Shared value to store faces data
  const facesShared = useSharedValue([]);

  // Handle permissions
  useEffect(() => {
    const getPermissions = async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission);
    };
    getPermissions();
  }, []);

  const faceDetectionOptions: FaceDetectionOptions = {
    autoScale: true,
    classificationMode: 'all',
    contourMode: 'all',
    landmarkMode: 'all',
    minFaceSize: 0.2,
    performanceMode: 'accurate',
    trackingEnabled: true,
    windowHeight: 1280,
    windowWidth: 720,
  };

  // Frame processor
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      const throttleRate = 10;
      if (frame.timestamp % throttleRate === 0) {
        const detectedFaces = facedetector.detectFaces(frame);

        if (detectedFaces.length > 0) {
          const plainFaces = detectedFaces.map((face) => ({
            bounds: face.bounds,
            pitchAngle: face.pitchAngle,
            rollAngle: face.rollAngle,
            yawAngle: face.yawAngle,
          }));

          // Update shared value
          facesShared.value = plainFaces;

          console.log(plainFaces);
          
        }
      }
    } catch (error) {
      console.error(error, 'error');
    }
  }, [faceDetectionOptions]);

  // Use useEffect to debug detected faces
  useEffect(() => {
    console.log('Detected Faces:', detectedFaces);
  }, [detectedFaces]);

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'white' }}>Camera permission denied. Please enable it in settings.</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text>No Camera Device Found</Text>
      </View>
    );
  }

  // Render Skia lines on the camera preview
  const renderSkia = facesShared.value.map((face, index) => {
    const { x, y, width, height } = face.bounds;

    // Create a rect for the bounding box (around the face)
    const rect = Skia.XYWHRect(x, y, width, height);

    // Correctly initialize the Paint object
    const paint = new Paint();
    paint.setStyle('stroke');  // Stroke style for bounding box
    paint.setStrokeWidth(3);   // Line width
    paint.setColor(Skia.Color('red')); // Color of the bounding box

    return <Rect key={index} rect={rect} paint={paint} />;
  });

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      <Canvas style={StyleSheet.absoluteFillObject}>
        {renderSkia}
      </Canvas>
      <View style={styles.overlay}>
        <Text style={styles.text}>Detected Faces: {facesShared.value.length}</Text>
        {facesShared.value.map((face, index) => (
          <Text key={index} style={styles.text}>
            Face {index + 1}: Bounds({JSON.stringify(face.bounds)})
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  text: {
    color: 'white',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
});
