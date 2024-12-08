import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector, FaceDetectionOptions } from 'react-native-vision-camera-face-detector';
import { useSharedValue, useAnimatedReaction, withSpring } from 'react-native-reanimated';

export default function App() {
  const device = useCameraDevice('front');
  const [hasPermission, setHasPermission] = useState(false);

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
        const plainFaces = detectedFaces.map((face) => ({
          bounds: face.bounds,
          pitchAngle: face.pitchAngle,
          rollAngle: face.rollAngle,
          yawAngle: face.yawAngle,
        }));

        // Update shared value
        facesShared.value = plainFaces;

        console.log(facesShared.value, "facesshared.value");
        
      }
    } catch (error) {
      console.error(error , "error");
    }
  }, [faceDetectionOptions]);

  // Use `useAnimatedReaction` to react to the shared value updates on JS thread
  useAnimatedReaction(
    () => facesShared.value,
    (faces) => {
      // Handle faces updates on the JS thread here
      console.log(faces, "faces"); // You can process the faces here
    },
    [facesShared]
  );

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

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
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
