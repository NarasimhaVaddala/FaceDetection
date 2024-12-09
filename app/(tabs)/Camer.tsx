import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import { Canvas, Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import { useSharedValue, Worklets } from "react-native-worklets-core";

export default function App() {
  const device = useCameraDevice("front");
  const [hasPermission, setHasPermission] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);

  // Initialize face detector
  const facedetector = useFaceDetector();

  // Shared value to store faces data (from worklets package)
  const facesShared = useSharedValue([]);

  // Handle permissions
  useEffect(() => {
    const getPermissions = async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === "granted");
    };
    getPermissions();
  }, []);

  // createRunOnJS to trigger React state updates from worklets
  const runOnJSUpdateFaces = Worklets.createRunOnJS((faces) => {
    setDetectedFaces(faces);
  });

  // Frame processor to process camera frames and detect faces
  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";

    try {
      const detectedFaces = facedetector.detectFaces(frame);

      if (detectedFaces.length) {
        const plainFaces = detectedFaces.map((face) => {
          return {
            bounds: face.bounds,
            pitchAngle: face.pitchAngle,
            rollAngle: face.rollAngle,
            yawAngle: face.yawAngle,
            smile: face.smilingProbability || 0,
            leye: face.leftEyeOpenProbability || 0,
            reye: face.rightEyeOpenProbability || 0,
            landmarks: face.landmarks || [], // Fetch landmarks if available
          };
        });

        facesShared.value = plainFaces;

        // Trigger React state update using runOnJS
        runOnJSUpdateFaces(plainFaces);
      }
    } catch (error) {
      console.error("Error in frame processor:", error);
    }
  }, []);

  useEffect(() => {
    // Optionally log detected faces
    // console.log(detectedFaces , "in useeffect");
  }, [detectedFaces]);

  // Function to calculate the approximate positions of facial landmarks
  const drawEstimatedLandmarks = (x, y, width, height) => {
    const eyeRadius = 8;
    const noseRadius = 6;
    const mouthRadius = 10;

    // Estimation of key points inside the bounding box:
    // Eyes
    const leftEyeX = x + width * 0.13;
    const leftEyeY = y + height * 0.55;
    const rightEyeX = x + width * 0.5;
    const rightEyeY = y + height * 0.55;

    // Nose (centered horizontally, slightly below the eyes)
    const noseX = x + width * 0.33;
    const noseY = y + height * 0.72;

    // Mouth (centered horizontally, slightly below the nose)
    const mouthX = x + width * 0.33;
    const mouthY = y + height * 0.9;

    return (
      <>
        {/* Draw eyes */}
        <Circle cx={leftEyeX} cy={leftEyeY} r={eyeRadius} color="yellow" />
        <Circle cx={rightEyeX} cy={rightEyeY} r={eyeRadius} color="yellow" />

        {/* Draw nose */}
        <Circle cx={noseX} cy={noseY} r={noseRadius} color="green" />

        {/* Draw mouth */}
        <Circle cx={mouthX} cy={mouthY} r={mouthRadius} color="blue" />
      </>
    );
  };

  const renderSkia = detectedFaces.map((face, index) => {
    const { x, y, width, height } = face?.bounds || {};

    if (!x || !y || !width || !height) return null;

    // Draw a bounding box around the face
    const padding = 0.1; // Optional padding for face box
    const adjustedWidth = width * (1.2 + padding);
    const adjustedHeight = height * (1.2 + padding);

    const adjustedX = x - (adjustedWidth - width) / 2;
    const adjustedY = y - (adjustedHeight - height) / 2;

    return (
      <Group key={index}>
        {/* Draw facial landmarks */}
        {drawEstimatedLandmarks(
          adjustedX,
          adjustedY,
          adjustedWidth,
          adjustedHeight
        )}
      </Group>
    );
  });

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "white" }}>
          Camera permission denied. Please enable it in settings.
        </Text>
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
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />

      {detectedFaces.length > 0 && (
        <Canvas style={StyleSheet.absoluteFillObject}>
          {/* Render bounding box and estimated facial landmarks */}
          {renderSkia}
        </Canvas>
      )}

      <View style={styles.overlay}>
        <Text style={styles.text}>Detected Faces: {detectedFaces.length}</Text>
        {detectedFaces.map((face, index) => (
          <View key={index} style={styles.faceInfo}>
            <Text style={styles.text}>Face {index + 1}:</Text>
            <Text style={styles.text}>
              Smiling: {(face.smile * 100).toFixed(2)}%
            </Text>
            <Text style={styles.text}>
              Left Eye Open: {(face.leye * 100).toFixed(2)}%
            </Text>
            <Text style={styles.text}>
              Right Eye Open: {(face.reye * 100).toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  overlay: {
    position: "absolute",
    top: 50,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  text: {
    color: "white",
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  faceInfo: {
    marginTop: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 5,
    borderRadius: 5,
  },
});
